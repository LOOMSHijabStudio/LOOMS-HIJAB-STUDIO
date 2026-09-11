"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export interface ProductNavigationItem {
  id: string;
  name: string;
  slug: string;
  image: string;
}

interface ProductImageNavigationProps {
  currentProduct: ProductNavigationItem;
  previousProduct: ProductNavigationItem | null;
  nextProduct: ProductNavigationItem | null;
}

export default function ProductImageNavigation({
  currentProduct,
  previousProduct,
  nextProduct,
}: ProductImageNavigationProps) {
  const router = useRouter();

  function goToProduct(
    product: ProductNavigationItem | null
  ) {
    if (!product) {
      return;
    }

    router.push(
      `/shop/${encodeURIComponent(product.slug)}`
    );
  }

  return (
    <div className="relative aspect-[4/5] w-full">
      {/* =====================================================
          FOTO PRODUK
      ===================================================== */}

      <Image
        src={currentProduct.image}
        alt={currentProduct.name}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 55vw"
        className="object-cover"
      />

      {/* =====================================================
          PANAH KIRI
          POSISI TENGAH SAMPING KIRI
      ===================================================== */}

      {previousProduct ? (
        <button
          type="button"
          aria-label={`Previous product: ${previousProduct.name}`}
          onClick={() =>
            goToProduct(previousProduct)
          }
          className="
            absolute
            left-5
            top-1/2
            z-10
            flex
            h-12
            w-12
            -translate-y-1/2
            items-center
            justify-center
            rounded-full
            border
            border-white/70
            bg-white/90
            text-xl
            text-looms-teal
            shadow-md
            backdrop-blur-sm
            transition
            duration-300
            hover:scale-105
            hover:bg-looms-teal
            hover:text-looms-cream
            focus:outline-none
            focus:ring-2
            focus:ring-looms-teal/40
          "
        >
          ←
        </button>
      ) : null}

      {/* =====================================================
          PANAH KANAN
          POSISI TENGAH SAMPING KANAN
      ===================================================== */}

      {nextProduct ? (
        <button
          type="button"
          aria-label={`Next product: ${nextProduct.name}`}
          onClick={() =>
            goToProduct(nextProduct)
          }
          className="
            absolute
            right-5
            top-1/2
            z-10
            flex
            h-12
            w-12
            -translate-y-1/2
            items-center
            justify-center
            rounded-full
            border
            border-white/70
            bg-white/90
            text-xl
            text-looms-teal
            shadow-md
            backdrop-blur-sm
            transition
            duration-300
            hover:scale-105
            hover:bg-looms-teal
            hover:text-looms-cream
            focus:outline-none
            focus:ring-2
            focus:ring-looms-teal/40
          "
        >
          →
        </button>
      ) : null}
    </div>
  );
}
