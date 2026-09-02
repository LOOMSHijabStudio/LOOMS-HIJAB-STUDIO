import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";
import { productUpdateSchema } from "@/server/validation/product";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface UpdateProductResponse {
  success: boolean;
  error?: string;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateProductResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<UpdateProductResponse>;
    }

    const hasPermission = await isAdmin();
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

    const body = await request.json();

    // Validate input
    const validation = productUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid product data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const client = createSupabaseServiceClient();

    // Get current product for comparison
    const { data: currentProduct, error: fetchError } = await client
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (fetchError || !currentProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Check for duplicate SKU (if changing)
    if (data.sku && data.sku !== currentProduct.sku) {
      const { data: existing } = await client
        .from("products")
        .select("id")
        .eq("sku", data.sku)
        .neq("id", productId)
        .single();

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Product with this SKU already exists",
          },
          { status: 409 }
        );
      }
    }

    // Check for duplicate slug (if changing)
    if (data.slug && data.slug !== currentProduct.slug) {
      const { data: existing } = await client
        .from("products")
        .select("id")
        .eq("slug", data.slug)
        .neq("id", productId)
        .single();

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Product with this slug already exists",
          },
          { status: 409 }
        );
      }
    }

    // Validate sale price if provided
    if (data.price || data.sale_price) {
      const regularPrice = data.price ?? currentProduct.price;
      const salePrice = data.sale_price ?? currentProduct.sale_price;

      if (salePrice && salePrice >= regularPrice) {
        return NextResponse.json(
          {
            success: false,
            error: "Sale price must be less than regular price",
          },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.size_description !== undefined) updateData.size_description = data.size_description;
    if (data.care_instructions !== undefined) updateData.care_instructions = data.care_instructions;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.sale_price !== undefined) updateData.sale_price = data.sale_price;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.weight_grams !== undefined) updateData.weight_grams = data.weight_grams;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.is_featured !== undefined) updateData.is_featured = data.is_featured;
    if (data.is_new_arrival !== undefined) updateData.is_new_arrival = data.is_new_arrival;
    if (data.is_best_seller !== undefined) updateData.is_best_seller = data.is_best_seller;
    if (data.status !== undefined) updateData.status = data.status;

    // Update product
    const { error: updateError } = await client
      .from("products")
      .update(updateData)
      .eq("id", productId);

    if (updateError) {
      console.error("Product update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update product",
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.product_updated",
      entityType: "product",
      entityId: productId,
      metadata: {
        changes: Object.keys(updateData)
          .filter(k => k !== "updated_at")
          .reduce(
            (acc, key) => {
              acc[key] = {
                old: (currentProduct as Record<string, unknown>)[key],
                new: updateData[key],
              };
              return acc;
            },
            {} as Record<string, unknown>
          ),
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Update product endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
