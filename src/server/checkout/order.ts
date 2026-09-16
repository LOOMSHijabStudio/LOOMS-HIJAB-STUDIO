import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

import type { CheckoutInput } from "./validation";
import type { CheckoutQuoteLine } from "./quote";

import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
} from "./whatsapp";

import { logAuditEvent } from "@/server/auth/audit";

export type CreatedOrder = {
  order: {
    id: string;
    order_number: string;
    status: string;
    subtotal: number | string;
    shipping_amount: number | string;
    total: number | string;
    customer_notes: string | null;
  };

  customer: {
    full_name: string;
    whatsapp_number: string;
    email: string | null;
  };

  address: {
    province: string;
    city: string;
    district: string;
    postal_code: string;
    full_address: string;
  };

  items: Array<
    CheckoutQuoteLine & {
      product_name_snapshot: string;
      variant_name_snapshot: string | null;
      quantity: number;
      unit_price: number | string;
    }
  >;
};

type WhatsAppOrder = CreatedOrder & {
  promoCode?: string | null;
  promoDiscount?: number;
};

function requestHash(
  input: CheckoutInput,
): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export async function createOrder(
  input: CheckoutInput,
): Promise<{
  order: CreatedOrder;
  whatsappUrl: string;
}> {
  const client =
    createSupabaseServiceClient();

  /*
   * ==========================================
   * CREATE ORDER
   * ==========================================
   *
   * Order tetap dibuat oleh RPC utama.
   * Jangan menjalankan createCheckoutQuote()
   * di sini karena function tersebut juga
   * membuat idempotency key.
   */
  const {
    data,
    error,
  } = await client.rpc(
    "create_order_atomically",
    {
      p_idempotency_key:
        input.idempotencyKey,

      p_request_hash:
        requestHash(input),

      p_items:
        input.items,

      p_full_name:
        input.customer.fullName,

      p_whatsapp_number:
        input.customer.whatsappNumber,

      p_email:
        input.customer.email ??
        null,

      p_province:
        input.address.province,

      p_city:
        input.address.city,

      p_district:
        input.address.district,

      p_postal_code:
        input.address.postalCode,

      p_full_address:
        input.address.fullAddress,

      p_notes:
        input.address.notes ??
        null,
    },
  );

  /*
   * ==========================================
   * DATABASE ERROR
   * ==========================================
   */
  if (
    error ||
    !data
  ) {
    throw new Error(
      error?.message ||
        "Unable to create order",
    );
  }

  const order =
    data as CreatedOrder;

  /*
   * ==========================================
   * SAVE PROMO TO DATABASE
   * ==========================================
   *
   * Promo disimpan setelah order berhasil
   * dibuat oleh RPC utama.
   */
  const promoDiscount =
    Math.max(
      0,
      Math.min(
        Number(
          input.promoDiscount ?? 0,
        ),
        Number(
          order.order.subtotal,
        ),
      ),
    );

  if (
    input.promoCode &&
    promoDiscount > 0
  ) {
    const {
      error: promoError,
    } = await client.rpc(
      "save_order_promo",
      {
        p_order_id:
          order.order.id,

        p_promo_code:
          input.promoCode,

        p_discount_amount:
          promoDiscount,
      },
    );

    if (promoError) {
      throw new Error(
        promoError.message ||
          "Unable to save promo",
      );
    }

    /*
     * Update total lokal supaya
     * WhatsApp menggunakan total
     * setelah diskon.
     */
    order.order.total =
      Number(
        order.order.subtotal,
      ) -
      promoDiscount +
      Number(
        order.order.shipping_amount,
      );
  }

  /*
   * ==========================================
   * AUDIT LOG
   * ==========================================
   */
  await logAuditEvent({
    action:
      "admin.order_created",

    entityType:
      "order",

    entityId:
      order.order.id,

    metadata: {
      orderNumber:
        order.order.order_number,

      status:
        order.order.status,

      subtotal:
        order.order.subtotal,

      shippingAmount:
        order.order.shipping_amount,

      total:
        order.order.total,

      promoCode:
        input.promoCode ??
        null,

      promoDiscount:
        promoDiscount,

      customerName:
        order.customer.full_name,

      customerWhatsapp:
        order.customer
          .whatsapp_number,

      customerEmail:
        order.customer.email,

      itemCount:
        order.items.length,

      items:
        order.items.map(
          (item) => ({
            productId:
              item.productId,

            variantId:
              item.variantId ??
              null,

            productName:
              item.product_name_snapshot,

            variantName:
              item.variant_name_snapshot,

            quantity:
              item.quantity,

            unitPrice:
              item.unit_price,
          }),
        ),
    },
  });

  /*
   * ==========================================
   * WHATSAPP ORDER
   * ==========================================
   */
  const whatsappOrder:
    WhatsAppOrder = {
    ...order,

    promoCode:
      input.promoCode ??
      null,

    promoDiscount:
      promoDiscount,
  };

  /*
   * ==========================================
   * WHATSAPP MESSAGE
   * ==========================================
   */
  const whatsappMessage =
    buildWhatsAppMessage(
      whatsappOrder,
    );

  const whatsappUrl =
    buildWhatsAppUrl(
      whatsappMessage,
    );

  /*
   * ==========================================
   * RETURN
   * ==========================================
   */
  return {
    order,
    whatsappUrl,
  };
}
