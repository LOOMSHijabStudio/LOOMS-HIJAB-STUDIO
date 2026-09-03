"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DemoProduct } from "@/features/catalog/demo-data";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
}: {
  products: DemoProduct[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateButtons = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    const maxScrollLeft =
      container.scrollWidth - container.clientWidth;

    setCanScrollLeft(container.scrollLeft > 5);
    setCanScrollRight(
      container.scrollLeft < maxScrollLeft - 5
    );
  }, []);

  useEffect(() => {
    updateButtons();

    const container = containerRef.current;

    if (!container) return;

    const handleScroll = () => {
      updateButtons();
    };

    container.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("resize", updateButtons);

    return () => {
      container.removeEventListener(
        "scroll",
        handleScroll
      );

      window.removeEventListener("resize", updateButtons);
    };
  }, [updateButtons, products.length]);

  function scrollRight() {
    const container = containerRef.current;

    if (!container) return;

    container.scrollBy({
      left: container.clientWidth * 0.85,
      behavior: "smooth",
    });
  }

  function scrollLeft() {
    const container = containerRef.current;

    if (!container) return;

    container.scrollBy({
      left: -(container.clientWidth * 0.85),
      behavior: "smooth",
    });
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-looms-gray">
          No products available.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* =========================
          LEFT BUTTON
      ========================== */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={scrollLeft}
          aria-label="Scroll products left"
          className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-looms-cream/95 text-xl text-looms-teal shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-looms-cream"
        >
          ←
        </button>
      )}

      {/* =========================
          PRODUCTS
      ========================== */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 md:gap-6"
      >
        {products.map((product) => (
          <div
            key={product.slug}
            className="w-[72vw] shrink-0 snap-start sm:w-[45vw] md:w-[30vw] lg:w-[23vw]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* =========================
          RIGHT BUTTON
      ========================== */}
      {canScrollRight && (
        <button
          type="button"
          onClick={scrollRight}
          aria-label="Scroll products right"
          className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-looms-cream/95 text-xl text-looms-teal shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-looms-cream"
        >
          →
        </button>
      )}
    </div>
  );
}
