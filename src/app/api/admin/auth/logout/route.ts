import { NextRequest, NextResponse } from "next/server";
import {
  getAdminSession,
  invalidateAdminSession,
  clearAdminSessionCookie,
} from "@/server/auth/session";
import { logLogout } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const isHtmlRequest = request.headers.get("accept")?.includes("text/html");

  try {
    const ipAddress = getClientIp(request);

    // Get current session
    const session = await getAdminSession();

    if (session) {
      // Invalidate the session in database
      await invalidateAdminSession(session.id);

      // Log the logout
      await logLogout(ipAddress);
    }

    // Clear the session cookie
    await clearAdminSessionCookie();

    if (isHtmlRequest) {
      return NextResponse.redirect(new URL("/admin/login", request.url), 303);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Logout berhasil",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout endpoint error:", error);

    // Ensure cookie is cleared on error
    await clearAdminSessionCookie();

    if (isHtmlRequest) {
      return NextResponse.redirect(new URL("/admin/login", request.url), 303);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Logout berhasil",
      },
      { status: 200 }
    );
  }
}
