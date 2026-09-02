import { NextResponse } from "next/server";
import { getAdminSession } from "@/server/auth/session";

interface AdminSession {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  expiresAt: number;
  createdAt: number;
  roles: string[];
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Verify that a request is from an authenticated admin user
 * Redirects to login if not authenticated
 */
export async function verifyAdminRequest(): Promise<{ success: true; session: AdminSession } | { success: false; response: NextResponse }> {
  const session = await getAdminSession();

  if (!session) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    session,
  };
}

/**
 * Verify that a request is from an authenticated user with a specific role
 */
export async function verifyAdminRequestWithRole(
  requiredRole: string
): Promise<{ success: true; session: AdminSession } | { success: false; response: NextResponse }> {
  const session = await getAdminSession();

  if (!session) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (!session.roles.includes(requiredRole)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    session,
  };
}

/**
 * Verify that a request is from an authenticated user with any of the specified roles
 */
export async function verifyAdminRequestWithAnyRole(
  requiredRoles: string[]
): Promise<{ success: true; session: AdminSession } | { success: false; response: NextResponse }> {
  const session = await getAdminSession();

  if (!session) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (!session.roles.some((role) => requiredRoles.includes(role))) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    session,
  };
}

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error API response
 */
export function errorResponse(
  error: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}
