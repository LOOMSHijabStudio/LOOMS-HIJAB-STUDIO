import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface RemoveProductResponse {
  success: boolean;
  error?: string;
}

// Remove product from collection
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; productId: string }> }
): Promise<NextResponse<RemoveProductResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<RemoveProductResponse>;
    }

    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id: collectionId, productId } = await context.params;

    if (!collectionId || !productId) {
      return NextResponse.json(
        { success: false, error: "Collection ID and Product ID are required" },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    const { error: deleteError } = await client
      .from("collection_products")
      .delete()
      .eq("collection_id", collectionId)
      .eq("product_id", productId);

    if (deleteError) {
      console.error("Remove product error:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to remove product" },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      action: "admin.collection_product_removed",
      entityType: "collection",
      entityId: collectionId,
      metadata: {
        product_id: productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove product endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
