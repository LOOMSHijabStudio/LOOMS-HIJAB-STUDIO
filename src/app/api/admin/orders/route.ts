import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";
import { verifyAdminRequest } from "@/server/auth/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const verification = await verifyAdminRequest();
  if (!verification.success) return verification.response;
  if (!(await isAdmin())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const search = params.get("search")?.trim();
    const client = createSupabaseServiceClient();
    let query = client.from("orders").select("id, order_number, status, subtotal, shipping_amount, total, created_at, customers(full_name, whatsapp_number)", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) throw error;
    const orders = (data ?? []).filter((order) => !search || order.order_number.toLowerCase().includes(search.toLowerCase()) || String((order.customers as { full_name?: string } | null)?.full_name ?? "").toLowerCase().includes(search.toLowerCase()));
    return NextResponse.json({ success: true, orders, total: count ?? orders.length });
  } catch (error) {
    console.error("Admin order list error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
