import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

import type { CheckoutInput } from "./validation";
import type { CheckoutQuoteLine } from "./quote";

import {
  calculateShippingAmount,
  createCheckoutQuote,
} from "./quote";

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

function toNumber(
  value: number | string | null | undefined,
): number {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

/*
 * ==========================================
 * CREATE ORDER
 * ==========================================
 */
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
   * 1. HITUNG QUOTE SERVER
   * ==========================================
   *
   * Ini menggunakan aturan ongkir yang sama
   * dengan checkout website.
   *
   * Contoh:
   *
   * Kabupaten Cirebon
   * subtotal < 500k
   * → Rp5.000
   */
  const quote =
    await createCheckoutQuote(
      input,
    );

  /*
   * Promo berasal dari checkout page.
   */
  const promoDiscount =
    Math.max(
      0,
      toNumber(
        input.promoDiscount,
      ),
    );

  /*
   * Jangan sampai total negatif.
   */
  const finalTotal =
    Math.max(
      0,
      quote.subtotal -
        promoDiscount +
        quote.shippingAmount,
    );

  /*
   * ==========================================
   * 2. CREATE ORDER VIA RPC
   * ==========================================
   *
   * RPC lama tetap dipakai agar tidak
   * menyebabkan error karena parameter baru.
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
   * 3. DATABASE ERROR
   * ==========================================
   */
  if (error || !data) {
    throw new Error(
      error?.message ||
        "Unable to create order",
    );
  }

  const order =
    data as CreatedOrder;

  /*
   * ==========================================
   * 4. SINKRONKAN ONGKIR + TOTAL KE DATABASE
   * ==========================================
   *
   * Ini bagian penting.
   *
   * RPC lama bisa saja masih menghasilkan
   * shipping_amount = 15000.
   *
   * Kita overwrite dengan hasil quote
   * website yang benar.
   *
   * Jadi:
   *
   * Website → Rp5.000
   * Database → Rp5.000
   * Admin → Rp5.000
   * WhatsApp → Rp5.000
   */
  const {
    data: updatedOrder,
    error: updateError,
  } = await client
    .from("orders")
    .update({
      shipping_amount:
        quote.shippingAmount,

      total:
        finalTotal,
    })
    .eq(
      "id",
      order.order.id,
    )
    .select(
      "id, order_number, status, subtotal, shipping_amount, total, customer_notes",
    )
    .single();

  if (
    updateError ||
    !updatedOrder
  ) {
    throw new Error(
      updateError?.message ||
        "Unable to synchronize order shipping and total",
    );
  }

  /*
   * Gunakan data database yang sudah
   * disinkronkan sebagai sumber WhatsApp.
   */
  const synchronizedOrder:
    CreatedOrder = {
    ...order,

    order: {
      ...order.order,

      id:
        updatedOrder.id,

      order_number:
        updatedOrder.order_number,

      status:
        updatedOrder.status,

      subtotal:
        updatedOrder.subtotal,

      shipping_amount:
        updatedOrder.shipping_amount,

      total:
        updatedOrder.total,

      customer_notes:
        updatedOrder.customer_notes,
    },
  };

  /*
   * ==========================================
   * 5. AUDIT LOG
   * ==========================================
   */
  await logAuditEvent({
    action:
      "admin.order_created",

    entityType:
      "order",

    entityId:
      synchronizedOrder.order.id,

    metadata: {
      orderNumber:
        synchronizedOrder.order
          .order_number,

      status:
        synchronizedOrder.order
          .status,

      subtotal:
        synchronizedOrder.order
          .subtotal,

      shippingAmount:
        synchronizedOrder.order
          .shipping_amount,

      total:
        synchronizedOrder.order
          .total,

      promoCode:
        input.promoCode ??
        null,

      promoDiscount,

      customerName:
        synchronizedOrder.customer
          .full_name,

      customerWhatsapp:
        synchronizedOrder.customer
          .whatsapp_number,

      customerEmail:
        synchronizedOrder.customer
          .email,

      itemCount:
        synchronizedOrder.items.length,

      items:
        synchronizedOrder.items.map(
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
   * 6. WHATSAPP ORDER
   * ==========================================
   *
   * WhatsApp sekarang membaca order
   * yang SUDAH disinkronkan ke database.
   */
  const whatsappOrder:
    WhatsAppOrder = {
    ...synchronizedOrder,

    promoCode:
      input.promoCode ??
      null,

    promoDiscount,
  };

  /*
   * ==========================================
   * 7. WHATSAPP
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
   * 8. RETURN
   * ==========================================
   */
  return {
    order:
      synchronizedOrder,

    whatsappUrl,
  };
}
