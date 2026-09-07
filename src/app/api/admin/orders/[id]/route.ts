import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { logAuditEvent } from "@/server/auth/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireAdmin();

    const { id } = await context.params;

    const client = createSupabaseServiceClient();

    /* =====================================================
       ORDER
       ===================================================== */

    const { data: order, error: orderError } = await client
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        address_id,
        status,
        subtotal,
        shipping_amount,
        total,
        customer_notes,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error("ADMIN ORDER DETAIL - ORDER ERROR:", orderError);
      return NextResponse.json(
        {
          success: false,
          error: orderError.message,
        },
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 },
      );
    }


    /* =====================================================
       CUSTOMER
       ===================================================== */

    let customer = null;

    if (order.customer_id) {
      const { data: customerData, error: customerError } = await client
        .from("customers")
        .select(`
          id,
          full_name,
          whatsapp_number,
          email
        `)
        .eq("id", order.customer_id)
        .maybeSingle();

      if (customerError) {
        console.error(
          "ADMIN ORDER DETAIL - CUSTOMER ERROR:",
          customerError,
        );
      }

      customer = customerData ?? null;
    }


    /* =====================================================
       ADDRESS
       ===================================================== */

    let address = null;

    if (order.address_id) {
      const { data: addressData, error: addressError } = await client
        .from("addresses")
        .select(`
          id,
          province,
          city,
          district,
          postal_code,
          full_address
        `)
        .eq("id", order.address_id)
        .maybeSingle();

      if (addressError) {
        console.error(
          "ADMIN ORDER DETAIL - ADDRESS ERROR:",
          addressError,
        );
      }

      address = addressData ?? null;
    }


    /* =====================================================
       ORDER ITEMS
       ===================================================== */

    const { data: items, error: itemsError } = await client
      .from("order_items")
      .select(`
        id,
        order_id,
        product_id,
        variant_id,
        product_name_snapshot,
        variant_name_snapshot,
        sku_snapshot,
        quantity,
        unit_price,
        subtotal,
        created_at
      `)
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error(
        "ADMIN ORDER DETAIL - ITEMS ERROR:",
        itemsError,
      );

      return NextResponse.json(
        {
          success: false,
          error: itemsError.message,
        },
        { status: 500 },
      );
    }


    /* =====================================================
       STATUS HISTORY
       ===================================================== */

    const { data: statusHistory, error: historyError } = await client
      .from("order_status_history")
      .select(`
        order_id,
        status
      `)
      .eq("order_id", id);

    if (historyError) {
      console.error(
        "ADMIN ORDER DETAIL - HISTORY ERROR:",
        historyError,
      );
    }


    /* =====================================================
       RETURN
       ===================================================== */

    return NextResponse.json({
      success: true,

      order: {
        ...order,

        customer,

        address,

        items: items ?? [],

        status_history: statusHistory ?? [],
      },
    });

  } catch (error) {
    console.error("ADMIN ORDER DETAIL ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch order";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}


/* =========================================================
   DELETE ORDER
   ========================================================= */

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await requireAdmin();

    const { id } = await context.params;

    const client = createSupabaseServiceClient();


    /* -----------------------------------------------------
       AMBIL ORDER SEBELUM DELETE
       ----------------------------------------------------- */

    const { data: order, error: findError } = await client
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id
      `)
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "ADMIN ORDER DELETE - FIND ERROR:",
        findError,
      );

      return NextResponse.json(
        {
          success: false,
          error: findError.message,
        },
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 },
      );
    }


    /* -----------------------------------------------------
       DELETE
       ----------------------------------------------------- */

    const { error: deleteError } = await client
      .from("orders")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "ADMIN ORDER DELETE ERROR:",
        deleteError,
      );

      return NextResponse.json(
        {
          success: false,
          error: deleteError.message,
        },
        { status: 500 },
      );
    }


    /* -----------------------------------------------------
       AUDIT LOG
       ----------------------------------------------------- */

    try {
      await logAuditEvent({
        actorUserId: session?.userId ?? null,
        action: "admin.order_deleted",
        entityType: "order",
        entityId: id,
        metadata: {
          orderNumber: order.order_number,
          customerId: order.customer_id,
        },
      });
    } catch (auditError) {
      console.error(
        "ADMIN ORDER DELETE - AUDIT ERROR:",
        auditError,
      );
    }


    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error("ADMIN ORDER DELETE ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete order";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
