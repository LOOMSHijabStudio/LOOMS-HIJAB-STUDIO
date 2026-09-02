import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { categorySchema } from "@/server/validation/product";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface CategoryListResponse {
  success: boolean;
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_path: string | null;
    position: number;
    product_count?: number;
  }>;
  error?: string;
}

export async function GET(
  _request: NextRequest
): Promise<NextResponse<CategoryListResponse>> {
  void _request;

  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<CategoryListResponse>;
    }

    // Any authenticated admin can view categories
    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const client = createSupabaseServiceClient();

    const { data: categories, error } = await client
      .from("categories")
      .select(
        `
        id,
        name,
        slug,
        description,
        image_path,
        position,
        products(count)
      `
      )
      .order("position", { ascending: true });

    if (error) {
      console.error("Categories list error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: (categories || []).map((cat) => ({
        id: String(cat.id),
        name: String(cat.name),
        slug: String(cat.slug),
        description: cat.description as string | null,
        image_path: cat.image_path as string | null,
        position: Number(cat.position),
        product_count: Array.isArray(cat.products) ? cat.products.length : 0,
      })),
    });
  } catch (error) {
    console.error("Categories endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface CreateCategoryResponse {
  success: boolean;
  categoryId?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateCategoryResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<CreateCategoryResponse>;
    }

    // Only ADMIN or OWNER can create categories
    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = categorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid category data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const client = createSupabaseServiceClient();

    // Check for duplicate slug
    const { data: existing } = await client
      .from("categories")
      .select("id")
      .eq("slug", data.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Category with this slug already exists",
        },
        { status: 409 }
      );
    }

    // Get max position
    const { data: maxPosition } = await client
      .from("categories")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = (maxPosition?.position || 0) + 1;

    // Create category
    const { data: newCategory, error: insertError } = await client
      .from("categories")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image_path: data.image_path || null,
        position,
      })
      .select("id")
      .single();

    if (insertError || !newCategory) {
      console.error("Category creation error:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create category",
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.category_created",
      entityType: "category",
      entityId: newCategory.id,
      metadata: {
        name: data.name,
        slug: data.slug,
      },
    });

    return NextResponse.json(
      {
        success: true,
        categoryId: newCategory.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
