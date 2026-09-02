import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

interface DeleteProductResponse {
  success: boolean;
  error?: string;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteProductResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<DeleteProductResponse>;
    }

    // Only OWNER can delete products (archive them)
    const isOwner = await userHasRole("OWNER");
    if (!isOwner) {
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

    const client = createSupabaseServiceClient();

    // Get current product for audit log
    const { data: currentProduct, error: fetchError } = await client
      .from("products")
      .select("id, name, status")
      .eq("id", productId)
      .single();

    if (fetchError || !currentProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Archive the product instead of permanent delete
    const { error: updateError } = await client
      .from("products")
      .update({
        status: "ARCHIVED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Product deletion error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete product",
        },
        { status: 500 }
      );
    }

    // Log audit event - only OWNER can see this
    await logAuditEvent({
      action: "admin.product_deleted",
      entityType: "product",
      entityId: productId,
      metadata: {
        name: currentProduct.name,
        previous_status: currentProduct.status,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete product endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
