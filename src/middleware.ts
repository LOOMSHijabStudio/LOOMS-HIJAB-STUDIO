import { NextRequest, NextResponse } from "next/server";
import {
  checkSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session-edge";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

function unauthorizedApiResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function redirectToLogin(request: NextRequest, clearCookie: boolean): NextResponse {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  if (clearCookie) {
    clearSessionCookie(response);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/api/admin/auth/login" ||
    pathname === "/api/admin/auth/logout"
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionCheck = await checkSessionCookie(sessionToken);

  // Login page: let server layout handle redirect for valid DB sessions
  if (pathname === "/admin/login") {
    if (sessionCheck === "valid") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (sessionCheck === "invalid" && sessionToken) {
      return redirectToLogin(request, true);
    }
    return NextResponse.next();
  }

  if (sessionCheck === "invalid") {
    if (pathname.startsWith("/api/admin")) {
      const response = unauthorizedApiResponse();
      if (sessionToken) {
        clearSessionCookie(response);
      }
      return response;
    }
    return redirectToLogin(request, Boolean(sessionToken));
  }

  // "valid" or "needs-server-verification" — server layout/API enforce full auth
  return NextResponse.next();
}
