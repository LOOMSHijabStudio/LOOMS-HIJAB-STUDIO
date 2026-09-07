import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";
import { verifyAdminRequest } from "@/server/auth/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const verification = await verifyAdminRequest();

  if (!verification.success) {
    return verification.response;
  }

  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const search = params.get("search")?.trim().toLowerCase();

    const client = createSupabaseServiceClient();

    // Ambil order terlebih dahulu.
    // Jangan menggunakan customers(...) langsung karena relationship
    // Supabase bisa berbeda/menyebabkan query gagal.
    let query = client
      .from("orders")
      .select(
        "id, order_number, customer_id, status, subtotal, shipping_amount, total, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orderRows, error: ordersError, count } = await query;

    if (ordersError) {
      console.error("Supabase orders query error:", ordersError);
      throw ordersError;
    }

    const rows = orderRows ?? [];

    // Ambil customer berdasarkan customer_id
    const customerIds = [
      ...new Set(
        rows
          .map((order) => order.customer_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const customersById = new Map<
      string,
      {
        full_name: string;
        whatsapp_number: string;
        email?: string | null;
      }
    >();

    if (customerIds.length > 0) {
      const { data: customers, error: customersError } = await client
        .from("customers")
        .select("id, full_name, whatsapp_number, email")
        .in("id", customerIds);

      if (customersError) {
        console.error("Supabase customers query error:", customersError);
        throw customersError;
      }

      for (const customer of customers ?? []) {
        customersById.set(customer.id, {
          full_name: customer.full_name ?? "",
          whatsapp_number: customer.whatsapp_number ?? "",
          email: customer.email ?? null,
        });
      }
    }

    // Gabungkan order + customer
    const orders = rows
      .map((order) => ({
        ...order,
        customers: order.customer_id
          ? customersById.get(order.customer_id) ?? null
          : null,
      }))
      .filter((order) => {
        if (!search) return true;

        const orderNumber = String(order.order_number ?? "").toLowerCase();
        const customerName = String(
          order.customers?.full_name ?? "",
        ).toLowerCase();
        const whatsapp = String(
          order.customers?.whatsapp_number ?? "",
        ).toLowerCase();

        return (
          orderNumber.includes(search) ||
          customerName.includes(search) ||
          whatsapp.includes(search)
        );
      });

    return NextResponse.json({
      success: true,
      orders,
      total: count ?? orders.length,
    });
  } catch (error) {
    console.error("Admin order list error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch orders",
      },
      { status: 500 },
    );
  }
}
