import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import {
  createOrder,
} from "@/server/checkout/order";

import {
  validateCheckoutInput,
  type CheckoutInput,
} from "@/server/checkout/validation";

export const dynamic = "force-dynamic";

function createRequestHash(
  input: unknown
): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export async function POST(
  request: Request
) {
  try {
    /*
     * ==============================
     * 1. READ JSON
     * ==============================
     */
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Request checkout tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==============================
     * 2. VALIDATE CHECKOUT
     * ==============================
     */
    const validation =
      validateCheckoutInput(body);

    if (!validation.success) {
      console.error(
        "Checkout validation failed:",
        validation.errors
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Please check your checkout details.",
          details: validation.errors,
        },
        {
          status: 400,
        }
      );
    }

    const input =
      validation.data as CheckoutInput;

    /*
     * ==============================
     * 3. REQUEST HASH
     * ==============================
     */
    const requestHash =
      createRequestHash(input);

    /*
     * ==============================
     * 4. CREATE ORDER
     * ==============================
     */
    const result = await createOrder(
      input,
      requestHash
    );

    /*
     * ==============================
     * 5. SUCCESS
     * ==============================
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

    const message =
      error instanceof Error
        ? error.message
        : "Checkout gagal.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
