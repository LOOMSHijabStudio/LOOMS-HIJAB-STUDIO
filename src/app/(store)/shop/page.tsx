import type { DemoProduct } from "@/features/catalog/demo-data";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

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
  id: string;
  name: string;
  slug: string;
};

type SupabaseProduct = {
  id: string;
  name: string;
  slug: string;
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

function getPublicImageUrl(
  storagePath: string | null | undefined,
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

function getCategory(
  category:
    | SupabaseCategory
    | SupabaseCategory[]
    | null
    | undefined,
) {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category ?? null;
}

export async function getCatalogProducts(): Promise<
  DemoProduct[]
> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "Supabase is not configured. Catalog is empty.",
    );

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
          id,
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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Failed to load catalog products:",
      error,
    );

    return [];
  }

  const products =
    (data ?? []) as SupabaseProduct[];

  return products.map((product) => {
    const category = getCategory(
      product.categories,
    );

    const images = Array.isArray(
      product.product_images,
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
          },
        )
      : [];

    const activeVariants = Array.isArray(
      product.product_variants,
    )
      ? product.product_variants.filter(
          (variant) =>
            variant.is_active !== false,
        )
      : [];

    const variants =
      activeVariants.map(
        (variant) => variant.name,
      );

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
        category?.name ?? "LOOMS",

      price: Number(
        product.price ?? 0,
      ),

      salePrice:
        product.sale_price !== null
          ? Number(product.sale_price)
          : undefined,

      image: getPublicImageUrl(
        images[0]?.storage_path,
      ),

      imageAlt: product.name,

      description:
        product.description ?? "",

      material:
        product.material ??
        "Premium Satin Voile",

      care:
        "Hand wash cold.",

      stock: Number(
        product.stock ?? 0,
      ),

      /*
       * DATABASE FLAGS
       */

      isNew: Boolean(
        product.is_new_arrival,
      ),

      isBestSeller: Boolean(
        product.is_best_seller,
      ),

      /*
       * ProductGrid belum membutuhkan
       * isFeatured, tetapi datanya tetap
       * tersedia dari database untuk filter
       * ShopBrowser.
       */

      variants,

      variantIds,
    };
  });
}
