import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin, getCurrentSession } from "@/server/authorization/permissions";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { logAuditEvent } from "@/server/auth/audit";

const statusSchema = z.object({ status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "COMPLETED", "CANCELLED"]) });
const idSchema = z.string().uuid();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const verification = await verifyAdminRequest();
  if (!verification.success) return verification.response;
  if (!(await isAdmin())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  try {
    const validation = statusSchema.safeParse(await request.json());
    if (!validation.success) return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    const client = createSupabaseServiceClient();
    const session = await getCurrentSession();
    const { data: updatedStatus, error: updateError } = await client.rpc("update_order_status_atomically", { p_order_id: id, p_status: validation.data.status, p_changed_by_user_id: session?.userId ?? null });
    if (updateError) {
      if (updateError.message.toLowerCase().includes("order not found")) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      throw updateError;
    }
    await logAuditEvent({ action: "admin.order_status_changed", entityType: "order", entityId: id, metadata: { toStatus: updatedStatus } });
    return NextResponse.json({ success: true, status: updatedStatus });
  } catch (error) {
    console.error("Admin order status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update order status" }, { status: 500 });
  }
}
