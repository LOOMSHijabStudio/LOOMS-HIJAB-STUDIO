import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { memoryAuditLogs } from "@/server/auth/audit";
import { isSupabaseConfigured } from "@/server/auth/session";

export const dynamic = "force-dynamic";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id?: string | null;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface AuditLogsResponse {
  success: boolean;
  logs?: AuditLog[];
  total?: number;
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<AuditLogsResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<AuditLogsResponse>;
    }

    // Check authorization - only ADMIN or OWNER can view full audit logs
    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    if (!isSupabaseConfigured()) {
      let filtered = [...memoryAuditLogs];
      if (action) {
        filtered = filtered.filter((l) => l.action === action);
      }
      if (entityType) {
        filtered = filtered.filter((l) => l.entity_type === entityType);
      }
      if (entityId) {
        filtered = filtered.filter((l) => l.entity_id === entityId);
      }

      if (filtered.length === 0) {
        filtered = [
          {
            id: "audit-demo-1",
            action: "auth.login_success",
            entity_type: "user",
            entity_id: "dev-owner-001",
            actor_user_id: "dev-owner-001",
            ip_address: "127.0.0.1",
            created_at: new Date().toISOString(),
            metadata: { email: "admin@looms.id", note: "Mode pengembangan lokal" },
          },
        ];
      }

      const skip = (page - 1) * pageSize;
      const paginated = filtered.slice(skip, skip + pageSize);

      return NextResponse.json({
        success: true,
        logs: paginated,
        total: filtered.length,
      });
    }

    const client = createSupabaseServiceClient();

    const days = Math.min(90, parseInt(searchParams.get("days") || "30"));
    const skip = (page - 1) * pageSize;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = client
      .from("audit_logs")
      .select("*", { count: "exact" });

    if (action) {
      query = query.eq("action", action);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    query = query.gte("created_at", startDate.toISOString());

    const { data: logs, error, count } = await query
      .order("created_at", { ascending: false })
      .range(skip, skip + pageSize - 1);

    if (error) {
      console.error("Audit logs fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
    });
  } catch (error) {
    console.error("Audit logs endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
