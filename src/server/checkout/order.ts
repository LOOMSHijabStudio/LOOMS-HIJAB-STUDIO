import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { CheckoutInput } from "./validation";
import type { CheckoutQuoteLine } from "./quote";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "./whatsapp";

export type CreatedOrder = {
  order: { id: string; order_number: string; status: string; subtotal: number | string; shipping_amount: number | string; total: number | string; customer_notes: string | null };
  customer: { full_name: string; whatsapp_number: string; email: string | null };
  address: { province: string; city: string; district: string; postal_code: string; full_address: string };
  items: Array<CheckoutQuoteLine & { product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number | string }>;
};

function requestHash(input: CheckoutInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function createOrder(input: CheckoutInput): Promise<{ order: CreatedOrder; whatsappUrl: string }> {
  const client = createSupabaseServiceClient();
  const { data, error } = await client.rpc("create_order_atomically", {
    p_idempotency_key: input.idempotencyKey,
    p_request_hash: requestHash(input),
    p_items: input.items,
    p_full_name: input.customer.fullName,
    p_whatsapp_number: input.customer.whatsappNumber,
    p_email: input.customer.email ?? null,
    p_province: input.address.province,
    p_city: input.address.city,
    p_district: input.address.district,
    p_postal_code: input.address.postalCode,
    p_full_address: input.address.fullAddress,
    p_notes: input.address.notes ?? null,
  });

  if (error || !data) throw new Error(error?.message || "Unable to create order");
  const order = data as CreatedOrder;
  const whatsappUrl = buildWhatsAppUrl(buildWhatsAppMessage(order));
  return { order, whatsappUrl };
}
