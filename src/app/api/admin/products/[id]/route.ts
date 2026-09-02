import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { isAdmin } from "@/server/authorization/permissions";
import { isSupabaseConfigured } from "@/server/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getLocalProducts, updateLocalProduct, deleteLocalProduct } from "@/server/store/products-store";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response;
    }

    const { id: productId } = await context.params;

    if (!isSupabaseConfigured()) {
      const local = getLocalProducts().find((p) => p.id === productId);
      if (!local) {
        return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ success: true, product: local });
    }

    const client = createSupabaseServiceClient();
    const { data: product, error } = await client
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error || !product) {
      return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response;
    }

    const hasPermission = await isAdmin();
    if (!hasPermission) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id: productId } = await context.params;
    const body = await request.json();

    if (!isSupabaseConfigured()) {
      const updated = updateLocalProduct(productId, {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.sale_price !== undefined && { sale_price: body.sale_price ? Number(body.sale_price) : null }),
        ...(body.stock !== undefined && { stock: Number(body.stock) }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.image !== undefined && { image: body.image }),
      });

      if (!updated) {
        return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
      }

      await logAuditEvent({
        action: "admin.product_updated",
        entityType: "product",
        entityId: productId,
        metadata: body,
      });

      return NextResponse.json({ success: true, message: "Produk berhasil diperbarui", product: updated });
    }

    const client = createSupabaseServiceClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.sale_price !== undefined) updateData.sale_price = body.sale_price ? Number(body.sale_price) : null;
    if (body.stock !== undefined) updateData.stock = Number(body.stock);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.description !== undefined) updateData.description = body.description;

    const { error: updateError } = await client
      .from("products")
      .update(updateData)
      .eq("id", productId);

    if (updateError) {
      console.error("Product update error:", updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    await logAuditEvent({
      action: "admin.product_updated",
      entityType: "product",
      entityId: productId,
      metadata: updateData,
    });

    return NextResponse.json({ success: true, message: "Produk berhasil diperbarui" });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response;
    }

    const hasPermission = await isAdmin();
    if (!hasPermission) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id: productId } = await context.params;

    if (!isSupabaseConfigured()) {
      const deleted = deleteLocalProduct(productId);
      if (!deleted) {
        return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
      }

      await logAuditEvent({
        action: "admin.product_deleted",
        entityType: "product",
        entityId: productId,
      });

      return NextResponse.json({ success: true, message: "Produk berhasil dihapus" });
    }

    const client = createSupabaseServiceClient();
    const { error: deleteError } = await client
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      console.error("Delete product error:", deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    await logAuditEvent({
      action: "admin.product_deleted",
      entityType: "product",
      entityId: productId,
    });

    return NextResponse.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
