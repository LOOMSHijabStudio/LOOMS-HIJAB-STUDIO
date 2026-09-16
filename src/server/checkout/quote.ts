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

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/*
 * ==========================================
 * SHIPPING
 * ==========================================
 *
 * Aturan ongkir LOOMS:
 *
 * - Subtotal >= Rp500.000 → GRATIS
 *
 * - Jawa Barat:
 *   Kabupaten/Kota Cirebon → Rp5.000
 *   Indramayu → Rp5.000
 *   Jawa Barat lainnya → Rp10.000
 *
 * - DKI Jakarta / Banten → Rp10.000
 *
 * - Jawa Tengah / Jawa Timur / DI Yogyakarta → Rp15.000
 *
 * - Wilayah lainnya → Rp30.000
 */

export function calculateShippingAmount(
  subtotal: number,
  province?: string,
  city?: string,
): number {
  if (subtotal >= 500000) {
    return 0;
  }

  const normalizedProvince =
    normalizeText(province);

  const normalizedCity =
    normalizeText(city);

  /*
   * JAWA BARAT
   */
  if (
    normalizedProvince === "jawa barat" ||
    normalizedProvince === "jawa-barat"
  ) {
    /*
     * CIREBON + INDRAMAYU
     */
    if (
      normalizedCity.includes("cirebon") ||
      normalizedCity.includes("indramayu")
    ) {
      return 5000;
    }

    /*
     * JAWA BARAT LAINNYA
     */
    return 10000;
  }

  /*
   * DKI JAKARTA
   */
  if (
    normalizedProvince === "dki jakarta" ||
    normalizedProvince === "jakarta"
  ) {
    return 10000;
  }

  /*
   * BANTEN
   */
  if (
    normalizedProvince === "banten"
  ) {
    return 10000;
  }

  /*
   * JAWA TENGAH
   */
  if (
    normalizedProvince === "jawa tengah" ||
    normalizedProvince === "jawa-tengah"
  ) {
    return 15000;
  }

  /*
   * JAWA TIMUR
   */
  if (
    normalizedProvince === "jawa timur" ||
    normalizedProvince === "jawa-timur"
  ) {
    return 15000;
  }

  /*
   * DI YOGYAKARTA
   */
  if (
    normalizedProvince ===
      "daerah istimewa yogyakarta" ||
    normalizedProvince ===
      "di yogyakarta" ||
    normalizedProvince ===
      "yogyakarta"
  ) {
    return 15000;
  }

  /*
   * LUAR WILAYAH UTAMA
   */
  return 30000;
}

function requestHash(
  input: CheckoutInput,
): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

function money(
  value: number | string | null,
): number {
  return Number(value ?? 0);
}

export async function createCheckoutQuote(
  input: CheckoutInput,
): Promise<CheckoutQuote> {
  const supabase =
    createSupabaseServiceClient();

  const hash =
    requestHash(input);

  const {
    data: existingKey,
    error: existingKeyError,
  } = await supabase
    .from("idempotency_keys")
    .select("request_hash")
    .eq(
      "key",
      input.idempotencyKey,
    )
    .gt(
      "expires_at",
      new Date().toISOString(),
    )
    .maybeSingle();

  if (existingKeyError) {
    throw new Error(
      "Unable to validate checkout request",
    );
  }

  if (
    existingKey &&
    existingKey.request_hash !== hash
  ) {
    throw new Error(
      "This checkout key was already used",
    );
  }

  const productIds = [
    ...new Set(
      input.items.map(
        (item) =>
          item.productId,
      ),
    ),
  ];

  const variantIds = [
    ...new Set(
      input.items.flatMap(
        (item) =>
          item.variantId
            ? [item.variantId]
            : [],
      ),
    ),
  ];

  const [
    {
      data: products,
      error: productsError,
    },
    {
      data: variants,
      error: variantsError,
    },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, sku, price, sale_price, stock, status",
      )
      .in(
        "id",
        productIds,
      )
      .eq(
        "status",
        "ACTIVE",
      ),

    variantIds.length
      ? supabase
          .from("product_variants")
          .select(
            "id, product_id, name, sku, price, stock, is_active",
          )
          .in(
            "id",
            variantIds,
          )
          .eq(
            "is_active",
            true,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (
    productsError ||
    variantsError
  ) {
    throw new Error(
      "Unable to validate checkout items",
    );
  }

  const productMap =
    new Map(
      (products ?? []).map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  const variantMap =
    new Map(
      (variants ?? []).map(
        (variant) => [
          variant.id,
          variant,
        ],
      ),
    );

  const lines: CheckoutQuoteLine[] =
    [];

  for (
    const item of input.items
  ) {
    const product =
      productMap.get(
        item.productId,
      );

    const variant =
      item.variantId
        ? variantMap.get(
            item.variantId,
          )
        : null;

    if (
      !product ||
      product.status !== "ACTIVE"
    ) {
      throw new Error(
        "One or more products are unavailable",
      );
    }

    if (
      item.variantId &&
      (
        !variant ||
        variant.product_id !==
          product.id ||
        !variant.is_active
      )
    ) {
      throw new Error(
        "One or more variants are unavailable",
      );
    }

    const stock =
      variant
        ? variant.stock
        : product.stock;

    if (
      item.quantity > stock
    ) {
      throw new Error(
        `Insufficient stock for ${product.name}`,
      );
    }

    const unitPrice =
      money(
        variant?.price ??
          product.sale_price ??
          product.price,
      );

    const productName =
      product.name;

    lines.push({
      productId:
        product.id,

      variantId:
        variant?.id ?? null,

      productName,

      variantName:
        variant?.name ?? null,

      sku:
        variant?.sku ??
        product.sku,

      unitPrice,

      quantity:
        item.quantity,

      subtotal:
        unitPrice *
        item.quantity,
    });
  }

  const subtotal =
    lines.reduce(
      (
        sum,
        line,
      ) =>
        sum +
        line.subtotal,
      0,
    );

  /*
   * ==========================================
   * SHIPPING BERDASARKAN ALAMAT CUSTOMER
   * ==========================================
   */

  const shippingAmount =
    calculateShippingAmount(
      subtotal,
      input.address.province,
      input.address.city,
    );

  const quote = {
    items: lines,

    subtotal,

    shippingAmount,

    total:
      subtotal +
      shippingAmount,

    currency:
      "IDR" as const,
  };

  if (!existingKey) {
    const {
      error: insertError,
    } = await supabase
      .from("idempotency_keys")
      .insert({
        key:
          input.idempotencyKey,

        request_hash:
          hash,

        expires_at:
          new Date(
            Date.now() +
              24 *
                60 *
                60 *
                1000,
          ).toISOString(),
      });

    if (
      insertError &&
      !insertError.message
        .toLowerCase()
        .includes("duplicate")
    ) {
      throw new Error(
        "Unable to secure checkout request",
      );
    }
  }

  return quote;
}
