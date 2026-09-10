"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface AdminNavProps {
  roles: string[];
}

interface NavItem {
  href: string;
  label: string;
  roles: string[];
  exact?: boolean;
  placement?: "NEW_ARRIVALS" | "BEST_SELLERS";
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
    exact: true,
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
    href: "/admin/collection",
    label: "Collection",
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/admin/products?placement=NEW_ARRIVALS",
    label: "New Arrivals",
    roles: ["OWNER", "ADMIN", "EDITOR"],
    placement: "NEW_ARRIVALS",
  },
  {
    href: "/admin/products?placement=BEST_SELLERS",
    label: "Best Sellers",
    roles: ["OWNER", "ADMIN", "EDITOR"],
    placement: "BEST_SELLERS",
  },
  {
    href: "/admin/looms-society",
    label: "Looms Society",
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
    roles: ["OWNER"],
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    roles: ["OWNER", "ADMIN"],
  },
];

function hasRole(roles: string[], allowedRoles: string[]) {
  return roles.some((role) => allowedRoles.includes(role));
}

export function AdminNav({ roles }: AdminNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPlacement = searchParams.get("placement");

  const visibleItems = navItems.filter((item) =>
    hasRole(roles, item.roles)
  );

  function isActive(item: NavItem) {
    // New Arrivals
    if (item.placement === "NEW_ARRIVALS") {
      return (
        pathname === "/admin/products" &&
        currentPlacement === "NEW_ARRIVALS"
      );
    }

    // Best Sellers
    if (item.placement === "BEST_SELLERS") {
      return (
        pathname === "/admin/products" &&
        currentPlacement === "BEST_SELLERS"
      );
    }

    // Produk utama
    if (item.href === "/admin/products") {
      return (
        pathname === "/admin/products" &&
        !currentPlacement
      );
    }

    // Dashboard
    if (item.exact) {
      return pathname === item.href;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const active = isActive(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "block rounded-xl px-4 py-3 text-sm font-medium transition",
              active
                ? "bg-white text-black shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
