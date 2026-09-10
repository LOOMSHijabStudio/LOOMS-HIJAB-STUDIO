import { NextResponse } from "next/server";

import { createOrder } from "@/server/checkout/order";

export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function isJsonObject(
  value: unknown
): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  object: JsonObject,
  key: string
): string {
  const value = object[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

function getOptionalString(
  object: JsonObject,
  key: string
): string | undefined {
  const value = object[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  return cleaned || undefined;
}

function getPositiveInteger(
  object: JsonObject,
  key: string
): number | null {
  const value = object[key];

  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (
    !Number.isInteger(numberValue) ||
    numberValue < 1
  ) {
    return null;
  }

  return numberValue;
}

export async function POST(
  request: Request
) {
  try {
    /*
     * ==========================================
     * 1. BACA REQUEST
     * ==========================================
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid checkout request.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isJsonObject(body)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid checkout data.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 2. AMBIL DATA UTAMA
     * ==========================================
     */

    const idempotencyKey =
      getString(
        body,
        "idempotencyKey"
      );

    const rawItems = body.items;
    const rawCustomer = body.customer;
    const rawAddress = body.address;

    /*
     * ==========================================
     * 3. VALIDASI DASAR
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
        }
      );
    }

    if (!Array.isArray(rawItems)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cart is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cart is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isJsonObject(rawCustomer)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer information is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isJsonObject(rawAddress)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Shipping address is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 4. CUSTOMER
     * ==========================================
     */

    const fullName =
      getString(
        rawCustomer,
        "fullName"
      );

    const whatsappNumber =
      getString(
        rawCustomer,
        "whatsappNumber"
      );

    const email =
      getOptionalString(
        rawCustomer,
        "email"
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
        }
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
        }
      );
    }

    /*
     * ==========================================
     * 5. ADDRESS
     * ==========================================
     */

    const province =
      getString(
        rawAddress,
        "province"
      );

    const city =
      getString(
        rawAddress,
        "city"
      );

    const district =
      getString(
        rawAddress,
        "district"
      );

    const postalCode =
      getString(
        rawAddress,
        "postalCode"
      );

    const fullAddress =
      getString(
        rawAddress,
        "fullAddress"
      );

    const notes =
      getOptionalString(
        rawAddress,
        "notes"
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
        }
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
        }
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
        }
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
        }
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
        }
      );
    }

    /*
     * ==========================================
     * 6. NORMALIZE ITEMS
     * ==========================================
     */

    const normalizedItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
    }> = [];

    for (const rawItem of rawItems) {
      if (!isJsonObject(rawItem)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid cart item.",
          },
          {
            status: 400,
          }
        );
      }

      const productId =
        getString(
          rawItem,
          "productId"
        );

      const variantId =
        getOptionalString(
          rawItem,
          "variantId"
        );

      const quantity =
        getPositiveInteger(
          rawItem,
          "quantity"
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
          }
        );
      }

      if (quantity === null) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid product quantity.",
          },
          {
            status: 400,
          }
        );
      }

      normalizedItems.push({
        productId,
        ...(variantId
          ? { variantId }
          : {}),
        quantity,
      });
    }

    /*
     * ==========================================
     * 7. CHECKOUT INPUT
     * ==========================================
     */

    const checkoutInput = {
      idempotencyKey,

      items: normalizedItems,

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
    };

    /*
     * ==========================================
     * 8. CREATE ORDER
     * ==========================================
     *
     * createOrder() di project ini
     * menerima SATU argument.
     */

    const result =
      await createOrder(
        checkoutInput
      );

    /*
     * ==========================================
     * 9. SUCCESS
     * ==========================================
     */

    return NextResponse.json({
      success: true,
      order: result.order,
      whatsappUrl:
        result.whatsappUrl,
    });
  } catch (error) {
    console.error(
      "Checkout API error:",
      error
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
      }
    );
  }
}
