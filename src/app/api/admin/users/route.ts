import { NextResponse } from "next/server";
import { verifyAdminRequestWithRole } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authCheck = await verifyAdminRequestWithRole("OWNER");
    if (!authCheck.success) {
      return authCheck.response;
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        users: [
          {
            id: "dev-owner-001",
            email: "admin@looms.id",
            username: "hana909",
            displayName: "Myradine Hana Saraswati",
            isActive: true,
            createdAt: new Date().toISOString(),
            roles: ["OWNER", "ADMIN", "EDITOR"],
          },
        ],
      });
    }

    const client = createSupabaseServiceClient();

    const { data: users, error } = await client
      .from("users")
      .select(`
        id,
        email,
        username,
        display_name,
        is_active,
        created_at,
        updated_at,
        user_roles (
          roles (
            id,
            name,
            description
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin users fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Gagal mengambil data admin" },
        { status: 500 }
      );
    }

    // Format output
    const formattedUsers = (users || []).map((u) => {
      const typedUserRoles = (u.user_roles || []) as unknown as Array<{
        roles: { id: string; name: string; description: string };
      }>;
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.display_name,
        isActive: u.is_active,
        createdAt: u.created_at,
        roles: typedUserRoles.map((ur) => ur.roles?.name).filter(Boolean),
      };
    });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Admin users endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
