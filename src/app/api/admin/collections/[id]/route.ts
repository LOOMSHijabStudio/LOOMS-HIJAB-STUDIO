import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { collectionSchema } from "@/server/validation/product";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface GetCollectionResponse {
  success: boolean;
  collection?: Record<string, unknown>;
  error?: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<GetCollectionResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<GetCollectionResponse>;
    }

    const { id: collectionId } = await context.params;

    if (!collectionId) {
      return NextResponse.json(
        { success: false, error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    const { data: collection, error } = await client
      .from("collections")
      .select(
        `
        *,
        collection_products (
          id,
          product_id,
          position
        )
      `
      )
      .eq("id", collectionId)
      .single();

    if (error || !collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error("Get collection endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface UpdateCollectionResponse {
  success: boolean;
  error?: string;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateCollectionResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<UpdateCollectionResponse>;
    }

    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id: collectionId } = await context.params;

    if (!collectionId) {
      return NextResponse.json(
        { success: false, error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input (partial)
    const validation = collectionSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid collection data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const client = createSupabaseServiceClient();

    // Get current collection
    const { data: currentCollection, error: fetchError } = await client
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .single();

    if (fetchError || !currentCollection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    // Check for duplicate slug if changing
    if (data.slug && data.slug !== currentCollection.slug) {
      const { data: existing } = await client
        .from("collections")
        .select("id")
        .eq("slug", data.slug)
        .single();

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Collection with this slug already exists",
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
    if (data.cover_image_path !== undefined) updateData.cover_image_path = data.cover_image_path;
    if (data.banner_image_path !== undefined) updateData.banner_image_path = data.banner_image_path;
    if (data.position !== undefined) updateData.position = data.position;

    // Update collection
    const { error: updateError } = await client
      .from("collections")
      .update(updateData)
      .eq("id", collectionId);

    if (updateError) {
      console.error("Collection update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update collection",
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.collection_updated",
      entityType: "collection",
      entityId: collectionId,
      metadata: {
        changes: Object.keys(updateData).reduce(
          (acc, key) => {
            acc[key] = {
              old: (currentCollection as Record<string, unknown>)[key],
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
    console.error("Update collection endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface DeleteCollectionResponse {
  success: boolean;
  error?: string;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteCollectionResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<DeleteCollectionResponse>;
    }

    // Only OWNER can delete collections
    const isOwner = await userHasRole("OWNER");
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id: collectionId } = await context.params;

    if (!collectionId) {
      return NextResponse.json(
        { success: false, error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    // Get current collection for audit log
    const { data: currentCollection, error: fetchError } = await client
      .from("collections")
      .select("id, name")
      .eq("id", collectionId)
      .single();

    if (fetchError || !currentCollection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    // Delete collection_products first (cascade)
    const { error: deleteProductsError } = await client
      .from("collection_products")
      .delete()
      .eq("collection_id", collectionId);

    if (deleteProductsError) {
      console.error("Collection products deletion error:", deleteProductsError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete collection",
        },
        { status: 500 }
      );
    }

    // Delete collection
    const { error: deleteError } = await client
      .from("collections")
      .delete()
      .eq("id", collectionId);

    if (deleteError) {
      console.error("Collection deletion error:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete collection",
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.collection_deleted",
      entityType: "collection",
      entityId: collectionId,
      metadata: {
        name: currentCollection.name,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete collection endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
