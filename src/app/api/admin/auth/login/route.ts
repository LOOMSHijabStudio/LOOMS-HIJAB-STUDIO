import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  createAdminSession,
  getAuthenticatedUser,
  isDevAuthEnabled,
  isSupabaseConfigured,
} from "@/server/auth/session";
import {
  isRateLimited,
  recordLoginAttempt,
  getRemainingAttempts,
} from "@/server/auth/rate-limiting";
import {
  logLoginSuccess,
  logLoginFailure,
} from "@/server/auth/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  isValidAdminIdentifier,
  normalizeAdminIdentifier,
  isEmailIdentifier,
} from "@/server/auth/username";

export const dynamic = "force-dynamic";

interface LoginRequestBody {
  identifier?: string;
  username?: string;
  email?: string;
  password?: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  redirectUrl?: string;
  remainingAttempts?: number;
  error?: string;
}

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

export async function POST(
  request: NextRequest
): Promise<NextResponse<LoginResponse>> {
  try {
    // Parse request body
    let body: LoginRequestBody = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah.",
        },
        { status: 400 }
      );
    }

    const rawIdentifier = body.identifier || body.username || body.email;
    const { password } = body;

    // Validate input presence
    if (!rawIdentifier || typeof rawIdentifier !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah.",
        },
        { status: 400 }
      );
    }

    const normalizedIdentifier = normalizeAdminIdentifier(rawIdentifier);
    if (!isValidAdminIdentifier(normalizedIdentifier)) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah.",
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 1 || password.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah.",
        },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);

    // Check rate limiting
    const rateLimited = await isRateLimited(normalizedIdentifier, ipAddress);
    if (rateLimited) {
      const remaining = await getRemainingAttempts(normalizedIdentifier, ipAddress);
      await logLoginFailure(normalizedIdentifier, ipAddress);

      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak percobaan login gagal. Silakan coba lagi nanti.",
          remainingAttempts: Math.max(0, remaining),
        },
        { status: 429 }
      );
    }

    // Dev authentication — only when Supabase is not configured AND running locally
    if (!isSupabaseConfigured()) {
      if (!isDevAuthEnabled()) {
        return NextResponse.json(
          {
            success: false,
            error: "Admin authentication belum dikonfigurasi. Hubungi administrator.",
          },
          { status: 503 }
        );
      }

      const isValidDevCreds =
        (normalizedIdentifier === "hana909" || normalizedIdentifier === "admin@looms.id") &&
        (password === "hana0987" || password === "AdminLooms123!");

      if (!isValidDevCreds) {
        await recordLoginAttempt(normalizedIdentifier, ipAddress, false);
        await logLoginFailure(normalizedIdentifier, ipAddress);
        const remaining = await getRemainingAttempts(normalizedIdentifier, ipAddress);

        return NextResponse.json(
          {
            success: false,
            error: "Email atau password salah.",
            remainingAttempts: remaining,
          },
          { status: 401 }
        );
      }

      // Success dev login
      await createAdminSession("dev-owner-001", "admin@looms.id", ipAddress);
      await recordLoginAttempt(normalizedIdentifier, ipAddress, true);
      await logLoginSuccess("dev-owner-001", "admin@looms.id", ipAddress);

      return NextResponse.json(
        {
          success: true,
          message: "Login berhasil",
          redirectUrl: "/admin",
        },
        { status: 200 }
      );
    }

    // 2. If Supabase IS configured, authenticate via Supabase
    const lookupClient = createSupabaseServiceClient();
    const isEmail = isEmailIdentifier(normalizedIdentifier);

    let accountQuery = lookupClient
      .from("users")
      .select("id, email, is_active")
      .eq("is_active", true);

    if (isEmail) {
      accountQuery = accountQuery.ilike("email", normalizedIdentifier);
    } else {
      accountQuery = accountQuery.ilike("username", normalizedIdentifier);
    }

    const { data: account, error: lookupError } = await accountQuery.maybeSingle();

    if (lookupError) {
      console.error("Admin user lookup error:", lookupError);
    }

    // Authenticate with Supabase Auth using the resolved email
    const authResult = account?.email
      ? await authenticateAdmin(account.email, password)
      : null;

    if (!authResult || !account) {
      // Log failed attempt
      await recordLoginAttempt(normalizedIdentifier, ipAddress, false);
      await logLoginFailure(normalizedIdentifier, ipAddress);

      const remaining = await getRemainingAttempts(normalizedIdentifier, ipAddress);

      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah.",
          remainingAttempts: remaining,
        },
        { status: 401 }
      );
    }

    // Verify user is an admin (has at least one admin role)
    const user = await getAuthenticatedUser(authResult.userId);
    if (!user || !user.isActive) {
      await recordLoginAttempt(normalizedIdentifier, ipAddress, false);
      await logLoginFailure(normalizedIdentifier, ipAddress);

      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah.",
        },
        { status: 401 }
      );
    }

    // Check if user has any valid admin roles
    const validRoles = ["OWNER", "ADMIN", "EDITOR"];
    const hasAdminRole = user.roles && user.roles.some((role) => validRoles.includes(role));
    if (!hasAdminRole) {
      await recordLoginAttempt(normalizedIdentifier, ipAddress, false);
      await logLoginFailure(normalizedIdentifier, ipAddress);

      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah.",
        },
        { status: 403 }
      );
    }

    // Create session
    await createAdminSession(
      authResult.userId,
      account.email,
      ipAddress
    );

    // Log successful login
    await recordLoginAttempt(normalizedIdentifier, ipAddress, true);
    await logLoginSuccess(authResult.userId, account.email, ipAddress);

    return NextResponse.json(
      {
        success: true,
        message: "Login berhasil",
        redirectUrl: "/admin",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Email atau password salah.",
      },
      { status: 500 }
    );
  }
}
