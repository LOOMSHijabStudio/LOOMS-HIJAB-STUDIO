"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image: string;
}

interface RelatedProductsCarouselProps {
  products: RelatedProduct[];
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RelatedProductsCarousel({
  products,
}: RelatedProductsCarouselProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateButtons() {
    const slider = sliderRef.current;

    if (!slider) {
      return;
    }

    const maxScroll =
      slider.scrollWidth - slider.clientWidth;

    setCanScrollLeft(slider.scrollLeft > 5);

    setCanScrollRight(
      slider.scrollLeft < maxScroll - 5
    );
  }

  useEffect(() => {
    updateButtons();

    const slider = sliderRef.current;

    if (!slider) {
      return;
    }

    const handleResize = () => {
      updateButtons();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [products.length]);

  function scrollProducts(
    direction: "left" | "right"
  ) {
    const slider = sliderRef.current;

    if (!slider) {
      return;
    }

    const amount = slider.clientWidth * 0.85;

    slider.scrollBy({
      left:
        direction === "right"
          ? amount
          : -amount,
      behavior: "smooth",
    });

    window.setTimeout(
      updateButtons,
      350
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-24 border-t border-gray-200 pt-12">
      {/* =========================================
          HEADER
      ========================================= */}

      <div className="mb-7 flex items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-looms-gray">
            EXPLORE MORE
          </p>

          <h2 className="mt-2 font-display text-3xl text-looms-teal md:text-4xl">
            Discover more pieces
          </h2>
        </div>

        {/* =========================================
            ARROWS
        ========================================= */}

        <div className="flex shrink-0 gap-2">
          {canScrollLeft ? (
            <button
              type="button"
              aria-label="Previous products"
              onClick={() =>
                scrollProducts("left")
              }
              className="flex h-11 w-11 items-center justify-center border border-gray-300 bg-white text-xl text-looms-teal transition hover:bg-looms-teal hover:text-looms-cream"
            >
              ←
            </button>
          ) : null}

          {canScrollRight ? (
            <button
              type="button"
              aria-label="Next products"
              onClick={() =>
                scrollProducts("right")
              }
              className="flex h-11 w-11 items-center justify-center border border-gray-300 bg-white text-xl text-looms-teal transition hover:bg-looms-teal hover:text-looms-cream"
            >
              →
            </button>
          ) : null}
        </div>
      </div>

      {/* =========================================
          PRODUCT SLIDER
      ========================================= */}

      <div
        ref={sliderRef}
        onScroll={updateButtons}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-4"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {products.map((product) => {
          const salePrice =
            product.sale_price !== null &&
            product.sale_price < product.price
              ? product.sale_price
              : null;

          return (
            <Link
              key={product.id}
              href={`/shop/${product.slug}`}
              className="group block w-[72vw] shrink-0 sm:w-[42vw] md:w-[29vw] lg:w-[23%]"
            >
              {/* =====================================
                  FOTO PRODUK
              ===================================== */}

              <div className="relative aspect-[4/5] overflow-hidden bg-[#f2eee9]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="
                    (max-width: 640px) 72vw,
                    (max-width: 768px) 42vw,
                    (max-width: 1024px) 29vw,
                    23vw
                  "
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>

              {/* =====================================
                  NAMA + HARGA
              ===================================== */}

              <div className="pt-4">
                <h3 className="text-sm font-medium text-looms-teal transition group-hover:opacity-70">
                  {product.name}
                </h3>

                <div className="mt-2 flex items-center gap-2">
                  {salePrice !== null ? (
                    <>
                      <span className="text-sm text-looms-teal">
                        {formatRupiah(
                          salePrice
                        )}
                      </span>

                      <span className="text-xs text-looms-gray line-through">
                        {formatRupiah(
                          product.price
                        )}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-looms-gray">
                      {formatRupiah(
                        product.price
                      )}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
