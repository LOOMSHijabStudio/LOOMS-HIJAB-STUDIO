import "server-only";

import { env } from "@/lib/env";

export const loomsWhatsAppNumber = env.NEXT_PUBLIC_LOOMS_WHATSAPP_NUMBER;

export function buildWhatsAppMessage(order: {
  order: { order_number: string; subtotal: number | string; shipping_amount: number | string; total: number | string; status: string; customer_notes: string | null };
  customer: { full_name: string; whatsapp_number: string };
  address: { province: string; city: string; district: string; postal_code: string; full_address: string };
  items: Array<{ product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number | string }>;
}): string {
  const money = (value: number | string) => `Rp${Number(value).toLocaleString("id-ID")}`;
  const lines = order.items.map((item, index) => `${index + 1}. ${item.product_name_snapshot}\n   Variant: ${item.variant_name_snapshot ?? "-"}\n   Qty: ${item.quantity}\n   Harga: ${money(item.unit_price)}`).join("\n\n");
  return `Halo LOOMS, saya ingin melakukan pemesanan.\n\nORDER LOOMS\nNomor Order: ${order.order.order_number}\n\nData Customer:\nNama: ${order.customer.full_name}\nWhatsApp: ${order.customer.whatsapp_number}\n\nPesanan:\n${lines}\n\nSubtotal: ${money(order.order.subtotal)}\nOngkir: ${money(order.order.shipping_amount)}\nTotal: ${money(order.order.total)}\n\nAlamat Pengiriman:\n${order.address.full_address}\n${order.address.district}\n${order.address.city}\n${order.address.province}\n${order.address.postal_code}\n\nCatatan:\n${order.order.customer_notes ?? "-"}\n\nMohon konfirmasi pesanan saya.\nTerima kasih.`;
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${loomsWhatsAppNumber}?text=${encodeURIComponent(message)}`;
}