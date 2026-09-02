/**
 * Edge-compatible session validation for middleware.
 * Full session verification (DB lookup) happens server-side in layout/API routes.
 */

export const SESSION_COOKIE_NAME = "looms_admin_session";

const DEV_AUTH_SECRET_FALLBACK =
  "looms_super_secret_development_auth_token_key_2026_secure!";

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" && !isSupabaseConfigured();
}

function getSecretKey(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    return secret && secret.length >= 32 ? secret : null;
  }
  return secret || DEV_AUTH_SECRET_FALLBACK;
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecodeToString(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

async function verifyDevTokenEdge(token: string): Promise<boolean> {
  if (!isDevAuthEnabled()) return false;
  if (!token.startsWith("dev.")) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [, data, signature] = parts;
  const secret = getSecretKey();
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expectedSig = base64urlEncode(sigBuffer);

  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(base64urlDecodeToString(data)) as {
      expiresAt?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    return typeof payload.expiresAt === "number" && payload.expiresAt >= now;
  } catch {
    return false;
  }
}

function looksLikeDbToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}

export type EdgeSessionCheck = "valid" | "invalid" | "needs-server-verification";

/**
 * Lightweight session check for middleware.
 * - Dev tokens: fully verified at the edge (development only)
 * - DB tokens: format check only; server validates against Supabase
 * - Everything else: invalid
 */
export async function checkSessionCookie(
  token: string | undefined
): Promise<EdgeSessionCheck> {
  if (!token) return "invalid";

  if (token.startsWith("dev.")) {
    return (await verifyDevTokenEdge(token)) ? "valid" : "invalid";
  }

  if (looksLikeDbToken(token)) {
    return isSupabaseConfigured() ? "needs-server-verification" : "invalid";
  }

  return "invalid";
}

export function clearSessionCookie(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
  );
}
