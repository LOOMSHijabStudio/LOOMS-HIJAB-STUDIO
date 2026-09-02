import { NextResponse } from "next/server";
import { createOrder } from "@/server/checkout/order";
import { checkoutSchema } from "@/server/checkout/validation";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ success: false, error: "Please check your checkout details" }, { status: 400 });
    const result = await createOrder(validation.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create order";
    const conflict = /already used|unavailable|insufficient stock/i.test(message);
    return NextResponse.json({ success: false, error: conflict ? "The order could not be completed because an item is no longer available." : "Order creation is temporarily unavailable" }, { status: conflict ? 409 : 503 });
  }
}
