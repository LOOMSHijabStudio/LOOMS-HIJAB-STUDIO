import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/server/auth/session";

/**
 * Check if the current user has a specific role
 */
export async function userHasRole(requiredRole: string): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) {
    return false;
  }

  return session.roles.includes(requiredRole);
}

/**
 * Check if the current user has any of the specified roles
 */
export async function userHasAnyRole(roles: string[]): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) {
    return false;
  }

  return roles.some((role) => session.roles.includes(role));
}

/**
 * Check if the current user has all of the specified roles
 */
export async function userHasAllRoles(roles: string[]): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) {
    return false;
  }

  return roles.every((role) => session.roles.includes(role));
}

/**
 * Check if the current user has a specific permission
 */
export async function userHasPermission(
  permissionCode: string
): Promise<boolean> {
  const session = await getAdminSession();
  if (!session || !session.userId) {
    return false;
  }

  const client = createSupabaseServiceClient();

  // Use the database function to check permission
  const { data, error } = await client.rpc("user_has_permission", {
    p_user_id: session.userId,
    p_permission_code: permissionCode,
  });

  if (error) {
    console.error("Permission check error:", error);
    return false;
  }

  return data === true;
}

/**
 * Get all permissions for the current user
 */
export async function getUserPermissions(): Promise<string[]> {
  const session = await getAdminSession();
  if (!session || !session.userId) {
    return [];
  }

  const client = createSupabaseServiceClient();

  // Get user roles
  const { data: userRoles, error: urError } = await client
    .from("user_roles")
    .select("role_id")
    .eq("user_id", session.userId);

  if (urError || !userRoles) {
    console.error("User roles retrieval error:", urError);
    return [];
  }

  const roleIds = userRoles.map((ur: { role_id: string }) => ur.role_id);
  if (roleIds.length === 0) {
    return [];
  }

  // Get permissions for those roles
  const { data: rolePerms, error: rpError } = await client
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds);

  if (rpError || !rolePerms) {
    console.error("Role permissions retrieval error:", rpError);
    return [];
  }

  const permIds = rolePerms.map((rp: { permission_id: string }) => rp.permission_id);
  if (permIds.length === 0) {
    return [];
  }

  // Get permission codes
  const { data: permissions, error } = await client
    .from("permissions")
    .select("code")
    .in("id", permIds);

  if (error) {
    console.error("Permission retrieval error:", error);
    return [];
  }

  return (permissions || []).map((p: { code: string }) => p.code);
}

/**
 * Ensure user is authenticated and has required role
 * Throws error if not authorized
 */
export async function requireRole(role: string): Promise<void> {
  const hasRole = await userHasRole(role);
  if (!hasRole) {
    throw new Error("UNAUTHORIZED");
  }
}

/**
 * Ensure user is authenticated and has required permission
 * Throws error if not authorized
 */
export async function requirePermission(permissionCode: string): Promise<void> {
  const hasPermission = await userHasPermission(permissionCode);
  if (!hasPermission) {
    throw new Error("UNAUTHORIZED");
  }
}

/**
 * Check if user is OWNER
 */
export async function isOwner(): Promise<boolean> {
  return userHasRole("OWNER");
}

/**
 * Check if user is ADMIN or OWNER
 */
export async function isAdmin(): Promise<boolean> {
  return userHasAnyRole(["OWNER", "ADMIN"]);
}

/**
 * Check if user is EDITOR or higher
 */
export async function isEditor(): Promise<boolean> {
  return userHasAnyRole(["OWNER", "ADMIN", "EDITOR"]);
}

/**
 * Get current session for authorization checks
 */
export async function getCurrentSession() {
  return getAdminSession();
}

/**
 * Require authentication
 */
export async function requireAuth(): Promise<void> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
}
