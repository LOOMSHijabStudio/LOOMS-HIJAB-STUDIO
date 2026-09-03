"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import type { DemoProduct } from "@/features/catalog/demo-data";

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  const [products, setProducts] = useState<DemoProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/catalog/products");

        if (!response.ok) {
          throw new Error(
            "Failed to load catalog products",
          );
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setProducts(data);
        }
      } catch (error) {
        console.error(
          "Failed to load wishlist products:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const wishlistProducts = useMemo(() => {
    return products.filter((product) =>
      wishlist.includes(product.id),
    );
  }, [products, wishlist]);

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10 lg:py-16">
      <p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">
        YOUR EDIT
      </p>

      <h1 className="mt-3 font-display text-5xl md:text-7xl">
        Wishlist.
      </h1>

      <p className="mt-5 max-w-lg text-sm leading-7 text-looms-gray">
        Pieces you’ve saved for later.
      </p>

      {loading ? (
        <div className="py-20 text-center text-sm text-looms-gray">
          Loading your wishlist...
        </div>
      ) : wishlist.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-3xl text-looms-teal">
            Your wishlist is empty.
          </p>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-looms-gray">
            Save pieces you love by tapping the heart icon.
          </p>

          <Link
            href="/shop"
            className="mt-8 inline-flex rounded-full bg-looms-teal px-7 py-3 text-xs font-semibold tracking-[0.12em] text-white transition hover:opacity-90"
          >
            EXPLORE THE SHOP
          </Link>
        </div>
      ) : wishlistProducts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-looms-gray">
            Your saved pieces are no longer available.
          </p>

          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-full border border-looms-teal px-7 py-3 text-xs font-semibold tracking-[0.12em] text-looms-teal"
          >
            BACK TO SHOP
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-10 flex items-center justify-between border-y border-looms-teal/15 py-4">
            <p className="text-xs text-looms-gray">
              {wishlistProducts.length}{" "}
              {wishlistProducts.length === 1
                ? "piece"
                : "pieces"}{" "}
              saved
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {wishlistProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
