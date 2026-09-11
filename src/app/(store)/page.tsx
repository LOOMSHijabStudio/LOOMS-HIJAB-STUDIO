import Image from "next/image";
import Link from "next/link";

import { Newsletter } from "@/components/home/newsletter";
import { SectionHeading } from "@/components/home/section-heading";
import { ProductGrid } from "@/components/catalog/product-grid";

import { getWebsiteAppearance } from "@/server/store/appearance";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

import type { DemoProduct } from "@/features/catalog/demo-data";

export const dynamic = "force-dynamic";

/* =====================================================
   GET CATALOG PRODUCTS FROM SUPABASE
   ===================================================== */

async function getCatalogProducts(): Promise<DemoProduct[]> {
  if (!isSupabaseConfigured()) {
    console.error("Supabase belum dikonfigurasi.");
    return [];
  }

  try {
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        sku,
        price,
        sale_price,
        stock,
        status,
        description,
        material,
        availability,
        is_featured,
        is_new_arrival,
        is_best_seller,
        created_at,
        product_images (
          storage_path,
          is_primary,
          position
        )
      `
      )
      .eq("status", "ACTIVE")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Gagal mengambil produk dari Supabase:",
        error
      );
      return [];
    }

    return (data ?? []).map((product) => {
      const images =
        (product.product_images ?? []) as Array<{
          storage_path: string;
          is_primary: boolean;
          position: number;
        }>;

      const primaryImage =
        images.find(
          (image) => image.is_primary
        ) ??
        [...images].sort(
          (a, b) =>
            (a.position ?? 0) -
            (b.position ?? 0)
        )[0];

      let imageUrl =
        "/images/editorial-mocha.svg";

      if (primaryImage?.storage_path) {
        imageUrl =
          client.storage
            .from("product-images")
            .getPublicUrl(
              primaryImage.storage_path
            )
            .data.publicUrl;
      }

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,

        category:
          "The Essential Edit",

        price: Number(
          product.price ?? 0
        ),

        salePrice:
          product.sale_price !== null &&
          product.sale_price !== undefined
            ? Number(
                product.sale_price
              )
            : undefined,

        image: imageUrl,
        imageAlt: product.name,

        description:
          product.description ?? "",

        material:
          product.material ??
          "Premium Satin Voile",

        care: "Hand wash cold.",

        stock: Number(
          product.stock ?? 0
        ),

        availability: String(
          product.availability ?? "regular"
        ).toLowerCase(),

        isNew: Boolean(
          product.is_new_arrival
        ),

        isBestSeller: Boolean(
          product.is_best_seller
        ),

        variants: [],
        variantIds: {},
      };
    });
  } catch (error) {
    console.error(
      "Catalog products error:",
      error
    );
    return [];
  }
}

/* =====================================================
   HOMEPAGE
   ===================================================== */

export default async function HomePage() {
  const appearance =
    await getWebsiteAppearance();

  const gridProducts =
    await getCatalogProducts();

  const markedNewArrivals =
    gridProducts.filter(
      (product) => product.isNew
    );

  const newArrivalProducts =
    markedNewArrivals.length > 0
      ? markedNewArrivals
      : gridProducts.slice(0, 4);

  const markedBestSellers =
    gridProducts.filter(
      (product) => product.isBestSeller
    );

  const bestSellerProducts =
    markedBestSellers.length > 0
      ? markedBestSellers
      : gridProducts;

  return (
    <main>
      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="grid min-h-[calc(100svh-6.5rem)] bg-[#d3c4b6] lg:grid-cols-[1fr_1.2fr]">
        <div className="order-2 flex flex-col justify-center px-6 py-16 lg:order-1 lg:px-[max(3rem,8vw)]">
          <p className="text-[10px] font-medium tracking-[0.18em] text-looms-gray">
            {appearance.heroEyebrow}
          </p>

          <h1 className="mt-5 max-w-lg whitespace-pre-line font-display text-5xl leading-[.95] text-looms-teal sm:text-7xl lg:text-8xl">
            {appearance.heroTitle}
          </h1>

          <p className="mt-7 max-w-md text-sm leading-7 text-looms-gray">
            {appearance.heroDescription}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/shop"
              className="bg-looms-teal px-6 py-4 text-xs font-medium tracking-[0.12em] text-looms-cream transition hover:bg-looms-teal/90"
            >
              SHOP COLLECTION
            </Link>

            <Link
              href="/shop?edit=new"
              className="border border-looms-teal px-6 py-4 text-xs font-medium tracking-[0.12em] transition hover:bg-looms-teal hover:text-looms-cream"
            >
              EXPLORE NEW ARRIVALS
            </Link>
          </div>
        </div>

        <div className="relative order-1 min-h-[52svh] overflow-hidden lg:order-2 lg:min-h-0">
          <img
            src={
              appearance.heroImage ||
              "/images/editorial-mocha.svg"
            }
            alt="Hero Banner"
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[pulse_8s_ease-in-out_infinite]"
            loading="eager"
          />
        </div>
      </section>

      {/* =====================================================
          PRODUCT GRID
          ===================================================== */}

      <section className="mx-auto max-w-[1440px] bg-white px-5 py-20 lg:px-10 lg:py-28">
        {gridProducts.length > 0 ? (
          <ProductGrid products={gridProducts} />
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm tracking-[0.08em] text-looms-gray">
              BELUM ADA PRODUK AKTIF
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          NEW ARRIVALS
          ===================================================== */}

      {newArrivalProducts.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
            <SectionHeading
              eyebrow="JUST IN"
              title="New arrivals."
              href="/shop?edit=new"
            />

            <ProductGrid products={newArrivalProducts} />
          </div>
        </section>
      )}

      {/* =====================================================
          EDITORIAL BANNER
          ===================================================== */}

      <section className="grid bg-looms-teal text-looms-cream lg:grid-cols-2">
        <div className="relative min-h-[28rem] overflow-hidden">
          <img
            src={
              appearance.editorialImage ||
              "/images/editorial-mocha.svg"
            }
            alt="Editorial composition"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex items-center px-6 py-20 lg:px-[max(3rem,8vw)]">
          <div>
            <p className="text-[10px] font-medium tracking-[0.16em] text-looms-cream/65">
              {appearance.editorialEyebrow}
            </p>

            <h2 className="mt-5 max-w-md font-display text-5xl leading-[.95] md:text-6xl">
              {appearance.editorialTitle}
            </h2>

            <p className="mt-6 max-w-md text-sm leading-7 text-looms-cream/70">
              {appearance.editorialDescription}
            </p>

            <Link
              href="/shop?edit=new"
              className="mt-9 inline-block border-b border-looms-cream pb-1 text-xs font-medium tracking-[0.1em] hover:opacity-80"
            >
              DISCOVER THE EDIT
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          BEST SELLERS
          ===================================================== */}

      <section className="mx-auto max-w-[1440px] bg-white px-5 py-20 lg:px-10 lg:py-28">
        <SectionHeading
          eyebrow="WORN &amp; LOVED"
          title="Best sellers."
          href="/shop?edit=best"
        />

        {bestSellerProducts.length > 0 ? (
          <ProductGrid products={bestSellerProducts} />
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm tracking-[0.08em] text-looms-gray">
              BELUM ADA PRODUK
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          STORY
          ===================================================== */}

      <section className="grid bg-[#b98f75] lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative min-h-[26rem] overflow-hidden">
          <Image
            src={
              appearance.storyImage ||
              "/images/editorial-mocha.svg"
            }
            alt="Story composition"
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
          />
        </div>

        <div className="flex items-center px-6 py-16 lg:px-[max(3rem,8vw)]">
          <div>
            <p className="text-[10px] font-medium tracking-[0.16em] text-looms-teal/70">
              THE LOOMS WAY
            </p>

            <h2 className="mt-4 font-display text-5xl leading-none">
              {appearance.storyTitle}
            </h2>

            <p className="mt-6 max-w-sm text-sm leading-7 text-looms-teal/80">
              {appearance.storyDescription}
            </p>

            <Link
              href="/about"
              className="mt-8 inline-block border-b border-looms-teal pb-1 text-xs font-medium tracking-[0.1em]"
            >
              OUR STORY
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          NEWSLETTER
          ===================================================== */}

      <Newsletter />
    </main>
  );
}
