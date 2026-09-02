import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { categorySchema } from "@/server/validation/product";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface GetCategoryResponse {
  success: boolean;
  category?: Record<string, unknown>;
  error?: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<GetCategoryResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<GetCategoryResponse>;
    }

    const { id: categoryId } = await context.params;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    const { data: category, error } = await client
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (error || !category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface UpdateCategoryResponse {
  success: boolean;
  error?: string;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateCategoryResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<UpdateCategoryResponse>;
    }

    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id: categoryId } = await context.params;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input (partial)
    const validation = categorySchema.partial().safeParse(body);
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

    // Get current category
    const { data: currentCategory, error: fetchError } = await client
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (fetchError || !currentCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Check for duplicate slug if changing
    if (data.slug && data.slug !== currentCategory.slug) {
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
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image_path !== undefined) updateData.image_path = data.image_path;
    if (data.position !== undefined) updateData.position = data.position;

    // Update category
    const { error: updateError } = await client
      .from("categories")
      .update(updateData)
      .eq("id", categoryId);

    if (updateError) {
      console.error("Category update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update category",
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.category_updated",
      entityType: "category",
      entityId: categoryId,
      metadata: {
        changes: Object.keys(updateData).reduce(
          (acc, key) => {
            acc[key] = {
              old: (currentCategory as Record<string, unknown>)[key],
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
    console.error("Update category endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface DeleteCategoryResponse {
  success: boolean;
  error?: string;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteCategoryResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<DeleteCategoryResponse>;
    }

    // Only OWNER can delete categories
    const isOwner = await userHasRole("OWNER");
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id: categoryId } = await context.params;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    // Check if category has products
    const { data: products } = await client
      .from("products")
      .select("id")
      .eq("category_id", categoryId)
      .limit(1);

    if (products && products.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete category with products. Remove products first.",
        },
        { status: 409 }
      );
    }

    // Get current category for audit log
    const { data: currentCategory, error: fetchError } = await client
      .from("categories")
      .select("id, name")
      .eq("id", categoryId)
      .single();

    if (fetchError || !currentCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Delete category
    const { error: deleteError } = await client
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (deleteError) {
      console.error("Category deletion error:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete category",
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.category_deleted",
      entityType: "category",
      entityId: categoryId,
      metadata: {
        name: currentCategory.name,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete category endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
