import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";
import { productCreateSchema } from "@/server/validation/product";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface CreateProductResponse {
  success: boolean;
  productId?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateProductResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<CreateProductResponse>;
    }

    // Check authorization
    const hasPermission = await isAdmin();
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = productCreateSchema.safeParse(body);
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

    // Check for duplicate SKU
    const { data: existing, error: checkError } = await client
      .from("products")
      .select("id")
      .eq("sku", data.sku)
      .single();

    if (!checkError && existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Product with this SKU already exists",
        },
        { status: 409 }
      );
    }

    // Check for duplicate slug
    const { data: slugExists, error: slugError } = await client
      .from("products")
      .select("id")
      .eq("slug", data.slug)
      .single();

    if (!slugError && slugExists) {
      return NextResponse.json(
        {
          success: false,
          error: "Product with this slug already exists",
        },
        { status: 409 }
      );
    }

    // Validate sale price <= price
    if (
      data.sale_price &&
      data.price &&
      data.sale_price >= data.price
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Sale price must be less than regular price",
        },
        { status: 400 }
      );
    }

    // Create product
    const { data: newProduct, error: insertError } = await client
      .from("products")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        sku: data.sku,
        material: data.material || null,
        size_description: data.size_description || null,
        care_instructions: data.care_instructions || null,
        price: data.price,
        sale_price: data.sale_price || null,
        stock: data.stock || 0,
        category_id: data.category_id || null,
        weight_grams: data.weight_grams || null,
        badge: data.badge || null,
        is_featured: data.is_featured || false,
        is_new_arrival: data.is_new_arrival || false,
        is_best_seller: data.is_best_seller || false,
        status: data.status || "DRAFT",
      })
      .select("id")
      .single();

    if (insertError || !newProduct) {
      console.error("Product creation error:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create product",
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.product_created",
      entityType: "product",
      entityId: newProduct.id,
      metadata: {
        name: data.name,
        sku: data.sku,
        price: data.price,
      },
    });

    return NextResponse.json(
      {
        success: true,
        productId: newProduct.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create product endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
