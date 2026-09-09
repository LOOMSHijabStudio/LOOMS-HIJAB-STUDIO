import Link from "next/link";

import { ProductGrid } from "@/components/catalog/product-grid";
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
  availability: string;
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

type SupabasePlacement = {
  product_id: string;
  placement: string;
  position: number | null;
};

type BestSellerProduct = {
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
  availability: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  variants: string[];
  variantIds: Record<string, string>;
};

function getPublicImageUrl(
  storagePath: string | null | undefined
) {
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

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

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
    | undefined
) {
  if (Array.isArray(category)) {
    return category[0]?.name ?? "LOOMS";
  }

  return category?.name ?? "LOOMS";
}

async function getBestSellerProducts(): Promise<
  BestSellerProduct[]
> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const client =
    createSupabaseServiceClient();

  const {
    data: productsData,
    error: productsError,
  } = await client
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
        availability,
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
      `
    )
    .eq("status", "ACTIVE")
    .order("created_at", {
      ascending: false,
    });

  if (productsError) {
    console.error(
      "Failed to load Best Sellers products:",
      productsError
    );

    return [];
  }

  const {
    data: placementsData,
    error: placementsError,
  } = await client
    .from("product_placements")
    .select(
      `
        product_id,
        placement,
        position
      `
    )
    .eq("placement", "BEST_SELLERS")
    .order("position", {
      ascending: true,
    });

  if (placementsError) {
    console.error(
      "Failed to load Best Sellers placements:",
      placementsError
    );

    return [];
  }

  const products =
    (productsData ?? []) as SupabaseProduct[];

  const placements =
    (placementsData ?? []) as SupabasePlacement[];

  const positionMap = new Map<
    string,
    number
  >();

  placements.forEach(
    (placement, index) => {
      positionMap.set(
        placement.product_id,
        placement.position ?? index
      );
    }
  );

  const bestSellerProducts =
    products
      .filter((product) =>
        positionMap.has(product.id)
      )
      .sort((a, b) => {
        const positionA =
          positionMap.get(a.id) ?? 0;

        const positionB =
          positionMap.get(b.id) ?? 0;

        return positionA - positionB;
      });

  return bestSellerProducts.map(
    (product) => {
      const images = Array.isArray(
        product.product_images
      )
        ? [...product.product_images].sort(
            (a, b) => {
              if (
                a.is_primary &&
                !b.is_primary
              ) {
                return -1;
              }

              if (
                !a.is_primary &&
                b.is_primary
              ) {
                return 1;
              }

              return (
                (a.position ?? 0) -
                (b.position ?? 0)
              );
            }
          )
        : [];

      const activeVariants =
        Array.isArray(
          product.product_variants
        )
          ? product.product_variants.filter(
              (variant) =>
                variant.is_active !== false
            )
          : [];

      const variantIds: Record<
        string,
        string
      > = {};

      for (const variant of activeVariants) {
        variantIds[variant.name] =
          variant.id;
      }

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,

        category:
          getCategoryName(
            product.categories
          ),

        price: Number(
          product.price ?? 0
        ),

        salePrice:
          product.sale_price !== null
            ? Number(
                product.sale_price
              )
            : undefined,

        image:
          getPublicImageUrl(
            images[0]?.storage_path
          ),

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

        availability:
          product.availability ??
          "regular",

        isNew:
          product.is_new_arrival ===
          true,

        isBestSeller: true,

        isFeatured:
          product.is_featured ===
          true,

        variants:
          activeVariants.map(
            (variant) =>
              variant.name
          ),

        variantIds,
      };
    }
  );
}

export default async function BestSellersPage() {
  const products =
    await getBestSellerProducts();

  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">

          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            LOOMS Hijab Studio
          </p>

          <h1 className="text-4xl font-light tracking-tight text-neutral-900 md:text-6xl">
            Best Sellers
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-500 md:text-base">
            Discover the pieces loved most
            by the LOOMS community.
          </p>

        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">

        {products.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center text-center">

            <h2 className="text-xl font-light text-neutral-900">
              Belum ada Best Sellers
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">
              Belum ada produk yang
              ditempatkan di Best Sellers.
              Tambahkan produk melalui
              Admin → Produk dan pilih
              Best Sellers.
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
                  Most loved
                </p>

                <h2 className="mt-2 text-2xl font-light text-neutral-900">
                  Customer Favorites
                </h2>
              </div>

              <p className="text-xs text-neutral-400">
                {products.length}{" "}
                {products.length === 1
                  ? "product"
                  : "products"}
              </p>

            </div>

            <ProductGrid
              products={products}
            />

          </>
        )}

      </section>
    </main>
  );
}
