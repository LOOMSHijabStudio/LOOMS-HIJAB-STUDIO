import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { serverEnv } from "@/server/env";
import type { User } from "@supabase/supabase-js";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "looms_admin_session";
const SESSION_COOKIE_MAX_AGE = 86400 * 7; // 7 days
const SESSION_STORAGE_DURATION = 604800; // 7 days in seconds
const DEV_AUTH_SECRET_FALLBACK =
  "looms_super_secret_development_auth_token_key_2026_secure!";

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

export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" && !isSupabaseConfigured();
}

function getSecretKey(): string | null {
  const secret = serverEnv.AUTH_SECRET || process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    return secret && secret.length >= 32 ? secret : null;
  }
  return secret || DEV_AUTH_SECRET_FALLBACK;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL &&
      serverEnv.SUPABASE_SERVICE_ROLE_KEY &&
      serverEnv.NEXT_PUBLIC_SUPABASE_URL.startsWith("http")
  );
}

function signDevToken(payload: Record<string, unknown>): string {
  const secret = getSecretKey();
  if (!secret) {
    throw new Error("AUTH_SECRET is required to sign development sessions");
  }
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `dev.${data}.${signature}`;
}

function verifyDevToken(token: string): AdminSession | null {
  if (!isDevAuthEnabled()) return null;
  if (!token.startsWith("dev.")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [, data, signature] = parts;
  const secret = getSecretKey();
  if (!secret) return null;
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt < now) return null;

    return {
      id: payload.id || "dev-session-id",
      userId: payload.userId || "dev-owner-001",
      email: payload.email || "admin@looms.id",
      displayName: payload.displayName || "Myradine Hana Saraswati",
      isActive: true,
      expiresAt: payload.expiresAt,
      createdAt: payload.createdAt || now,
      roles: payload.roles || ["OWNER", "ADMIN", "EDITOR"],
    };
  } catch {
    return null;
  }
}

/**
 * Create a new admin session
 */
export async function createAdminSession(
  userId: string,
  email: string,
  ipAddress?: string
): Promise<{ sessionId: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_STORAGE_DURATION;

  let token: string;

  if (isSupabaseConfigured()) {
    const client = createSupabaseServiceClient();
    const tokenBuffer = crypto.randomBytes(32);
    token = tokenBuffer.toString("hex");
    const tokenHash = crypto.createHash("sha256").update(tokenBuffer).digest("hex");

    const { error } = await client.from("sessions").insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      ip_address: ipAddress || null,
    });

    if (error) {
      throw new Error(`Failed to create admin session: ${error.message}`);
    }
  } else if (isDevAuthEnabled()) {
    token = signDevToken({ userId, email, expiresAt, createdAt: now, roles: ["OWNER", "ADMIN", "EDITOR"] });
  } else {
    throw new Error("Admin authentication is not configured");
  }

  // Set secure cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    maxAge: SESSION_COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return {
    sessionId: token,
    expiresAt,
  };
}

/**
 * Verify and retrieve the current admin session
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return verifyAdminSession(sessionToken);
}

/**
 * Verify a session token and return session data
 */
export async function verifyAdminSession(
  sessionToken: string
): Promise<AdminSession | null> {
  // 1. Check if it's a signed dev session
  const devSession = verifyDevToken(sessionToken);
  if (devSession) {
    return devSession;
  }

  // 2. Otherwise verify against database if configured
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const client = createSupabaseServiceClient();
    const tokenBuffer = Buffer.from(sessionToken, "hex");
    const tokenHash = crypto.createHash("sha256").update(tokenBuffer).digest("hex");

    const { data: session, error: sessionError } = await client
      .from("sessions")
      .select(
        `
        id,
        user_id,
        expires_at,
        created_at,
        invalidated_at,
        users:user_id (
          email,
          display_name,
          is_active,
          user_roles (
            roles (
              id,
              name
            )
          )
        )
      `
      )
      .eq("token_hash", tokenHash)
      .is("invalidated_at", null)
      .single();

    if (sessionError || !session) {
      return null;
    }

    const expiresAt = new Date(session.expires_at as string).getTime();
    if (expiresAt < Date.now()) {
      await client.from("sessions").update({ invalidated_at: new Date().toISOString() }).eq("id", session.id as string);
      return null;
    }

    const user = session.users as unknown as {
      email: string;
      display_name: string | null;
      is_active: boolean;
      user_roles: Array<{ roles: { name: string } }>;
    };
    if (!user || !user.is_active) {
      return null;
    }

    const roles = (user.user_roles || []).map((ur: { roles: { name: string } }) => ur.roles.name);

    return {
      id: session.id,
      userId: session.user_id,
      email: user.email,
      displayName: user.display_name,
      isActive: user.is_active,
      expiresAt: Math.floor(expiresAt / 1000),
      createdAt: Math.floor(new Date(session.created_at).getTime() / 1000),
      roles,
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

/**
 * Invalidate an admin session
 */
export async function invalidateAdminSession(sessionId: string): Promise<void> {
  if (isSupabaseConfigured() && !sessionId.startsWith("dev.")) {
    try {
      const client = createSupabaseServiceClient();
      const tokenBuffer = Buffer.from(sessionId, "hex");
      const tokenHash = crypto.createHash("sha256").update(tokenBuffer).digest("hex");

      await client
        .from("sessions")
        .update({ invalidated_at: new Date().toISOString() })
        .eq("token_hash", tokenHash);
    } catch (e) {
      console.warn("Error invalidating database session:", e);
    }
  }

  // Clear the session cookie
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get authenticated user with their roles
 */
export async function getAuthenticatedUser(
  userId: string
): Promise<{
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  roles: string[];
} | null> {
  if (userId.startsWith("dev-") && isDevAuthEnabled()) {
    return {
      id: userId,
      email: "admin@looms.id",
      displayName: "Myradine Hana Saraswati",
      isActive: true,
      roles: ["OWNER", "ADMIN", "EDITOR"],
    };
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const client = createSupabaseServiceClient();
    const { data: user, error } = await client
      .from("users")
      .select(
        `
        id,
        email,
        display_name,
        is_active,
        user_roles (
          roles (id, name)
        )
      `
      )
      .eq("id", userId)
      .single();

    if (error || !user) {
      return null;
    }

    const typedUser = user as unknown as {
      id: string;
      email: string;
      display_name: string | null;
      is_active: boolean;
      user_roles: Array<{ roles: { name: string } }>;
    };

    const roles = (typedUser.user_roles || []).map((ur: { roles: { name: string } }) => ur.roles.name);

    return {
      id: user.id,
      email: typedUser.email,
      displayName: typedUser.display_name,
      isActive: typedUser.is_active,
      roles,
    } as const;
  } catch {
    return null;
  }
}

/**
 * Authenticate a user with email and password
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ userId: string; user: User } | null> {
  if (!isSupabaseConfigured()) {
    if (!isDevAuthEnabled()) {
      return null;
    }
    if (password === "hana0987" || password === "AdminLooms123!") {
      const mockUser = {
        id: "dev-owner-001",
        email,
        app_metadata: {},
        user_metadata: { display_name: "Myradine Hana Saraswati" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;
      return { userId: mockUser.id, user: mockUser };
    }
    return null;
  }

  try {
    const client = createSupabaseServiceClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return null;
    }

    return {
      userId: data.user.id,
      user: data.user,
    };
  } catch {
    return null;
  }
}

/**
 * Clear the admin session cookie
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
