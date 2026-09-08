"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/products",
    label: "Produk",
  },
  {
    href: "/admin/home",
    label: "Home",
  },
  {
    href: "/admin/shop",
    label: "Shop",
  },
  {
    href: "/admin/new-arrivals",
    label: "New Arrivals",
  },
  {
    href: "/admin/collection",
    label: "Collection",
  },
  {
    href: "/admin/best-sellers",
    label: "Best Sellers",
  },
  {
    href: "/admin/orders",
    label: "Pesanan",
  },
  {
    href: "/admin/categories",
    label: "Kategori",
  },
  {
    href: "/admin/appearance",
    label: "Tampilan Toko",
  },
  {
    href: "/admin/about",
    label: "About Us",
  },
  {
    href: "/admin/users",
    label: "Admin Users",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
  },
];

export function AdminNav({
  roles,
}: {
  roles: string[];
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const isActive =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href ||
              pathname.startsWith(
                `${link.href}/`
              );

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-lg px-4 py-3 text-sm transition ${
              isActive
                ? "bg-white/10 font-medium text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
