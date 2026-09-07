import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

import { isAdmin } from "@/server/authorization/permissions";
import { verifyAdminRequest } from "@/server/auth/api-utils";

import { logAuditEvent } from "@/server/auth/audit";

import { z } from "zod";

const idSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
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

  const { id } = await context.params;

  if (!idSchema.safeParse(id).success) {
    return NextResponse.json(
      {
        success: false,
        error: "Order not found",
      },
      {
        status: 404,
      }
    );
  }

  try {
    const client = createSupabaseServiceClient();

    const { data: order, error: orderError } =
      await client
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        {
          status: 404,
        }
      );
    }

    const [
      customerResult,
      addressResult,
      itemsResult,
      historyResult,
    ] = await Promise.all([
      client
        .from("customers")
        .select(
          "id, full_name, whatsapp_number, email"
        )
        .eq("id", order.customer_id)
        .maybeSingle(),

      client
        .from("addresses")
        .select(
          "province, city, district, postal_code, full_address"
        )
        .eq("id", order.address_id)
        .maybeSingle(),

      client
        .from("order_items")
        .select("*")
        .eq("order_id", id),

      client
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    return NextResponse.json({
      success: true,
      order,
      customer: customerResult.data ?? null,
      address: addressResult.data ?? null,
      items: itemsResult.data ?? [],
      history: historyResult.data ?? [],
    });
  } catch (error) {
    console.error(
      "Admin order detail error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch order",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
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

  const { id } = await context.params;

  if (!idSchema.safeParse(id).success) {
    return NextResponse.json(
      {
        success: false,
        error: "Order not found",
      },
      {
        status: 404,
      }
    );
  }

  try {
    const client = createSupabaseServiceClient();

    // Ambil order sebelum dihapus untuk audit log.
    const { data: order, error: findError } =
      await client
        .from("orders")
        .select(
          "id, order_number, customer_id, status, total"
        )
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        {
          status: 404,
        }
      );
    }

    // Hapus data anak terlebih dahulu.
    const historyDelete =
      await client
        .from("order_status_history")
        .delete()
        .eq("order_id", id);

    if (historyDelete.error) {
      throw historyDelete.error;
    }

    const itemsDelete =
      await client
        .from("order_items")
        .delete()
        .eq("order_id", id);

    if (itemsDelete.error) {
      throw itemsDelete.error;
    }

    // Hapus order utama.
    const orderDelete =
      await client
        .from("orders")
        .delete()
        .eq("id", id);

    if (orderDelete.error) {
      throw orderDelete.error;
    }

    // Simpan aktivitas penghapusan.
    await logAuditEvent({
      action: "admin.order_deleted",
      entityType: "order",
      entityId: id,
      metadata: {
        orderNumber: order.order_number,
        customerId: order.customer_id,
        status: order.status,
        total: order.total,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Admin order delete error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete order",
      },
      {
        status: 500,
      }
    );
  }
}
