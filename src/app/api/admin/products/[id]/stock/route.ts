import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { isAdmin } from "@/server/authorization/permissions";
import { updateProductStock } from "@/server/services/product";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface StockUpdateResponse {
  success: boolean;
  error?: string;
}

const stockUpdateSchema = z.object({
  stock: z.number().int().nonnegative("Stock must be a non-negative integer"),
});

// Update product stock
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<StockUpdateResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<StockUpdateResponse>;
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

    // Validate input
    const validation = stockUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stock data",
        },
        { status: 400 }
      );
    }

    const result = await updateProductStock(productId, validation.data.stock);

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
    console.error("Update stock endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
