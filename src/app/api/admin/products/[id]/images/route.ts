import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";
import { userHasRole } from "@/server/authorization/permissions";
import {
  validateImageFile,
  generateImagePath,
  isMaliciousSVG,
} from "@/server/services/image-upload";
import {
  getLocalProducts,
  updateLocalProduct,
} from "@/server/store/products-store";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface ImageUploadResponse {
  success: boolean;
  imageId?: string;
  path?: string;
  error?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ImageUploadResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<ImageUploadResponse>;
    }

    // Check authorization - ADMIN or OWNER
    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");
    const hasPermission = isAdmin || isOwner;

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id: productId } = await context.params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get file from multipart form data
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No image file provided" },
        { status: 400 }
      );
    }
    const file = image;

    // Check for malicious SVG
    const isMalicious = await isMaliciousSVG(file);
    if (isMalicious) {
      return NextResponse.json(
        { success: false, error: "SVG files are not allowed" },
        { status: 400 }
      );
    }

    // Validate image file
    const fileValidation = await validateImageFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { success: false, error: fileValidation.error },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      const product = getLocalProducts().find((item) => item.id === productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: "Product not found" },
          { status: 404 }
        );
      }

      const imageData = Buffer.from(await file.arrayBuffer()).toString("base64");
      const dataUrl = `data:${fileValidation.mimeType};base64,${imageData}`;
      updateLocalProduct(productId, { image: dataUrl });

      await logAuditEvent({
        action: "admin.product_image_uploaded",
        entityType: "product",
        entityId: productId,
        metadata: {
          storage: "local-development",
          file_size: file.size,
          file_type: fileValidation.mimeType,
        },
      });

      return NextResponse.json(
        {
          success: true,
          imageId: productId,
          path: dataUrl,
        },
        { status: 201 }
      );
    }

    const client = createSupabaseServiceClient();

    // Verify product exists
    const { data: product, error: productError } = await client
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Generate safe storage path
    const storagePath = generateImagePath(productId, file.name);

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await client.storage
        .from("product-images")
        .upload(storagePath, file, {
          contentType: fileValidation.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json(
          { success: false, error: "Failed to upload image" },
          { status: 500 }
        );
      }

      // Get the public URL for the image
      const {
        data: { publicUrl },
      } = client.storage.from("product-images").getPublicUrl(storagePath);

      const { data: existingImages, error: existingImagesError } = await client
        .from("product_images")
        .select("id, position, is_primary")
        .eq("product_id", productId)
        .order("position", { ascending: false });

      if (existingImagesError) {
        await client.storage.from("product-images").remove([storagePath]);
        return NextResponse.json(
          { success: false, error: "Failed to read existing product images" },
          { status: 500 }
        );
      }

      const nextPosition =
        existingImages && existingImages.length > 0
          ? Number(existingImages[0].position) + 1
          : 0;

      // Insert first, then switch the primary flag to avoid position conflicts.
      const { data: imageRecord, error: dbError } = await client
        .from("product_images")
        .insert({
          product_id: productId,
          storage_path: storagePath,
          alt_text: file.name.split(".")[0],
          position: nextPosition,
          is_primary: false,
        })
        .select("id")
        .single();

      if (dbError || !imageRecord) {
        console.error("Database insert error:", dbError);
        // Clean up uploaded file if DB insert fails
        await client.storage
          .from("product-images")
          .remove([storagePath]);

        return NextResponse.json(
          { success: false, error: "Failed to save image record" },
          { status: 500 }
        );
      }

      const previousPrimaryIds = (existingImages || [])
        .filter((existingImage) => existingImage.is_primary)
        .map((existingImage) => existingImage.id);

      if (previousPrimaryIds.length > 0) {
        const { error: unsetPrimaryError } = await client
          .from("product_images")
          .update({ is_primary: false })
          .in("id", previousPrimaryIds);

        if (unsetPrimaryError) {
          await client.from("product_images").delete().eq("id", imageRecord.id);
          await client.storage.from("product-images").remove([storagePath]);
          return NextResponse.json(
            { success: false, error: "Failed to replace primary image" },
            { status: 500 }
          );
        }
      }

      const { error: setPrimaryError } = await client
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", imageRecord.id);

      if (setPrimaryError) {
        if (previousPrimaryIds.length > 0) {
          await client
            .from("product_images")
            .update({ is_primary: true })
            .in("id", previousPrimaryIds);
        }
        await client.from("product_images").delete().eq("id", imageRecord.id);
        await client.storage.from("product-images").remove([storagePath]);
        return NextResponse.json(
          { success: false, error: "Failed to set primary image" },
          { status: 500 }
        );
      }

      // Log audit event
      await logAuditEvent({
        action: "admin.product_image_uploaded",
        entityType: "product_image",
        entityId: imageRecord.id,
        metadata: {
          product_id: productId,
          storage_path: storagePath,
          file_size: file.size,
          file_type: fileValidation.mimeType,
        },
      });

      return NextResponse.json(
        {
          success: true,
          imageId: imageRecord.id,
          path: publicUrl,
        },
        { status: 201 }
      );
    } catch (storageError) {
      console.error("Storage operation error:", storageError);
      return NextResponse.json(
        { success: false, error: "Failed to process image upload" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Image upload endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
