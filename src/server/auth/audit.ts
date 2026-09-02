import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAdminSession, isSupabaseConfigured } from "@/server/auth/session";

export type AuditAction =
  | "auth.login_success"
  | "auth.login_failure"
  | "auth.logout"
  | "admin.role_changed"
  | "admin.created"
  | "admin.disabled"
  | "admin.permission_changed"
  | "admin.product_created"
  | "admin.product_updated"
  | "admin.product_deleted"
  | "admin.price_changed"
  | "admin.stock_changed"
  | "admin.product_image_uploaded"
  | "admin.category_created"
  | "admin.category_updated"
  | "admin.category_deleted"
  | "admin.collection_created"
  | "admin.collection_updated"
  | "admin.collection_deleted"
  | "admin.collection_products_added"
  | "admin.collection_products_reordered"
  | "admin.collection_product_removed"
  | "admin.order_created"
  | "admin.order_status_changed";

export interface AuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface StoredAuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// In-memory fallback for local audit logs
export const memoryAuditLogs: StoredAuditLog[] = [];

/**
 * Log an audit event
 * Automatically sanitizes metadata to remove sensitive data
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  const session = await getAdminSession();

  // Sanitize metadata - remove any sensitive fields
  const metadata = params.metadata || {};
  const sanitized = { ...metadata } as Record<string, unknown>;

  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.api_key;
  delete sanitized.refresh_token;
  delete sanitized.access_token;

  const logEntry: StoredAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actor_user_id: session?.userId || null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    metadata: sanitized,
    ip_address: params.ipAddress || null,
    created_at: new Date().toISOString(),
  };

  memoryAuditLogs.unshift(logEntry);
  if (memoryAuditLogs.length > 500) {
    memoryAuditLogs.pop();
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const client = createSupabaseServiceClient();
    await client.from("audit_logs").insert({
      actor_user_id: logEntry.actor_user_id,
      action: logEntry.action,
      entity_type: logEntry.entity_type,
      entity_id: logEntry.entity_id,
      metadata: logEntry.metadata,
      ip_address: logEntry.ip_address,
    });
  } catch (error) {
    console.error("Audit logging error:", error);
  }
}

/**
 * Log a successful admin login
 */
export async function logLoginSuccess(
  userId: string,
  email: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: "auth.login_success",
    entityType: "user",
    entityId: userId,
    metadata: {
      email,
    },
    ipAddress,
  });
}

/**
 * Log a failed admin login attempt
 */
export async function logLoginFailure(
  email: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: "auth.login_failure",
    entityType: "user",
    metadata: {
      email,
    },
    ipAddress,
  });
}

/**
 * Log an admin logout
 */
export async function logLogout(ipAddress?: string): Promise<void> {
  const session = await getAdminSession();
  if (!session) {
    return;
  }

  await logAuditEvent({
    action: "auth.logout",
    entityType: "user",
    entityId: session.userId,
    ipAddress,
  });
}

/**
 * Log when an admin's role is changed
 */
export async function logRoleChange(
  userId: string,
  oldRole: string,
  newRole: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: "admin.role_changed",
    entityType: "user",
    entityId: userId,
    metadata: {
      oldRole,
      newRole,
    },
    ipAddress,
  });
}

/**
 * Log when an admin user is created
 */
export async function logAdminCreated(
  userId: string,
  email: string,
  role: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: "admin.created",
    entityType: "user",
    entityId: userId,
    metadata: {
      email,
      role,
    },
    ipAddress,
  });
}

/**
 * Log when an admin user is disabled
 */
export async function logAdminDisabled(
  userId: string,
  email: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: "admin.disabled",
    entityType: "user",
    entityId: userId,
    metadata: {
      email,
    },
    ipAddress,
  });
}

export async function getAuditLogs(
  entityType?: string,
  entityId?: string,
  limit: number = 50
): Promise<StoredAuditLog[]> {
  if (!isSupabaseConfigured()) {
    let filtered = memoryAuditLogs;
    if (entityType) {
      filtered = filtered.filter((l) => l.entity_type === entityType);
    }
    if (entityId) {
      filtered = filtered.filter((l) => l.entity_id === entityId);
    }
    return filtered.slice(0, limit);
  }

  try {
    const client = createSupabaseServiceClient();

    let query = client
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error("Audit log retrieval error:", error);
      return memoryAuditLogs.slice(0, limit);
    }

    return (logs as StoredAuditLog[]) || [];
  } catch {
    return memoryAuditLogs.slice(0, limit);
  }
}
