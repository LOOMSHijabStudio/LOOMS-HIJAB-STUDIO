import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { isAdmin } from "@/server/authorization/permissions";
import { updateProductPrice } from "@/server/services/product";
import { priceUpdateSchema } from "@/server/validation/product";

export const dynamic = "force-dynamic";

interface PriceUpdateResponse {
  success: boolean;
  error?: string;
}

// Update product price
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<PriceUpdateResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<PriceUpdateResponse>;
    }

    const hasPermission = await isAdmin();
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id: productId } = await context.params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input - never trust client prices
    const validation = priceUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid price data",
        },
        { status: 400 }
      );
    }

    const result = await updateProductPrice(productId, validation.data);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Update price endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
