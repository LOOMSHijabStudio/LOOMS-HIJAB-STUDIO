"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminRole = "OWNER" | "ADMIN" | "EDITOR";

type NavItem = {
  href: string;
  label: string;
  roles: AdminRole[];
};

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/products",
    label: "Produk",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/home",
    label: "Home",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/shop",
    label: "Shop",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/new-arrivals",
    label: "New Arrivals",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/collection",
    label: "Collection",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/best-sellers",
    label: "Best Sellers",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/orders",
    label: "Pesanan",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/categories",
    label: "Kategori",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/appearance",
    label: "Tampilan Toko",
    roles: ["OWNER", "ADMIN", "EDITOR"],
  },
  {
    href: "/admin/users",
    label: "Admin Users",
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    roles: ["OWNER", "ADMIN"],
  },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-looms-teal text-white"
                : "text-gray-700 hover:bg-gray-100 hover:text-looms-teal"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
