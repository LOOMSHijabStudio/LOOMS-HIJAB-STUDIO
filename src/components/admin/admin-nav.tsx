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
  {
    href: "/admin/collections",
    label: "Koleksi",
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

export function AdminNav({ roles }: AdminNavProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role))
  );

  return (
    <nav className="mt-6 space-y-1 px-3">
      {filteredItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-looms-cream text-looms-teal shadow-sm font-semibold"
                : "text-looms-cream/80 hover:text-looms-cream hover:bg-looms-teal/70"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
