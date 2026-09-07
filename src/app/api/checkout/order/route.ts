import { NextResponse } from "next/server";

import { createOrder } from "@/server/checkout/order";
import { checkoutSchema } from "@/server/checkout/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const validation =
      checkoutSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        "CHECKOUT VALIDATION ERROR:",
        validation.error.flatten()
      );

      return NextResponse.json(
        {
          success: false,
          error: "Please check your checkout details",
          details: validation.error.flatten(),
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "CHECKOUT REQUEST:",
      JSON.stringify(
        {
          ...validation.data,
          customer: {
            ...validation.data.customer,
            /*
             * Jangan tampilkan nomor WhatsApp
             * di log.
             */
            whatsappNumber: "[REDACTED]",
          },
        },
        null,
        2
      )
    );

    const result =
      await createOrder(validation.data);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "CHECKOUT CREATE ORDER ERROR:",
      error
    );

    /*
     * UNTUK DEBUGGING:
     * tampilkan error asli dari Supabase
     * ke browser.
     *
     * Setelah masalah selesai, nanti
     * kita kembalikan ke pesan aman.
     */
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        success: false,
        error: message || "Unknown checkout error",
      },
      {
        status: 500,
      }
    );
  }
}
