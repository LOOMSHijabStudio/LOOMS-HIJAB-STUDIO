"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { Icon } from "@/components/ui/icons";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?edit=new", label: "New Arrivals" },
  { href: "/shop?collection=essential", label: "Collections" },
  { href: "/shop?edit=best", label: "Best Sellers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { itemCount, setOpen } = useCart();
  const { wishlist } = useWishlist();

  return (
    <>
      <div className="bg-looms-teal px-3 py-2 text-center text-[9px] font-medium leading-4 tracking-[0.09em] text-looms-cream sm:text-[10px] sm:tracking-[0.14em]">
        COMPLIMENTARY SHIPPING ON ORDERS OVER IDR 500.000
      </div>

      <header className="border-b border-looms-teal/15 bg-looms-cream">
        <nav
          className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-3 sm:px-5 lg:h-20 lg:px-10"
          aria-label="Primary navigation"
        >
          {/* MOBILE LEFT */}
          <div className="flex min-w-0 flex-1 items-center gap-1 lg:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
              className="grid h-11 w-11 place-items-center"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>

            <Link
              href="/shop#catalog-search"
              aria-label="Search products"
              className="grid h-11 w-11 place-items-center"
            >
              <Icon name="search" className="h-5 w-5" />
            </Link>
          </div>

          {/* LOGO */}
          <Link
            href="/"
            className="shrink-0 font-display text-[1.65rem] tracking-[0.12em] text-looms-teal sm:text-3xl sm:tracking-[0.18em] lg:text-4xl"
          >
            LOOMS
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden flex-1 justify-center gap-6 lg:flex">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs tracking-[0.08em] text-looms-teal hover:text-looms-gray"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
            {/* SEARCH */}
            <Link
              href="/shop#catalog-search"
              aria-label="Search products"
              className="hidden lg:grid lg:h-11 lg:w-11 lg:place-items-center"
            >
              <Icon name="search" className="h-5 w-5" />
            </Link>

            {/* WISHLIST */}
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlist.length} items`}
              className="relative hidden lg:grid lg:h-11 lg:w-11 lg:place-items-center"
            >
              {wishlist.length > 0 ? (
                <span
                  aria-hidden="true"
                  className="text-lg leading-none text-red-600"
                >
                  ♥
                </span>
              ) : (
                <Icon
                  name="heart"
                  className="h-5 w-5"
                />
              )}

              {wishlist.length > 0 && (
                <span className="absolute right-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-looms-teal text-[9px] text-looms-cream">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* CART */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`Open cart, ${itemCount} items`}
              className="relative grid h-11 w-11 place-items-center"
            >
              <Icon name="bag" className="h-5 w-5" />

              {itemCount > 0 && (
                <span className="absolute right-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-looms-teal text-[9px] text-looms-cream">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-looms-teal/35"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="relative flex h-full w-[88%] max-w-sm flex-col bg-looms-cream px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl tracking-[0.14em]">
                LOOMS
              </span>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMenuOpen(false)}
                className="grid h-11 w-11 place-items-center"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-10 flex flex-col">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-looms-teal/15 py-4 text-sm tracking-[0.08em]"
                >
                  {link.label}
                </Link>
              ))}

              {/* MOBILE WISHLIST */}
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between border-b border-looms-teal/15 py-4 text-sm tracking-[0.08em]"
              >
                <span>WISHLIST</span>

                {wishlist.length > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-looms-teal px-1 text-[9px] text-looms-cream">
                    {wishlist.length}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
