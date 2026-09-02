import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { clearAdminSessionCookie, getAdminSession } from "@/server/auth/session";

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin");
  }

  const cookieStore = await cookies();
  if (cookieStore.get("looms_admin_session")) {
    await clearAdminSessionCookie();
  }

  return children;
}
