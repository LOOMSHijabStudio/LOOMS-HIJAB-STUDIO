"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  image?: string | null;
};

export default function NewArrivalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(
          "/api/admin/placements?placement=NEW_ARRIVALS",
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (data?.products) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error("Gagal mengambil produk New Arrivals:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            LOOMS Hijab Studio
          </p>

          <h1 className="text-4xl font-light tracking-tight text-neutral-900 md:text-6xl">
            New Arrivals
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-500 md:text-base">
            Discover the latest pieces from LOOMS, thoughtfully designed for
            your everyday style.
          </p>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="animate-pulse">
                <div className="aspect-[3/4] bg-neutral-100" />
                <div className="mt-4 h-4 w-2/3 bg-neutral-100" />
                <div className="mt-2 h-4 w-1/3 bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
            <h2 className="text-xl font-light text-neutral-900">
              Belum ada produk baru
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">
              Belum ada produk yang ditempatkan di New Arrivals.
              Tambahkan produk melalui Admin → Produk dan pilih New Arrivals.
            </p>

            <Link
              href="/shop"
              className="mt-7 border border-neutral-900 px-6 py-3 text-xs uppercase tracking-[0.2em] text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
            >
              Explore Shop
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  Just arrived
                </p>

                <h2 className="mt-2 text-2xl font-light text-neutral-900">
                  Latest Pieces
                </h2>
              </div>

              <p className="text-xs text-neutral-400">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => {
                const price = product.sale_price ?? product.price;

                const hasSale =
                  product.sale_price !== null &&
                  product.sale_price !== undefined &&
                  product.sale_price < product.price;

                return (
                  <Link
                    key={product.id}
                    href={`/shop/${product.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-neutral-400">
                          LOOMS
                        </div>
                      )}

                      <span className="absolute left-3 top-3 bg-white px-3 py-1 text-[10px] uppercase tracking-widest text-neutral-900">
                        New
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-normal text-neutral-900 transition group-hover:text-neutral-500">
                        {product.name}
                      </h3>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-neutral-900">
                          {formatPrice(price)}
                        </span>

                        {hasSale && (
                          <span className="text-xs text-neutral-400 line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
