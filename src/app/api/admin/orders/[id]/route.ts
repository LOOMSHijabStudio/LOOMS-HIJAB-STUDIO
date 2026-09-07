import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET
 * Menampilkan detail lengkap satu pesanan.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  void request;

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
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID is required",
        },
        { status: 400 },
      );
    }

    const client = createSupabaseServiceClient();

    // Ambil order
    const {
      data: order,
      error: orderError,
    } = await client
      .from("orders")
      .select(
        `
          id,
          order_number,
          customer_id,
          address_id,
          status,
          subtotal,
          shipping_amount,
          total,
          notes,
          created_at,
          updated_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Admin order detail query error:",
        orderError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch order",
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

    // Ambil customer
    let customer = null;

    if (order.customer_id) {
      const {
        data: customerData,
        error: customerError,
      } = await client
        .from("customers")
        .select("*")
        .eq("id", order.customer_id)
        .maybeSingle();

      if (customerError) {
        console.error(
          "Admin customer query error:",
          customerError,
        );
      }

      customer = customerData ?? null;
    }

    // Ambil alamat
    let address = null;

    if (order.address_id) {
      const {
        data: addressData,
        error: addressError,
      } = await client
        .from("addresses")
        .select("*")
        .eq("id", order.address_id)
        .maybeSingle();

      if (addressError) {
        console.error(
          "Admin address query error:",
          addressError,
        );
      }

      address = addressData ?? null;
    }

    // Ambil item pesanan
    const {
      data: items,
      error: itemsError,
    } = await client
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", {
        ascending: true,
      });

    if (itemsError) {
      console.error(
        "Admin order items query error:",
        itemsError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch order items",
        },
        { status: 500 },
      );
    }

    // Ambil riwayat status
    const {
      data: statusHistory,
      error: historyError,
    } = await client
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", {
        ascending: false,
      });

    if (historyError) {
      console.error(
        "Admin order history query error:",
        historyError,
      );
    }

    return NextResponse.json({
      success: true,

      order,

      customer,

      address,

      items: items ?? [],

      statusHistory: statusHistory ?? [],
    });
  } catch (error) {
    console.error(
      "Admin order detail error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch order detail",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE
 * Menghapus satu pesanan.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  void request;

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
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID is required",
        },
        { status: 400 },
      );
    }

    const client = createSupabaseServiceClient();

    // Ambil data order sebelum dihapus
    // supaya audit log tetap punya informasi order.
    const {
      data: order,
      error: findError,
    } = await client
      .from("orders")
      .select(
        "id, order_number, customer_id, status, total",
      )
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "Find order before delete error:",
        findError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to find order",
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

    // Ambil customer untuk audit.
    let customerName = null;
    let customerWhatsapp = null;

    if (order.customer_id) {
      const {
        data: customer,
      } = await client
        .from("customers")
        .select(
          "full_name, whatsapp_number",
        )
        .eq("id", order.customer_id)
        .maybeSingle();

      customerName =
        customer?.full_name ?? null;

      customerWhatsapp =
        customer?.whatsapp_number ?? null;
    }

    // Hapus order.
    //
    // Relasi order_items dan order_status_history
    // idealnya sudah menggunakan ON DELETE CASCADE.
    const {
      error: deleteError,
    } = await client
      .from("orders")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Delete order error:",
        deleteError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Pesanan tidak dapat dihapus. Pastikan data terkait mengizinkan penghapusan.",
        },
        { status: 500 },
      );
    }

    // Simpan aktivitas penghapusan ke audit log.
    await logAuditEvent({
      action: "admin.order_deleted",

      entityType: "order",

      entityId: id,

      metadata: {
        orderNumber: order.order_number,

        customerName,

        customerWhatsapp,

        total: order.total,

        previousStatus: order.status,
      },
    });

    return NextResponse.json({
      success: true,

      message: "Pesanan berhasil dihapus",
    });
  } catch (error) {
    console.error(
      "Admin order delete error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete order",
      },
      { status: 500 },
    );
  }
}
