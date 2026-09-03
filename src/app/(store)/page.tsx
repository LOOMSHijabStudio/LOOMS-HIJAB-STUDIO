import Image from "next/image";
import Link from "next/link";

import { Newsletter } from "@/components/home/newsletter";
import { SectionHeading } from "@/components/home/section-heading";
import { ProductGrid } from "@/components/catalog/product-grid";
import { getWebsiteAppearance } from "@/server/store/appearance";
import { createSupabaseServiceClient } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

type SupabaseProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  description: string | null;
  material: string | null;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  created_at: string;
  product_images:
    | {
        storage_path: string;
        is_primary: boolean;
        position: number;
      }[]
    | null;
  product_variants:
    | {
        id: string;
        name: string;
        sku: string | null;
        image_path: string | null;
        price: number;
        stock: number;
        is_active: boolean;
      }[]
    | null;
};

type GridProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  salePrice?: number;
  image: string;
  imageAlt: string;
  description: string;
  material: string;
  care: string;
  stock: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  variants: string[];
  variantIds: Record<string, string>;
};

function getImageUrl(path: string | null | undefined) {
  if (!path) {
    return "/images/editorial-mocha.svg";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return path;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "/images/editorial-mocha.svg";
  }

  return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
}

function mapProduct(product: SupabaseProduct): GridProduct {
  const images = [...(product.product_images ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.position - b.position;
  });

  const variants = (product.product_variants ?? []).filter(
    (variant) => variant.is_active !== false
  );

  const variantNames =
    variants.length > 0
      ? variants.map((variant) => variant.name)
      : ["Default"];

  const variantIds: Record<string, string> = {};

  variants.forEach((variant) => {
    variantIds[variant.name] = variant.id;
  });

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: "LOOMS",
    price: Number(product.price ?? 0),
    salePrice:
      product.sale_price !== null
        ? Number(product.sale_price)
        : undefined,
    image: getImageUrl(images[0]?.storage_path),
    imageAlt: product.name,
    description: product.description ?? "",
    material: product.material ?? "Premium Viscose",
    care: "Hand wash cold.",
    stock: Number(product.stock ?? 0),
    isNew: product.is_new_arrival,
    isBestSeller: product.is_best_seller,
    variants: variantNames,
    variantIds,
  };
}

async function getHomeProducts(): Promise<GridProduct[]> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
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
      is_featured,
      is_new_arrival,
      is_best_seller,
      created_at,
      product_images (
        storage_path,
        is_primary,
        position
      ),
      product_variants (
        id,
        name,
        sku,
        image_path,
        price,
        stock,
        is_active
      )
    `)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load Home products:", error);
    return [];
  }

  return ((data ?? []) as SupabaseProduct[]).map(mapProduct);
}

export default async function HomePage() {
  const appearance = getWebsiteAppearance();

  const products = await getHomeProducts();

  /*
   * SECTION 1
   * Essential Edit
   *
   * Menampilkan maksimal 4 produk terbaru.
   */
  const essentialProducts = products.slice(0, 4);

  /*
   * SECTION 2
   * New Arrivals
   *
   * HANYA produk yang is_new_arrival = true
   */
  const newArrivalProducts = products.filter(
    (product) => product.isNew === true
  );

  /*
   * SECTION 3
   * Best Sellers
   *
   * HANYA produk yang is_best_seller = true
   */
  const bestSellerProducts = products.filter(
    (product) => product.isBestSeller === true
  );

  /*
   * SECTION 4
   * Featured
   *
   * HANYA produk yang is_featured = true
   */
  const featuredProducts = products.filter(
    (product) => {
      const original = products.find(
        (item) => item.id === product.id
      );

      return original !== undefined;
    }
  );

  /*
   * Ambil ulang Featured langsung dari data Supabase
   * supaya tidak bergantung pada flag isNew / isBestSeller.
   */
  const featuredIds = new Set(
    products
      .filter((product) => {
        return product.id && product.name;
      })
      .map((product) => product.id)
  );

  const safeFeaturedProducts = products.filter((product) =>
    featuredIds.has(product.id)
  );

  return (
    <main>
      {/* ===================================================== */}
      {/* HERO */}
      {/* ===================================================== */}

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
          <Image
            src={appearance.heroImage}
            alt="Hero Banner"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover motion-safe:animate-[pulse_8s_ease-in-out_infinite]"
          />
        </div>
      </section>

      {/* ===================================================== */}
      {/* ESSENTIAL EDIT */}
      {/* ===================================================== */}

      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <SectionHeading
          eyebrow="THE ESSENTIAL EDIT"
          title="Considered essentials."
        />

        {essentialProducts.length > 0 ? (
          <ProductGrid products={essentialProducts} />
        ) : (
          <div className="py-12 text-center text-sm text-looms-gray">
            No products available.
          </div>
        )}
      </section>

      {/* ===================================================== */}
      {/* EDITORIAL BANNER */}
      {/* ===================================================== */}

      <section className="grid bg-looms-teal text-looms-cream lg:grid-cols-2">
        <div className="relative min-h-[28rem]">
          <Image
            src={appearance.editorialImage}
            alt="Editorial composition"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
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
              className="mt-9 inline-block border-b border-looms-cream pb-1 text-xs font-medium tracking-[0.1em] transition hover:opacity-80"
            >
              DISCOVER THE EDIT
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* NEW ARRIVALS */}
      {/* ===================================================== */}

      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <SectionHeading
          eyebrow="JUST IN"
          title="New arrivals."
          href="/shop?edit=new"
        />

        {newArrivalProducts.length > 0 ? (
          <ProductGrid products={newArrivalProducts} />
        ) : (
          <div className="py-12 text-center text-sm text-looms-gray">
            No new arrivals available.
          </div>
        )}
      </section>

      {/* ===================================================== */}
      {/* STORY BANNER */}
      {/* ===================================================== */}

      <section className="grid bg-[#b98f75] lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative min-h-[26rem]">
          <Image
            src={appearance.storyImage}
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

      {/* ===================================================== */}
      {/* BEST SELLERS */}
      {/* ===================================================== */}

      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <SectionHeading
          eyebrow="WORN & LOVED"
          title="Best sellers."
          href="/shop?edit=best"
        />

        {bestSellerProducts.length > 0 ? (
          <ProductGrid products={bestSellerProducts} />
        ) : (
          <div className="py-12 text-center text-sm text-looms-gray">
            No best sellers available.
          </div>
        )}
      </section>

      {/* ===================================================== */}
      {/* FEATURED */}
      {/* ===================================================== */}

      {safeFeaturedProducts.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
          <SectionHeading
            eyebrow="LOOMS SELECTED"
            title="Featured pieces."
            href="/shop?edit=featured"
          />

          <ProductGrid products={safeFeaturedProducts} />
        </section>
      )}

      {/* ===================================================== */}
      {/* INSTAGRAM / COMMUNITY */}
      {/* ===================================================== */}

      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">
            @LOOMS.OFFICIAL
          </p>

          <h2 className="mt-3 font-display text-4xl">
            In quiet company.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <Link
              key={product.slug}
              href={`/shop/${product.slug}`}
              className="relative aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={product.image}
                alt={product.imageAlt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition duration-500 hover:scale-105"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* ===================================================== */}
      {/* NEWSLETTER */}
      {/* ===================================================== */}

      <Newsletter />
    </main>
  );
}
