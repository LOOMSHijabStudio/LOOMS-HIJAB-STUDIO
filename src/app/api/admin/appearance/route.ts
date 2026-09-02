import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { getWebsiteAppearance, updateWebsiteAppearance } from "@/server/store/appearance";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response;
    }

    const appearance = getWebsiteAppearance();
    return NextResponse.json({
      success: true,
      appearance,
    });
  } catch (error) {
    console.error("Get appearance error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data tampilan website" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response;
    }

    const body = await request.json();
    const updated = updateWebsiteAppearance(body);

    await logAuditEvent({
      action: "admin.product_updated",
      entityType: "appearance",
      metadata: { changes: Object.keys(body) },
    });

    return NextResponse.json({
      success: true,
      message: "Tampilan website berhasil diperbarui",
      appearance: updated,
    });
  } catch (error) {
    console.error("Update appearance error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui tampilan website" },
      { status: 500 }
    );
  }
}
