import { NextResponse } from "next/server";

import { createOrder } from "@/server/checkout/order";

export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function isJsonObject(
  value: unknown,
): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  object: JsonObject,
  key: string,
): string {
  const value = object[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

function getOptionalString(
  object: JsonObject,
  key: string,
): string | undefined {
  const value = object[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  return cleaned || undefined;
}

/*
 * ==========================================
 * NUMBER HELPERS
 * ==========================================
 */

function getNonNegativeNumber(
  object: JsonObject,
  key: string,
): number {
  const value = object[key];

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return 0;
  }

  return numericValue;
}

function getPositiveInteger(
  object: JsonObject,
  key: string,
): number | null {
  const value = object[key];

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (
    !Number.isInteger(numericValue) ||
    numericValue < 1
  ) {
    return null;
  }

  return numericValue;
}

/*
 * ==========================================
 * ORDER ID
 * ==========================================
 */

function findOrderId(
  value: unknown,
): string | null {
  if (!isJsonObject(value)) {
    return null;
  }

  const directKeys = [
    "orderId",
    "order_id",
    "id",
  ];

  for (const key of directKeys) {
    const candidate =
      value[key];

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      /*
       * Jangan menganggap semua "id" sebagai
       * order ID.
       *
       * Prioritaskan orderId / order_id.
       */
      if (
        key === "orderId" ||
        key === "order_id"
      ) {
        return candidate.trim();
      }
    }
  }

  /*
   * ==========================================
   * NESTED ORDER
   * ==========================================
   */

  const preferredKeys = [
    "order",
    "createdOrder",
    "created_order",
    "orderData",
    "data",
    "result",
  ];

  for (const key of preferredKeys) {
    const nested =
      value[key];

    if (
      isJsonObject(nested)
    ) {
      const nestedId =
        findOrderId(nested);

      if (nestedId) {
        return nestedId;
      }
    }
  }

  /*
   * ==========================================
   * FALLBACK
   * ==========================================
   */

  const hasOrderNumber =
    typeof value.order_number ===
      "string" &&
    value.order_number.trim() !== "";

  if (
    hasOrderNumber &&
    typeof value.id === "string" &&
    value.id.trim() !== ""
  ) {
    return value.id.trim();
  }

  return null;
}

/*
 * ==========================================
 * WHATSAPP URL
 * ==========================================
 */

function findWhatsAppUrl(
  value: unknown,
): string | null {
  if (!isJsonObject(value)) {
    return null;
  }

  const direct =
    value.whatsappUrl;

  if (
    typeof direct === "string" &&
    direct.trim()
  ) {
    return direct.trim();
  }

  const nestedKeys = [
    "data",
    "result",
    "order",
  ];

  for (const key of nestedKeys) {
    const nested =
      value[key];

    if (
      isJsonObject(nested)
    ) {
      const url =
        findWhatsAppUrl(nested);

      if (url) {
        return url;
      }
    }
  }

  return null;
}

/*
 * ==========================================
 * POST
 * ==========================================
 */

export async function POST(
  request: Request,
) {
  try {
    /*
     * ==========================================
     * 1. READ REQUEST
     * ==========================================
     */

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid checkout request.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isJsonObject(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid checkout data.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ==========================================
     * 2. ROOT DATA
     * ==========================================
     */

    const idempotencyKey =
      getString(
        body,
        "idempotencyKey",
      );

    const rawItems =
      body.items;

    const rawCustomer =
      body.customer;

    const rawAddress =
      body.address;

    /*
     * ==========================================
     * 3. PROMO
     * ==========================================
     *
     * Promo berasal dari checkout page.
     *
     * promoCode:
     * kode promo yang berhasil divalidasi.
     *
     * promoDiscount:
     * nominal diskon yang sudah dihitung
     * oleh endpoint validasi promo.
     */

    const promoCode =
      getOptionalString(
        body,
        "promoCode",
      );

    const promoDiscount =
      getNonNegativeNumber(
        body,
        "promoDiscount",
      );

    /*
     * ==========================================
     * 4. BASIC VALIDATION
     * ==========================================
     */

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Checkout key is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Array.isArray(rawItems)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cart is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      rawItems.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cart is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isJsonObject(
        rawCustomer,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer information is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isJsonObject(
        rawAddress,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Shipping address is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ==========================================
     * 5. CUSTOMER
     * ==========================================
     */

    const fullName =
      getString(
        rawCustomer,
        "fullName",
      );

    const whatsappNumber =
      getString(
        rawCustomer,
        "whatsappNumber",
      );

    const email =
      getOptionalString(
        rawCustomer,
        "email",
      );

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!whatsappNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp number is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ==========================================
     * 6. ADDRESS
     * ==========================================
     */

    const province =
      getString(
        rawAddress,
        "province",
      );

    const city =
      getString(
        rawAddress,
        "city",
      );

    const district =
      getString(
        rawAddress,
        "district",
      );

    const postalCode =
      getString(
        rawAddress,
        "postalCode",
      );

    const fullAddress =
      getString(
        rawAddress,
        "fullAddress",
      );

    const notes =
      getOptionalString(
        rawAddress,
        "notes",
      );

    if (!province) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Province is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          success: false,
          error:
            "City is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!district) {
      return NextResponse.json(
        {
          success: false,
          error:
            "District is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!postalCode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Postal code is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!fullAddress) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Full address is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ==========================================
     * 7. ITEMS
     * ==========================================
     */

    const normalizedItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
    }> = [];

    for (
      const rawItem of rawItems
    ) {
      if (
        !isJsonObject(
          rawItem,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid cart item.",
          },
          {
            status: 400,
          },
        );
      }

      const productId =
        getString(
          rawItem,
          "productId",
        );

      const variantId =
        getOptionalString(
          rawItem,
          "variantId",
        );

      const quantity =
        getPositiveInteger(
          rawItem,
          "quantity",
        );

      if (!productId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Product ID is required.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        quantity === null
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid product quantity.",
          },
          {
            status: 400,
          },
        );
      }

      normalizedItems.push({
        productId,

        ...(variantId
          ? {
              variantId,
            }
          : {}),

        quantity,
      });
    }

    /*
     * ==========================================
     * 8. CHECKOUT INPUT
     * ==========================================
     *
     * Promo sekarang ikut dibawa dari
     * checkout page ke createOrder().
     */

    const checkoutInput = {
      idempotencyKey,

      items:
        normalizedItems,

      customer: {
        fullName,
        whatsappNumber,
        email,
      },

      address: {
        province,
        city,
        district,
        postalCode,
        fullAddress,
        notes,
      },

      promoCode,

      promoDiscount,
    };

    /*
     * ==========================================
     * 9. CREATE ORDER
     * ==========================================
     */

    const result =
      await createOrder(
        checkoutInput,
      );

    /*
     * ==========================================
     * 10. ORDER ID
     * ==========================================
     *
     * ID hanya diambil kalau memang tersedia.
     *
     * Checkout tidak boleh gagal hanya karena
     * order ID tidak berhasil ditemukan.
     */

    const orderId =
      findOrderId(result);

    /*
     * ==========================================
     * 11. WHATSAPP
     * ==========================================
     */

    const whatsappUrl =
      findWhatsAppUrl(result);

    if (!whatsappUrl) {
      console.error(
        "Order created but WhatsApp URL was not found.",
        result,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Order berhasil dibuat tetapi link WhatsApp tidak tersedia.",
          orderId,
        },
        {
          status: 500,
        },
      );
    }

    /*
     * ==========================================
     * 12. RESPONSE
     * ==========================================
     */

    if (
      isJsonObject(result)
    ) {
      return NextResponse.json({
        success: true,

        ...result,

        orderId,

        whatsappUrl,
      });
    }

    return NextResponse.json({
      success: true,

      orderId,

      whatsappUrl,

      data: result,
    });
  } catch (error) {
    console.error(
      "Checkout API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Checkout failed.",
      },
      {
        status: 500,
      },
    );
  }
}
