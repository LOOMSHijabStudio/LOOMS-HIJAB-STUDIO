import "server-only";
import { createHash } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { CheckoutInput } from "./validation";

export type CheckoutQuoteLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type CheckoutQuote = {
  items: CheckoutQuoteLine[];
  subtotal: number;
  shippingAmount: number;
  total: number;
  currency: "IDR";
};

export function calculateShippingAmount(subtotal: number): number {
  return subtotal >= 500000 ? 0 : 15000;
}

function requestHash(input: CheckoutInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function money(value: number | string | null): number {
  return Number(value ?? 0);
}

export async function createCheckoutQuote(input: CheckoutInput): Promise<CheckoutQuote> {
  const supabase = createSupabaseServiceClient();
  const hash = requestHash(input);
  const { data: existingKey, error: existingKeyError } = await supabase
    .from("idempotency_keys")
    .select("request_hash")
    .eq("key", input.idempotencyKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingKeyError) throw new Error("Unable to validate checkout request");
  if (existingKey && existingKey.request_hash !== hash) throw new Error("This checkout key was already used");

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const variantIds = [...new Set(input.items.flatMap((item) => item.variantId ? [item.variantId] : []))];
  const [{ data: products, error: productsError }, { data: variants, error: variantsError }] = await Promise.all([
    supabase.from("products").select("id, name, sku, price, sale_price, stock, status").in("id", productIds).eq("status", "ACTIVE"),
    variantIds.length ? supabase.from("product_variants").select("id, product_id, name, sku, price, stock, is_active").in("id", variantIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsError || variantsError) throw new Error("Unable to validate checkout items");
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  const variantMap = new Map((variants ?? []).map((variant) => [variant.id, variant]));
  const lines: CheckoutQuoteLine[] = [];

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    const variant = item.variantId ? variantMap.get(item.variantId) : null;
    if (!product || product.status !== "ACTIVE") throw new Error("One or more products are unavailable");
    if (item.variantId && (!variant || variant.product_id !== product.id || !variant.is_active)) throw new Error("One or more variants are unavailable");
    const stock = variant ? variant.stock : product.stock;
    if (item.quantity > stock) throw new Error(`Insufficient stock for ${product.name}`);
    const unitPrice = money(variant?.price ?? product.sale_price ?? product.price);
    const productName = product.name;
    lines.push({ productId: product.id, variantId: variant?.id ?? null, productName, variantName: variant?.name ?? null, sku: variant?.sku ?? product.sku, unitPrice, quantity: item.quantity, subtotal: unitPrice * item.quantity });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const shippingAmount = calculateShippingAmount(subtotal);
  const quote = { items: lines, subtotal, shippingAmount, total: subtotal + shippingAmount, currency: "IDR" as const };

  if (!existingKey) {
    const { error: insertError } = await supabase.from("idempotency_keys").insert({ key: input.idempotencyKey, request_hash: hash, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) throw new Error("Unable to secure checkout request");
  }

  return quote;
}
