import "server-only";

import { env } from "@/lib/env";

export const loomsWhatsAppNumber =
  env.NEXT_PUBLIC_LOOMS_WHATSAPP_NUMBER;

/*
 * ============================================
 * TYPES
 * ============================================
 *
 * Kita menerima dua kemungkinan nama field item:
 *
 * 1. Format dari RPC:
 *    productName
 *    variantName
 *    quantity
 *    unitPrice
 *
 * 2. Format snapshot/database lama:
 *    product_name_snapshot
 *    variant_name_snapshot
 *    quantity
 *    unit_price
 *
 * Dengan begini pesan WhatsApp tetap aman
 * walaupun ada data order lama.
 */

type WhatsAppOrderItem = {
  productName?: string;
  product_name_snapshot?: string;

  variantName?: string | null;
  variant_name_snapshot?: string | null;

  quantity?: number | string;

  unitPrice?: number | string;
  unit_price?: number | string;
};

type WhatsAppOrder = {
  order: {
    order_number: string;

    subtotal:
      | number
      | string;

    shipping_amount:
      | number
      | string;

    total:
      | number
      | string;

    status: string;

    customer_notes:
      | string
      | null;
  };

  customer: {
    full_name: string;
    whatsapp_number: string;
    email?: string | null;
  };

  address: {
    province: string;
    city: string;
    district: string;
    postal_code: string;
    full_address: string;
  };

  items: WhatsAppOrderItem[];
};

/*
 * ============================================
 * MONEY FORMAT
 * ============================================
 */
function money(
  value: number | string | null | undefined
): string {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return "Rp0";
  }

  return `Rp${numericValue.toLocaleString("id-ID")}`;
}

/*
 * ============================================
 * BUILD WHATSAPP MESSAGE
 * ============================================
 */
export function buildWhatsAppMessage(
  order: WhatsAppOrder
): string {

  /*
   * Buat daftar pesanan.
   */
  const lines = order.items
    .map((item, index) => {

      /*
       * Ambil nama produk.
       *
       * Prioritas:
       * productName
       * lalu fallback ke product_name_snapshot
       */
      const productName =
        item.productName ??
        item.product_name_snapshot ??
        "-";

      /*
       * Variant bisa kosong/null.
       */
      const variantName =
        item.variantName ??
        item.variant_name_snapshot ??
        "-";

      /*
       * Quantity.
       */
      const quantity =
        Number(item.quantity ?? 0);

      /*
       * Unit price.
       *
       * Prioritas:
       * unitPrice
       * lalu fallback ke unit_price
       */
      const unitPrice =
        Number(
          item.unitPrice ??
          item.unit_price ??
          0
        );

      /*
       * Harga tidak boleh NaN.
       */
      const safeQuantity =
        Number.isFinite(quantity)
          ? quantity
          : 0;

      const safeUnitPrice =
        Number.isFinite(unitPrice)
          ? unitPrice
          : 0;

      return [
        `${index + 1}. ${productName}`,
        `   Variant: ${variantName}`,
        `   Qty: ${safeQuantity}`,
        `   Harga: ${money(
          safeUnitPrice
        )}`,
      ].join("\n");
    })
    .join("\n\n");

  /*
   * ==========================================
   * CUSTOMER EMAIL
   * ==========================================
   */
  const email =
    order.customer.email?.trim() || "-";

  /*
   * ==========================================
   * FINAL MESSAGE
   * ==========================================
   */
  return [
    "Halo LOOMS, saya ingin melakukan pemesanan.",
    "",
    "ORDER LOOMS",

    `Nomor Order: ${order.order.order_number}`,

    "",
    "Data Customer:",

    `Nama: ${order.customer.full_name}`,

    `WhatsApp: ${order.customer.whatsapp_number}`,

    `Email: ${email}`,

    "",
    "Pesanan:",

    lines || "Tidak ada item.",

    "",
    `Subtotal: ${money(
      order.order.subtotal
    )}`,

    `Ongkir: ${money(
      order.order.shipping_amount
    )}`,

    `Total: ${money(
      order.order.total
    )}`,

    "",
    "Alamat Pengiriman:",

    order.address.full_address,

    order.address.district,

    order.address.city,

    order.address.province,

    order.address.postal_code,

    "",
    "Catatan:",

    order.order.customer_notes ?? "-",

    "",
    "Mohon konfirmasi pesanan saya.",

    "Terima kasih.",
  ].join("\n");
}

/*
 * ============================================
 * BUILD WHATSAPP URL
 * ============================================
 */
export function buildWhatsAppUrl(
  message: string
): string {
  return `https://wa.me/${loomsWhatsAppNumber}?text=${encodeURIComponent(
    message
  )}`;
}
