import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { logAuditEvent } from "@/server/auth/audit";

import { z } from "zod";

const idSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
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

    const { data: order, error: orderError } = await client
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error("ADMIN ORDER DETAIL - ORDER ERROR:", orderError);
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
      { data: customer, error: customerError },
      { data: address, error: addressError },
      { data: items, error: itemsError },
      { data: history, error: historyError },
    ] = await Promise.all([
      client
        .from("customers")
        .select("id, full_name, whatsapp_number, email")
        .eq("id", order.customer_id)
        .maybeSingle(),

      client
        .from("addresses")
        .select(
          "id, province, city, district, postal_code, full_address"
        )
        .eq("id", order.address_id)
        .maybeSingle(),

      client
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),

      client
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (customerError) {
      console.error(
        "ADMIN ORDER DETAIL - CUSTOMER ERROR:",
        customerError
      );
    }

    if (addressError) {
      console.error(
        "ADMIN ORDER DETAIL - ADDRESS ERROR:",
        addressError
      );
    }

    if (itemsError) {
      console.error(
        "ADMIN ORDER DETAIL - ITEMS ERROR:",
        itemsError
      );
      throw itemsError;
    }

    if (historyError) {
      console.error(
        "ADMIN ORDER DETAIL - HISTORY ERROR:",
        historyError
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        customer: customer ?? null,
        address: address ?? null,
        items: items ?? [],
        history: history ?? [],
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
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
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

    const { data: order, error: findError } = await client
      .from("orders")
      .select("id, order_number, customer_id")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "ADMIN ORDER DELETE - FIND ERROR:",
        findError
      );

      return NextResponse.json(
        {
          success: false,
          error: findError.message,
        },
        {
          status: 500,
        }
      );
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

    const { error: deleteError } = await client
      .from("orders")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "ADMIN ORDER DELETE - DELETE ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          error: deleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    try {
      await logAuditEvent({
        actorUserId: verification.session.userId,
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
        auditError
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
      {
        status: 500,
      }
    );
  }
}
