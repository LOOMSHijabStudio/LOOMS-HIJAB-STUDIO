import "server-only";

export const ADMIN_USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const ADMIN_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function normalizeAdminUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAdminUsername(value: string): boolean {
  return ADMIN_USERNAME_PATTERN.test(normalizeAdminUsername(value));
}

export function isValidAdminEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ADMIN_EMAIL_PATTERN.test(normalized);
}

export function isEmailIdentifier(value: string): boolean {
  return value.includes("@");
}

export function normalizeAdminIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAdminIdentifier(value: string): boolean {
  const normalized = normalizeAdminIdentifier(value);
  if (isEmailIdentifier(normalized)) {
    return isValidAdminEmail(normalized);
  }
  return isValidAdminUsername(normalized);
}
