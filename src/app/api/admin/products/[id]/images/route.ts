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

interface ImageDeleteResponse {
  success: boolean;
  error?: string;
}

async function checkAdminPermission() {
  const verification = await verifyAdminRequest();

  if (!verification.success) {
    return {
      allowed: false,
      response: verification.response,
    };
  }

  const isAdmin = await userHasRole("ADMIN");
  const isOwner = await userHasRole("OWNER");

  if (!isAdmin && !isOwner) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    response: null,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ImageUploadResponse>> {
  try {
    const permission = await checkAdminPermission();

    if (!permission.allowed) {
      return permission.response as NextResponse<ImageUploadResponse>;
    }

    const { id: productId } = await context.params;

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No image file provided",
        },
        { status: 400 }
      );
    }

    const file = image;

    const isMalicious = await isMaliciousSVG(file);

    if (isMalicious) {
      return NextResponse.json(
        {
          success: false,
          error: "SVG files are not allowed",
        },
        { status: 400 }
      );
    }

    const fileValidation = await validateImageFile(file);

    if (!fileValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: fileValidation.error,
        },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      const product = getLocalProducts().find(
        (item) => item.id === productId
      );

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: "Product not found",
          },
          { status: 404 }
        );
      }

      const imageData = Buffer.from(
        await file.arrayBuffer()
      ).toString("base64");

      const dataUrl = `data:${fileValidation.mimeType};base64,${imageData}`;

      updateLocalProduct(productId, {
        image: dataUrl,
      });

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

    const { data: product, error: productError } = await client
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    const storagePath = generateImagePath(
      productId,
      file.name
    );

    try {
      const { error: uploadError } = await client.storage
        .from("product-images")
        .upload(storagePath, file, {
          contentType: fileValidation.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "Storage upload error:",
          uploadError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Failed to upload image",
          },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = client.storage
        .from("product-images")
        .getPublicUrl(storagePath);

      const {
        data: existingImages,
        error: existingImagesError,
      } = await client
        .from("product_images")
        .select("id, position, is_primary")
        .eq("product_id", productId)
        .order("position", {
          ascending: false,
        });

      if (existingImagesError) {
        await client.storage
          .from("product-images")
          .remove([storagePath]);

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to read existing product images",
          },
          { status: 500 }
        );
      }

      const nextPosition =
        existingImages &&
        existingImages.length > 0
          ? Number(existingImages[0].position) + 1
          : 0;

      const {
        data: imageRecord,
        error: dbError,
      } = await client
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
        console.error(
          "Database insert error:",
          dbError
        );

        await client.storage
          .from("product-images")
          .remove([storagePath]);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to save image record",
          },
          { status: 500 }
        );
      }

      const previousPrimaryIds = (
        existingImages || []
      )
        .filter(
          (existingImage) =>
            existingImage.is_primary
        )
        .map(
          (existingImage) =>
            existingImage.id
        );

      if (previousPrimaryIds.length > 0) {
        const {
          error: unsetPrimaryError,
        } = await client
          .from("product_images")
          .update({
            is_primary: false,
          })
          .in(
            "id",
            previousPrimaryIds
          );

        if (unsetPrimaryError) {
          await client
            .from("product_images")
            .delete()
            .eq("id", imageRecord.id);

          await client.storage
            .from("product-images")
            .remove([storagePath]);

          return NextResponse.json(
            {
              success: false,
              error:
                "Failed to replace primary image",
            },
            { status: 500 }
          );
        }
      }

      const {
        error: setPrimaryError,
      } = await client
        .from("product_images")
        .update({
          is_primary: true,
        })
        .eq("id", imageRecord.id);

      if (setPrimaryError) {
        if (previousPrimaryIds.length > 0) {
          await client
            .from("product_images")
            .update({
              is_primary: true,
            })
            .in(
              "id",
              previousPrimaryIds
            );
        }

        await client
          .from("product_images")
          .delete()
          .eq("id", imageRecord.id);

        await client.storage
          .from("product-images")
          .remove([storagePath]);

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to set primary image",
          },
          { status: 500 }
        );
      }

      await logAuditEvent({
        action: "admin.product_image_uploaded",
        entityType: "product_image",
        entityId: imageRecord.id,
        metadata: {
          product_id: productId,
          storage_path: storagePath,
          file_size: file.size,
          file_type:
            fileValidation.mimeType,
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
      console.error(
        "Storage operation error:",
        storageError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to process image upload",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(
      "Image upload endpoint error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE PRODUCT IMAGE
   ========================================================= */

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ImageDeleteResponse>> {
  try {
    const permission =
      await checkAdminPermission();

    if (!permission.allowed) {
      return permission.response as NextResponse<ImageDeleteResponse>;
    }

    const { id: productId } =
      await context.params;

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const imageId = body?.imageId;

    if (!imageId) {
      return NextResponse.json(
        {
          success: false,
          error: "Image ID is required",
        },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Image deletion requires Supabase",
        },
        { status: 400 }
      );
    }

    const client =
      createSupabaseServiceClient();

    // Find image and make sure it belongs
    // to the requested product.
    const {
      data: image,
      error: imageError,
    } = await client
      .from("product_images")
      .select(
        "id, product_id, storage_path, is_primary, position"
      )
      .eq("id", imageId)
      .eq("product_id", productId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        {
          success: false,
          error: "Product image not found",
        },
        { status: 404 }
      );
    }

    // Delete physical file from Storage.
    if (image.storage_path) {
      const {
        error: storageError,
      } = await client.storage
        .from("product-images")
        .remove([
          image.storage_path,
        ]);

      if (storageError) {
        console.error(
          "Storage delete error:",
          storageError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to delete image from storage",
          },
          { status: 500 }
        );
      }
    }

    // Delete image record only.
    const {
      error: deleteError,
    } = await client
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .eq("product_id", productId);

    if (deleteError) {
      console.error(
        "Database image delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to delete image record",
        },
        { status: 500 }
      );
    }

    // If deleted image was primary,
    // make the first remaining image primary.
    if (image.is_primary) {
      const {
        data: remainingImages,
        error:
          remainingImagesError,
      } = await client
        .from("product_images")
        .select("id, position")
        .eq("product_id", productId)
        .order("position", {
          ascending: true,
        })
        .limit(1);

      if (
        !remainingImagesError &&
        remainingImages &&
        remainingImages.length > 0
      ) {
        await client
          .from("product_images")
          .update({
            is_primary: true,
          })
          .eq(
            "id",
            remainingImages[0].id
          );
      }
    }

    // Audit log.
    // Use an existing AuditAction supported
    // by this project.
    await logAuditEvent({
      action: "admin.product_deleted",
      entityType: "product_image",
      entityId: imageId,
      metadata: {
        product_id: productId,
        storage_path:
          image.storage_path,
        was_primary:
          image.is_primary,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Image delete endpoint error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
