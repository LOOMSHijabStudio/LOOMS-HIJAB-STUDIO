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

/*
 * Membuat hash dari request checkout.
 *
 * Hash ini dipakai oleh sistem idempotency
 * untuk mencegah satu checkout dibuat berkali-kali.
 */
function requestHash(input: CheckoutInput): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

/*
 * Membuat order.
 *
 * Alurnya:
 *
 * 1. Validasi sudah dilakukan di API route.
 * 2. RPC database membuat order secara atomik.
 * 3. Order berhasil dibuat.
 * 4. Pembelian dicatat ke Audit Logs.
 * 5. WhatsApp URL dibuat.
 * 6. Hasil dikembalikan ke checkout.
 */
export async function createOrder(
  input: CheckoutInput
): Promise<{
  order: CreatedOrder;
  whatsappUrl: string;
}> {
  const client = createSupabaseServiceClient();

  /*
   * Jalankan transaksi order di Supabase.
   *
   * Harga, subtotal, ongkir, total, dan stok
   * dihitung/diproses oleh database.
   */
  const { data, error } = await client.rpc(
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
        input.customer.email ?? null,

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
        input.address.notes ?? null,
    }
  );

  /*
   * Kalau database gagal membuat order,
   * hentikan proses.
   *
   * Jangan buat WhatsApp URL.
   */
  if (error || !data) {
    throw new Error(
      error?.message ||
        "Unable to create order"
    );
  }

  const order = data as CreatedOrder;

  /*
   * ============================================
   * AUDIT LOG
   * ============================================
   *
   * Order sudah berhasil dibuat.
   *
   * Sekarang kita catat pembelian ke audit_logs.
   *
   * Action yang digunakan:
   * admin.order_created
   *
   * Jadi nanti Admin → Audit Logs bisa melihat
   * setiap order yang masuk.
   */
  await logAuditEvent({
    action: "admin.order_created",

    entityType: "order",

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

      customerName:
        order.customer.full_name,

      customerWhatsapp:
        order.customer.whatsapp_number,

      customerEmail:
        order.customer.email,

      itemCount:
        order.items.length,

      items:
        order.items.map((item) => ({
          productId:
            item.productId,

          variantId:
            item.variantId ?? null,

          productName:
            item.product_name_snapshot,

          variantName:
            item.variant_name_snapshot,

          quantity:
            item.quantity,

          unitPrice:
            item.unit_price,
        })),
    },
  });

  /*
   * ============================================
   * WHATSAPP
   * ============================================
   *
   * WhatsApp hanya dibuat setelah order
   * berhasil masuk database.
   */
  const whatsappMessage =
    buildWhatsAppMessage(order);

  const whatsappUrl =
    buildWhatsAppUrl(
      whatsappMessage
    );

  /*
   * Kembalikan order + WhatsApp URL
   * ke API checkout.
   */
  return {
    order,
    whatsappUrl,
  };
}
