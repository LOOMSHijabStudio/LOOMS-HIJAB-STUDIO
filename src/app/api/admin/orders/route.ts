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
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const params = request.nextUrl.searchParams;

    const status = params.get("status");
    const search = params.get("search")?.trim().toLowerCase();

    const client = createSupabaseServiceClient();

    // Ambil order tanpa memakai relasi Supabase.
    const { data: orders, error: ordersError } = await client
      .from("orders")
      .select(
        `
        id,
        order_number,
        customer_id,
        status,
        subtotal,
        shipping_amount,
        total,
        created_at
        `
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (ordersError) {
      console.error("Orders query error:", ordersError);
      throw ordersError;
    }

    let result = orders ?? [];

    // Filter status
    if (status) {
      result = result.filter((order) => order.status === status);
    }

    // Ambil customer secara terpisah
    const customerIds = [
      ...new Set(
        result
          .map((order) => order.customer_id)
          .filter(Boolean)
      ),
    ];

    let customers: Array<{
      id: string;
      full_name: string;
      whatsapp_number: string;
      email?: string | null;
    }> = [];

    if (customerIds.length > 0) {
      const { data, error } = await client
        .from("customers")
        .select(
          "id, full_name, whatsapp_number, email"
        )
        .in("id", customerIds);

      if (error) {
        console.error("Customers query error:", error);
        throw error;
      }

      customers = data ?? [];
    }

    const customerMap = new Map(
      customers.map((customer) => [
        customer.id,
        customer,
      ])
    );

    const mappedOrders = result
      .map((order) => ({
        ...order,
        customers:
          customerMap.get(order.customer_id) ?? null,
      }))
      .filter((order) => {
        if (!search) return true;

        const orderNumber =
          order.order_number?.toLowerCase() ?? "";

        const customerName =
          order.customers?.full_name?.toLowerCase() ?? "";

        const whatsapp =
          order.customers?.whatsapp_number?.toLowerCase() ?? "";

        return (
          orderNumber.includes(search) ||
          customerName.includes(search) ||
          whatsapp.includes(search)
        );
      });

    return NextResponse.json({
      success: true,
      orders: mappedOrders,
      total: mappedOrders.length,
    });
  } catch (error) {
    console.error("Admin order list error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch orders",
      },
      {
        status: 500,
      }
    );
  }
}
