import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { z } from "zod";

const idSchema = z.string().uuid();

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const verification = await verifyAdminRequest();
  if (!verification.success) return verification.response;
  if (!(await isAdmin())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  try {
    const client = createSupabaseServiceClient();
    const { data: order, error } = await client.from("orders").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    const [{ data: customer }, { data: address }, { data: items }, { data: history }] = await Promise.all([
      client.from("customers").select("id, full_name, whatsapp_number, email").eq("id", order.customer_id).single(),
      client.from("addresses").select("province, city, district, postal_code, full_address").eq("id", order.address_id).single(),
      client.from("order_items").select("*").eq("order_id", id),
      client.from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: true }),
    ]);
    return NextResponse.json({ success: true, order, customer, address, items: items ?? [], history: history ?? [] });
  } catch (error) {
    console.error("Admin order detail error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 });
  }
}
