import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { clearAdminSessionCookie, getAdminSession } from "@/server/auth/session";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    const cookieStore = await cookies();
    if (cookieStore.get("looms_admin_session")) {
      await clearAdminSessionCookie();
    }
    redirect("/admin/login");
  }

  // Ensure user has at least one valid admin role
  const validRoles = ["OWNER", "ADMIN", "EDITOR"];
  const hasValidRole = session.roles.some((role) => validRoles.includes(role));
  if (!hasValidRole) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-looms-teal text-looms-cream flex flex-col shrink-0 shadow-lg">
        {/* Brand Header */}
        <div className="p-6 border-b border-looms-teal/30">
          <Link href="/admin" className="block group">
            <h1 className="font-display text-2xl tracking-[0.14em] text-looms-cream group-hover:opacity-90 transition-opacity">
              LOOMS
            </h1>
            <p className="text-xs text-looms-cream/70 mt-1 uppercase tracking-wider font-medium">
              Admin Panel
            </p>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <AdminNav roles={session.roles} />
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-looms-teal/30 bg-looms-teal/20">
          <div className="text-xs text-looms-cream/90 mb-3">
            <p className="font-medium truncate">
              {session.displayName || session.email}
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {session.roles.map((role) => (
                <span
                  key={role}
                  className="inline-block bg-looms-cream/20 text-looms-cream px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
              Management Portal
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/"
              target="_blank"
              className="text-looms-teal hover:underline flex items-center gap-1 font-medium"
            >
              <span>Lihat Toko Publik</span>
              <span>↗</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
