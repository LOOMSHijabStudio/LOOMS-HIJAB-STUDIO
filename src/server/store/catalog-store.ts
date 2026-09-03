import type { DemoProduct } from "@/features/catalog/demo-data";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export async function getCatalogProducts(): Promise<DemoProduct[]> {
  if (!isSupabaseConfigured()) {
    console.error("Supabase belum dikonfigurasi.");
    return [];
  }

  try {
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from("products")
      .select(`
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
        product_images (
          storage_path,
          is_primary,
          position
        )
      `)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil produk dari Supabase:", error);
      return [];
    }

    return (data ?? []).map((product) => {
      const images = (product.product_images ?? []) as Array<{
        storage_path: string;
        is_primary: boolean;
        position: number;
      }>;

      const primaryImage =
        images.find((image) => image.is_primary) ??
        [...images].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0)
        )[0];

      let imageUrl = "/images/editorial-mocha.svg";

      if (primaryImage?.storage_path) {
        imageUrl = client.storage
          .from("product-images")
          .getPublicUrl(primaryImage.storage_path)
          .data.publicUrl;
      }

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: "The Essential Edit",
        price: Number(product.price ?? 0),
        salePrice:
          product.sale_price !== null &&
          product.sale_price !== undefined
            ? Number(product.sale_price)
            : undefined,
        image: imageUrl,
        imageAlt: product.name,
        description: product.description ?? "",
        material: product.material ?? "Premium Satin Voile",
        care: "Hand wash cold.",
        stock: Number(product.stock ?? 0),
        isNew: Boolean(product.is_new_arrival),
        isBestSeller: Boolean(product.is_best_seller),
        variants: [],
        variantIds: {},
      };
    });
  } catch (error) {
    console.error("Catalog error:", error);
    return [];
  }
}

export async function getCatalogProduct(
  slug: string
): Promise<DemoProduct | undefined> {
  const products = await getCatalogProducts();

  return products.find((product) => product.slug === slug);
}
