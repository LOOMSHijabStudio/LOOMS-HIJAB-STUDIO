import Image from "next/image";
import Link from "next/link";

import { Newsletter } from "@/components/home/newsletter";
import { SectionHeading } from "@/components/home/section-heading";
import { ProductGrid } from "@/components/catalog/product-grid";

import { getWebsiteAppearance } from "@/server/store/appearance";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type SupabaseImage = {
  storage_path: string;
  is_primary: boolean | null;
  position: number | null;
};

type SupabaseVariant = {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  is_active: boolean | null;
};

type SupabaseCategory = {
  name: string;
  slug: string;
};

type SupabaseProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  description: string | null;
  material: string | null;
  is_featured: boolean | null;
  is_new_arrival: boolean | null;
  is_best_seller: boolean | null;
  created_at: string;
  categories:
    | SupabaseCategory
    | SupabaseCategory[]
    | null;
  product_images: SupabaseImage[] | null;
  product_variants: SupabaseVariant[] | null;
};

type HomeProduct = {
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
  isFeatured?: boolean;
  variants: string[];
  variantIds: Record<string, string>;
};

function getPublicImageUrl(storagePath: string | null | undefined) {
  if (!storagePath) {
    return "/images/editorial-mocha.svg";
  }

  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("/")
  ) {
    return storagePath;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "/images/editorial-mocha.svg";
  }

  return `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`;
}

function getCategoryName(
  category:
    | SupabaseCategory
    | SupabaseCategory[]
    | null
    | undefined,
) {
  if (Array.isArray(category)) {
    return category[0]?.name ?? "LOOMS";
  }

  return category?.name ?? "LOOMS";
}

async function getHomeProducts(): Promise<HomeProduct[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

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
        is_featured,
        is_new_arrival,
        is_best_seller,
        created_at,
        categories (
          name,
          slug
        ),
        product_images (
          storage_path,
          is_primary,
          position
        ),
        product_variants (
          id,
          name,
          price,
          stock,
          is_active
        )
      `,
    )
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load Home products:", error);
    return [];
  }

  const products = (data ?? []) as SupabaseProduct[];

  return products.map((product) => {
    const images = Array.isArray(product.product_images)
      ? [...product.product_images].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;

          return (a.position ?? 0) - (b.position ?? 0);
        })
      : [];

    const activeVariants = Array.isArray(product.product_variants)
      ? product.product_variants.filter(
          (variant) => variant.is_active !== false,
        )
      : [];

    const variantIds: Record<string, string> = {};

    for (const variant of activeVariants) {
      variantIds[variant.name] = variant.id;
    }

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: getCategoryName(product.categories),
      price: Number(product.price ?? 0),
      salePrice:
        product.sale_price !== null
          ? Number(product.sale_price)
          : undefined,
      image: getPublicImageUrl(images[0]?.storage_path),
      imageAlt: product.name,
      description: product.description ?? "",
      material: product.material ?? "Premium Satin Voile",
      care: "Hand wash cold.",
      stock: Number(product.stock ?? 0),
      isNew: Boolean(product.is_new_arrival),
      isBestSeller: Boolean(product.is_best_seller),
      isFeatured: Boolean(product.is_featured),
      variants: activeVariants.map((variant) => variant.name),
      variantIds,
    };
  });
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-looms-gray">{text}</p>
    </div>
  );
}

export default async function HomePage() {
  const appearance = getWebsiteAppearance();
  const products = await getHomeProducts();

  /*
   * HOME SECTIONS
   *
   * Essential:
   * mengambil produk dari kategori ESSENTIAL VISCOSE.
   *
   * New Arrivals:
   * hanya produk dengan is_new_arrival = true.
   *
   * Best Sellers:
   * hanya produk dengan is_best_seller = true.
   *
   * Featured:
   * hanya produk dengan is_featured = true.
   */

  const essentialProducts = products
    .filter(
      (product) =>
        product.category.toUpperCase() === "ESSENTIAL VISCOSE",
    )
    .slice(0, 4);

  const newArrivalProducts = products.filter(
    (product) => product.isNew === true,
  );

  const bestSellerProducts = products.filter(
    (product) => product.isBestSeller === true,
  );

  const featuredProducts = products.filter(
    (product) => product.isFeatured === true,
  );

  return (
    <main>
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative overflow-hidden bg-looms-cream">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="flex min-h-[560px] flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-looms-teal">
              {appearance.heroEyebrow}
            </p>

            <h1 className="max-w-xl font-serif text-5xl leading-[0.95] text-looms-teal sm:text-6xl lg:text-7xl">
              {appearance.heroTitle}
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-looms-gray">
              {appearance.heroDescription}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-full bg-looms-teal px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90"
              >
                SHOP NOW
              </Link>

              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-full border border-looms-teal px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-looms-teal transition hover:bg-looms-teal hover:text-white"
              >
                OUR STORY
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px] lg:min-h-[560px]">
            <Image
              src={
                appearance.heroImage ||
                "/images/editorial-mocha.svg"
              }
              alt="LOOMS Hijab Studio"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          ESSENTIAL EDIT
      ========================================================= */}
      <section className="bg-white px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="THE ESSENTIAL EDIT"
            title="Considered essentials."
          />

          {essentialProducts.length > 0 ? (
            <ProductGrid products={essentialProducts} />
          ) : (
            <EmptySection text="No essential products available." />
          )}
        </div>
      </section>

      {/* =========================================================
          NEW ARRIVALS
      ========================================================= */}
      {newArrivalProducts.length > 0 && (
        <section className="bg-looms-cream px-6 py-20 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="JUST IN"
              title="New arrivals."
              href="/shop?edit=new"
            />

            <ProductGrid products={newArrivalProducts} />
          </div>
        </section>
      )}

      {/* =========================================================
          EDITORIAL
      ========================================================= */}
      <section className="bg-white px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl overflow-hidden bg-looms-sand lg:grid-cols-2">
          <div className="relative min-h-[420px]">
            <Image
              src={
                appearance.editorialImage ||
                "/images/editorial-mocha.svg"
              }
              alt="LOOMS editorial"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-looms-teal">
              {appearance.editorialEyebrow}
            </p>

            <h2 className="mt-4 font-serif text-4xl leading-tight text-looms-teal sm:text-5xl">
              {appearance.editorialTitle}
            </h2>

            <p className="mt-6 max-w-lg leading-7 text-looms-gray">
              {appearance.editorialDescription}
            </p>

            <div className="mt-8">
              <Link
                href="/shop"
                className="inline-flex rounded-full bg-looms-teal px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90"
              >
                EXPLORE THE EDIT
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BEST SELLERS
      ========================================================= */}
      {bestSellerProducts.length > 0 && (
        <section className="bg-looms-cream px-6 py-20 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="WORN & LOVED"
              title="Best sellers."
              href="/shop?edit=best"
            />

            <ProductGrid products={bestSellerProducts} />
          </div>
        </section>
      )}

      {/* =========================================================
          FEATURED
      ========================================================= */}
      {featuredProducts.length > 0 && (
        <section className="bg-white px-6 py-20 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="LOOMS EDIT"
              title="Featured pieces."
              href="/shop?edit=featured"
            />

            <ProductGrid products={featuredProducts} />
          </div>
        </section>
      )}

      {/* =========================================================
          STORY
      ========================================================= */}
      <section className="bg-looms-teal px-6 py-20 text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            THE LOOMS STORY
          </p>

          <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
            {appearance.storyTitle}
          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-7 text-white/75">
            {appearance.storyDescription}
          </p>

          <div className="mt-8">
            <Link
              href="/about"
              className="inline-flex rounded-full border border-white/50 px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-looms-teal"
            >
              READ OUR STORY
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          INSTAGRAM / SOCIAL
      ========================================================= */}
      <section className="bg-white px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-looms-teal">
            FOLLOW ALONG
          </p>

          <h2 className="mt-4 font-serif text-4xl text-looms-teal">
            @loomshijabstudio
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-looms-gray">
            Discover new releases, styling inspiration, and the
            everyday world of LOOMS.
          </p>

          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex rounded-full border border-looms-teal px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-looms-teal transition hover:bg-looms-teal hover:text-white"
            >
              GET IN TOUCH
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          NEWSLETTER
      ========================================================= */}
      <Newsletter />
    </main>
  );
}
