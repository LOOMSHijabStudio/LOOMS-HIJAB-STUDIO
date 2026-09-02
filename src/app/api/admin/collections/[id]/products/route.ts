import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { logAuditEvent } from "@/server/auth/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addProductsSchema = z.object({
  product_ids: z.array(z.string().uuid()),
});

const reorderSchema = z.object({
  products: z.array(
    z.object({
      product_id: z.string().uuid(),
      position: z.number().int().nonnegative(),
    })
  ),
});

interface AddProductsResponse {
  success: boolean;
  error?: string;
}

// Add products to collection
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<AddProductsResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<AddProductsResponse>;
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

    // Validate input
    const validation = addProductsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid product IDs",
        },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    // Verify collection exists
    const { data: collection, error: collectionError } = await client
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    // Get current max position in collection
    const { data: maxPosition } = await client
      .from("collection_products")
      .select("position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const startPosition = (maxPosition?.position || 0) + 1;

    // Add products with positions
    const collectionProducts = validation.data.product_ids.map((id, index) => ({
      collection_id: collectionId,
      product_id: id,
      position: startPosition + index,
    }));

    const { error: insertError } = await client
      .from("collection_products")
      .insert(collectionProducts);

    if (insertError) {
      console.error("Add products error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to add products" },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.collection_products_added",
      entityType: "collection",
      entityId: collectionId,
      metadata: {
        product_count: validation.data.product_ids.length,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add products endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface ReorderResponse {
  success: boolean;
  error?: string;
}

// Reorder products in collection
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ReorderResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<ReorderResponse>;
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

    // Validate input
    const validation = reorderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid reorder data",
        },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    // Update positions for each product
    const updates = validation.data.products.map(item =>
      client
        .from("collection_products")
        .update({ position: item.position })
        .eq("collection_id", collectionId)
        .eq("product_id", item.product_id)
    );

    const results = await Promise.all(updates);

    // Check for errors
    for (const result of results) {
      if (result.error) {
        console.error("Reorder error:", result.error);
        return NextResponse.json(
          { success: false, error: "Failed to reorder products" },
          { status: 500 }
        );
      }
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.collection_products_reordered",
      entityType: "collection",
      entityId: collectionId,
      metadata: {
        product_count: validation.data.products.length,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}


