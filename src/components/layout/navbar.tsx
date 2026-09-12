"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { Icon } from "@/components/ui/icons";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/collection", label: "Collection" },
  { href: "/best-sellers", label: "Best Sellers" },
  { href: "/looms-society", label: "Looms Society" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { itemCount, setOpen } = useCart();
  const { wishlist } = useWishlist();

  return (
    <>
      {/* =====================================================
          ANNOUNCEMENT BAR
          ===================================================== */}
      <div className="relative z-[100] bg-looms-teal px-3 py-2 text-center text-[9px] font-medium leading-4 tracking-[0.09em] text-looms-cream sm:text-[10px] sm:tracking-[0.14em]">
        COMPLIMENTARY SHIPPING ON ORDERS OVER IDR 500.000
      </div>

      {/* =====================================================
          NAVBAR
          ===================================================== */}
      <header className="relative z-[100] border-b border-looms-teal/15 bg-looms-cream">
        <nav
          className="
            mx-auto
            flex
            h-16
            w-full
            max-w-[1440px]
            items-center
            px-3
            sm:px-5
            lg:h-20
            lg:px-8
            xl:px-10
          "
          aria-label="Primary navigation"
        >
          {/* =================================================
              MOBILE LEFT
              ================================================= */}
          <div className="flex min-w-0 flex-1 items-center gap-1 lg:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
              className="grid h-11 w-11 shrink-0 place-items-center"
            >
              <Icon
                name="menu"
                className="h-5 w-5"
              />
            </button>

            <Link
              href="/shop#catalog-search"
              aria-label="Search products"
              className="grid h-11 w-11 shrink-0 place-items-center"
            >
              <Icon
                name="search"
                className="h-5 w-5"
              />
            </Link>
          </div>

          {/* =================================================
              LOGO
              ================================================= */}
          <Link
            href="/"
            aria-label="LOOMS Home"
            className="
              relative
              z-[101]
              shrink-0
              whitespace-nowrap
              font-display
              text-[1.65rem]
              tracking-[0.12em]
              text-looms-teal
              sm:text-3xl
              sm:tracking-[0.18em]
              lg:text-4xl
            "
          >
            LOOMS
          </Link>

          {/* =================================================
              DESKTOP NAV
              ================================================= */}
          <div
            className="
              hidden
              min-w-0
              flex-1
              items-center
              justify-center
              gap-4
              px-4
              lg:flex
              xl:gap-5
              xl:px-6
            "
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="
                  relative
                  z-[101]
                  block
                  shrink-0
                  whitespace-nowrap
                  pointer-events-auto
                  text-[12px]
                  font-medium
                  tracking-[0.05em]
                  text-looms-teal
                  transition-colors
                  hover:text-looms-gray
                  xl:text-[13px]
                "
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* =================================================
              RIGHT ACTIONS
              ================================================= */}
          <div
            className="
              relative
              z-[101]
              flex
              shrink-0
              items-center
              justify-end
              gap-1
              pointer-events-auto
            "
          >
            {/* SEARCH */}
            <Link
              href="/shop#catalog-search"
              aria-label="Search products"
              className="
                relative
                z-[101]
                grid
                h-11
                w-11
                shrink-0
                place-items-center
                pointer-events-auto
              "
            >
              <Icon
                name="search"
                className="h-5 w-5"
              />
            </Link>

            {/* WISHLIST */}
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlist.length} items`}
              className="
                relative
                z-[101]
                grid
                h-11
                w-11
                shrink-0
                place-items-center
                pointer-events-auto
              "
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
                <span
                  className="
                    absolute
                    right-0
                    top-0
                    grid
                    h-4
                    min-w-4
                    place-items-center
                    rounded-full
                    bg-looms-teal
                    px-1
                    text-[9px]
                    leading-none
                    text-looms-cream
                  "
                >
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* BAG */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`Open cart, ${itemCount} items`}
              className="
                relative
                z-[101]
                grid
                h-11
                w-11
                shrink-0
                place-items-center
                pointer-events-auto
              "
            >
              <Icon
                name="bag"
                className="h-5 w-5"
              />

              {itemCount > 0 && (
                <span
                  className="
                    absolute
                    right-0
                    top-0
                    grid
                    h-4
                    min-w-4
                    place-items-center
                    rounded-full
                    bg-looms-teal
                    px-1
                    text-[9px]
                    leading-none
                    text-looms-cream
                  "
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* =====================================================
          MOBILE MENU
          ===================================================== */}
      {menuOpen && (
        <div className="fixed inset-0 z-[999]">
          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-looms-teal/35"
          />

          {/* MENU PANEL */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="
              relative
              flex
              h-full
              w-[88%]
              max-w-sm
              flex-col
              bg-looms-cream
              px-6
              pb-[max(1.5rem,env(safe-area-inset-bottom))]
              pt-[max(1.5rem,env(safe-area-inset-top))]
            "
          >
            {/* MOBILE HEADER */}
            <div className="flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="
                  font-display
                  text-2xl
                  tracking-[0.14em]
                  text-looms-teal
                "
              >
                LOOMS
              </Link>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMenuOpen(false)}
                className="grid h-11 w-11 place-items-center"
              >
                <Icon
                  name="close"
                  className="h-5 w-5"
                />
              </button>
            </div>

            {/* MOBILE LINKS */}
            <div className="mt-10 flex flex-col">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="
                    border-b
                    border-looms-teal/15
                    py-4
                    text-sm
                    tracking-[0.08em]
                    text-looms-teal
                  "
                >
                  {link.label}
                </Link>
              ))}

              {/* MOBILE WISHLIST */}
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-looms-teal/15
                  py-4
                  text-sm
                  tracking-[0.08em]
                  text-looms-teal
                "
              >
                <span>Wishlist</span>

                {wishlist.length > 0 && (
                  <span
                    className="
                      grid
                      h-5
                      min-w-5
                      place-items-center
                      rounded-full
                      bg-looms-teal
                      px-1
                      text-[9px]
                      text-looms-cream
                    "
                  >
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
