import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { createOrder } from "@/server/checkout/order";

export const dynamic = "force-dynamic";

function createRequestHash(input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    /*
     * ==========================================
     * 1. BACA REQUEST JSON
     * ==========================================
     */
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid checkout request.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 2. VALIDASI DASAR
     * ==========================================
     */

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid checkout data.",
        },
        {
          status: 400,
        }
      );
    }

    const data = body as Record<string, any>;

    const idempotencyKey =
      typeof data.idempotencyKey === "string"
        ? data.idempotencyKey.trim()
        : "";

    const items = Array.isArray(data.items)
      ? data.items
      : [];

    const customer =
      data.customer &&
      typeof data.customer === "object"
        ? data.customer
        : {};

    const address =
      data.address &&
      typeof data.address === "object"
        ? data.address
        : {};

    /*
     * ==========================================
     * 3. CEK FIELD WAJIB
     * ==========================================
     */

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Checkout key is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!items.length) {
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

    if (
      typeof customer.fullName !== "string" ||
      !customer.fullName.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof customer.whatsappNumber !== "string" ||
      !customer.whatsappNumber.trim()
    ) {
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

    if (
      typeof address.province !== "string" ||
      !address.province.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Province is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof address.city !== "string" ||
      !address.city.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "City is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof address.district !== "string" ||
      !address.district.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "District is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof address.postalCode !== "string" ||
      !address.postalCode.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Postal code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof address.fullAddress !== "string" ||
      !address.fullAddress.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Full address is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 4. CEK SETIAP ITEM
     * ==========================================
     */

    for (const item of items) {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid cart item.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        typeof item.productId !== "string" ||
        !item.productId.trim()
      ) {
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

      const quantity = Number(
        item.quantity
      );

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
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

      if (
        item.variantId !== undefined &&
        item.variantId !== null &&
        item.variantId !== "" &&
        typeof item.variantId !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid variant ID.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * ==========================================
     * 5. REQUEST HASH
     * ==========================================
     */

    const requestHash =
      createRequestHash(data);

    /*
     * ==========================================
     * 6. SIAPKAN INPUT UNTUK createOrder()
     * ==========================================
     */

    const checkoutInput = {
      idempotencyKey,

      items: items.map(
        (item: any) => ({
          productId:
            item.productId.trim(),

          variantId:
            typeof item.variantId ===
              "string" &&
            item.variantId.trim()
              ? item.variantId.trim()
              : undefined,

          quantity:
            Number(item.quantity),
        })
      ),

      customer: {
        fullName:
          customer.fullName.trim(),

        whatsappNumber:
          customer.whatsappNumber.trim(),

        email:
          typeof customer.email ===
            "string" &&
          customer.email.trim()
            ? customer.email.trim()
            : undefined,
      },

      address: {
        province:
          address.province.trim(),

        city:
          address.city.trim(),

        district:
          address.district.trim(),

        postalCode:
          address.postalCode.trim(),

        fullAddress:
          address.fullAddress.trim(),

        notes:
          typeof address.notes ===
            "string" &&
          address.notes.trim()
            ? address.notes.trim()
            : undefined,
      },
    };

    /*
     * ==========================================
     * 7. CREATE ORDER
     * ==========================================
     */

    const result = await createOrder(
      checkoutInput,
      requestHash
    );

    /*
     * ==========================================
     * 8. RESPONSE
     * ==========================================
     */

    return NextResponse.json({
      success: true,
      order: result.order,
      whatsappUrl: result.whatsappUrl,
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
