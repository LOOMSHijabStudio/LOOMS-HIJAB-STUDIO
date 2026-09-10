"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavProps {
  roles: string[];
}

interface NavItem {
  href: string;
  label: string;
  roles: string[];
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    roles: ["OWNER", "ADMIN", "EDITOR"],
    exact: true,
  },

  {
    href: "/admin/products",
    label: "Produk",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },

  {
    href: "/admin/orders",
    label: "Pesanan",
    roles: ["OWNER", "ADMIN"],
  },

  {
    href: "/admin/categories",
    label: "Kategori",
    roles: ["OWNER", "ADMIN"],
  },

  /*
   * ==========================================
   * COLLECTION
   * ==========================================
   */
  {
    href: "/admin/collections",
    label: "Collection",
    roles: ["OWNER", "ADMIN"],
  },

  /*
   * ==========================================
   * NEW ARRIVALS
   * ==========================================
   */
  {
    href: "/admin/products?placement=NEW_ARRIVALS",
    label: "New Arrivals",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },

  /*
   * ==========================================
   * BEST SELLERS
   * ==========================================
   */
  {
    href: "/admin/products?placement=BEST_SELLERS",
    label: "Best Sellers",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },

  /*
   * ==========================================
   * LOOMS SOCIETY
   * ==========================================
   */
  {
    href: "/admin/looms-society",
    label: "Looms Society",
    roles: ["OWNER", "ADMIN"],
  },

  {
    href: "/admin/appearance",
    label: "Tampilan Toko",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },

  {
    href: "/admin/users",
    label: "Admin Users",
    roles: ["OWNER"],
  },

  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    roles: ["OWNER", "ADMIN"],
  },
];

export function AdminNav({
  roles,
}: AdminNavProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) =>
      item.roles.some((role) =>
        roles.includes(role)
      )
  );

  return (
    <nav className="mt-6 space-y-1 px-3">
      {filteredItems.map((item) => {
        /*
         * Untuk item dengan query string,
         * active state berdasarkan pathname saja.
         */
        const itemPath =
          item.href.split("?")[0];

        const isActive =
          item.exact
            ? pathname === itemPath
            : pathname === itemPath ||
              pathname.startsWith(
                `${itemPath}/`
              );

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-looms-teal shadow-sm font-semibold"
                : "text-looms-cream/80 hover:bg-looms-teal/70 hover:text-looms-cream"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
