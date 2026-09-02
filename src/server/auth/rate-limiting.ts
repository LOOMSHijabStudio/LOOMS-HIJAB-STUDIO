import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW = 900; // 15 minutes in seconds

// In-memory fallback for local dev rate limiting
const memoryAttempts = new Map<string, Array<{ timestamp: number; success: boolean }>>();

function cleanOldMemoryAttempts(key: string, now: number) {
  const attempts = memoryAttempts.get(key) || [];
  const valid = attempts.filter((a) => now - a.timestamp < LOGIN_ATTEMPT_WINDOW * 1000);
  if (valid.length === 0) {
    memoryAttempts.delete(key);
  } else {
    memoryAttempts.set(key, valid);
  }
  return valid;
}

/**
 * Check if an email/IP combination is rate limited
 */
export async function isRateLimited(
  email: string,
  ipAddress: string
): Promise<boolean> {
  const key = `${email.toLowerCase()}:${ipAddress}`;
  const now = Date.now();

  if (!isSupabaseConfigured()) {
    const valid = cleanOldMemoryAttempts(key, now);
    const failed = valid.filter((a) => !a.success).length;
    return failed >= MAX_LOGIN_ATTEMPTS;
  }

  try {
    const client = createSupabaseServiceClient();
    const windowStart = new Date(now - LOGIN_ATTEMPT_WINDOW * 1000);

    const { data: attempts, error } = await client
      .from("login_attempts")
      .select("id")
      .eq("email", email)
      .eq("ip_address", ipAddress)
      .eq("success", false)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      console.error("Rate limit check error:", error);
      return false;
    }

    return (attempts?.length || 0) >= MAX_LOGIN_ATTEMPTS;
  } catch {
    return false;
  }
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean
): Promise<void> {
  const key = `${email.toLowerCase()}:${ipAddress}`;
  const now = Date.now();

  const attempts = memoryAttempts.get(key) || [];
  attempts.push({ timestamp: now, success });
  memoryAttempts.set(key, attempts);

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const client = createSupabaseServiceClient();
    await client.from("login_attempts").insert({
      email: email.toLowerCase(),
      ip_address: ipAddress,
      success,
    });
  } catch (error) {
    console.error("Login attempt recording error:", error);
  }
}

/**
 * Get remaining login attempts for an email/IP
 */
export async function getRemainingAttempts(
  email: string,
  ipAddress: string
): Promise<number> {
  const key = `${email.toLowerCase()}:${ipAddress}`;
  const now = Date.now();

  if (!isSupabaseConfigured()) {
    const valid = cleanOldMemoryAttempts(key, now);
    const failed = valid.filter((a) => !a.success).length;
    return Math.max(0, MAX_LOGIN_ATTEMPTS - failed);
  }

  try {
    const client = createSupabaseServiceClient();
    const windowStart = new Date(now - LOGIN_ATTEMPT_WINDOW * 1000);

    const { data: attempts, error } = await client
      .from("login_attempts")
      .select("id")
      .eq("email", email)
      .eq("ip_address", ipAddress)
      .eq("success", false)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      return MAX_LOGIN_ATTEMPTS;
    }

    return Math.max(0, MAX_LOGIN_ATTEMPTS - (attempts?.length || 0));
  } catch {
    return MAX_LOGIN_ATTEMPTS;
  }
}
