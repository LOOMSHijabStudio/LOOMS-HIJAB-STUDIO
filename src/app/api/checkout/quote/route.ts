import { NextResponse } from "next/server";
import { createCheckoutQuote } from "@/server/checkout/quote";
import { checkoutSchema } from "@/server/checkout/validation";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ success: false, error: "Please check your checkout details" }, { status: 400 });
    const quote = await createCheckoutQuote(validation.data);
    return NextResponse.json({ success: true, quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to validate checkout";
    const status = message.includes("already been used") || message.includes("unavailable") || message.includes("stock") ? 409 : 503;
    return NextResponse.json({ success: false, error: status === 503 ? "Checkout is temporarily unavailable" : message }, { status });
  }
}
