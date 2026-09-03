import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { DemoProduct } from "@/features/catalog/demo-data";
import { ProductDetailPurchase } from "@/components/catalog/product-detail-purchase";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type ProductImage = {
  storage_path: string;
  is_primary: boolean;
  position: number;
};

type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  image_path: string | null;
  price: number | null;
  stock: number;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  material: string | null;
  care_instructions: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

async function getProduct(
  slug: string
): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    console.error("Supabase belum dikonfigurasi.");
    return null;
  }

  try {
    const client = createSupabaseServiceClient();

    const decodedSlug = decodeURIComponent(slug).trim();

    const possibleSlugs = [
      decodedSlug,
      slug,
      decodedSlug.toLowerCase(),
      decodedSlug
        .toLowerCase()
        .replace(/\s+/g, "-"),
    ].filter(Boolean);

    for (const currentSlug of possibleSlugs) {
      const { data, error } = await client
        .from("products")
        .select(
          `
            id,
            name,
            slug,
            sku,
            description,
            material,
            care_instructions,
            price,
            sale_price,
            stock,
            status,
            is_new_arrival,
            is_best_seller,
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
          `
        )
        .eq("slug", currentSlug)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (error) {
        console.error(
          `Gagal mengambil produk "${currentSlug}":`,
          error
        );

        continue;
      }

      if (data) {
        return {
          ...(data as Product),

          price: Number(data.price ?? 0),

          sale_price:
            data.sale_price !== null &&
            data.sale_price !== undefined
              ? Number(data.sale_price)
              : null,

          stock: Number(data.stock ?? 0),

          product_images:
            (data.product_images ??
              []) as ProductImage[],

          product_variants: (
            (data.product_variants ??
              []) as ProductVariant[]
          ).map((variant) => ({
            ...variant,

            price:
              variant.price !== null &&
              variant.price !== undefined
                ? Number(variant.price)
                : null,

            stock: Number(
              variant.stock ?? 0
            ),
          })),
        };
      }
    }

    return null;
  } catch (error) {
    console.error(
      "Product detail error:",
      error
    );

    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found | LOOMS",
    };
  }

  return {
    title: `${product.name} | LOOMS`,
    description:
      product.description ||
      `Discover ${product.name} from the LOOMS collection.`,
  };
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getImageUrl(
  client: ReturnType<
    typeof createSupabaseServiceClient
  >,
  storagePath:
    | string
    | null
    | undefined
) {
  if (!storagePath) {
    return "/images/editorial-mocha.svg";
  }

  return client.storage
    .from("product-images")
    .getPublicUrl(storagePath)
    .data.publicUrl;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const client = createSupabaseServiceClient();

  const images = [
    ...(product.product_images ?? []),
  ].sort(
    (a, b) =>
      (a.position ?? 0) -
      (b.position ?? 0)
  );

  const primaryImage =
    images.find(
      (image) => image.is_primary
    ) ?? images[0];

  const mainImage = getImageUrl(
    client,
    primaryImage?.storage_path
  );

  const activeVariants = (
    product.product_variants ?? []
  ).filter(
    (variant) => variant.is_active
  );

  const hasVariants =
    activeVariants.length > 0;

  const salePrice =
    product.sale_price !== null &&
    product.sale_price < product.price
      ? product.sale_price
      : null;

  const displayPrice =
    salePrice ?? product.price;

  const isInStock = hasVariants
    ? activeVariants.some(
        (variant) => variant.stock > 0
      )
    : product.stock > 0;

  const defaultVariant =
    hasVariants
      ? activeVariants.find(
          (variant) => variant.stock > 0
        ) ?? activeVariants[0]
      : null;

  /*
   * DATA UNTUK CART
   */
  const cartProduct: DemoProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,

    category:
      "The LOOMS Collection",

    price: product.price,

    ...(salePrice !== null
      ? { salePrice }
      : {}),

    image: mainImage,

    imageAlt: product.name,

    description:
      product.description ||
      "A considered LOOMS piece designed for everyday wear.",

    material:
      product.material ||
      "Premium Satin Voile",

    care:
      product.care_instructions ||
      "Hand wash cold. Dry flat away from direct sunlight.",

    stock: product.stock,

    isNew:
      product.is_new_arrival,

    isBestSeller:
      product.is_best_seller,

    variants:
      activeVariants.map(
        (variant) => variant.name
      ),

    variantIds:
      Object.fromEntries(
        activeVariants.map(
          (variant) => [
            variant.name,
            variant.id,
          ]
        )
      ),
  };

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10 lg:py-16">
      {/* BACK */}
      <div className="mb-8">
        <Link
          href="/shop"
          className="text-xs font-medium tracking-[0.12em] text-looms-gray transition hover:text-looms-teal"
        >
          ← BACK TO SHOP
        </Link>
      </div>

      <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* IMAGE */}
        <div className="relative overflow-hidden bg-[#f2eee9]">
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* PRODUCT INFO */}
        <div className="flex flex-col justify-center">
          {/* LABEL */}
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-looms-gray">
            {product.is_new_arrival
              ? "NEW ARRIVAL"
              : product.is_best_seller
                ? "BEST SELLER"
                : "THE LOOMS COLLECTION"}
          </p>

          {/* NAME */}
          <h1 className="mt-4 font-display text-5xl leading-[0.95] text-looms-teal md:text-6xl">
            {product.name}
          </h1>

          {/* BASE PRICE */}
          {!hasVariants && (
            <div className="mt-6 flex items-center gap-3">
              {salePrice !== null ? (
                <>
                  <span className="text-lg font-medium text-looms-teal">
                    {formatRupiah(
                      salePrice
                    )}
                  </span>

                  <span className="text-sm text-looms-gray line-through">
                    {formatRupiah(
                      product.price
                    )}
                  </span>
                </>
              ) : (
                <span className="text-lg font-medium text-looms-teal">
                  {formatRupiah(
                    product.price
                  )}
                </span>
              )}
            </div>
          )}

          {/* DESCRIPTION */}
          <div className="mt-8 max-w-xl">
            <p className="text-sm leading-7 text-looms-gray">
              {product.description ||
                "A considered LOOMS piece designed for everyday wear."}
            </p>
          </div>

          {/* PURCHASE + VARIANT */}
          <div className="mt-8 max-w-md">
            <ProductDetailPurchase
              product={cartProduct}
              variants={activeVariants}
              defaultVariantId={
                defaultVariant?.id ??
                null
              }
              basePrice={displayPrice}
            />
          </div>

          {/* GENERAL STOCK MESSAGE */}
          {!hasVariants && (
            <div className="mt-7">
              {isInStock ? (
                <p className="text-xs font-medium text-green-700">
                  In stock ·{" "}
                  {product.stock} pcs
                </p>
              ) : (
                <p className="text-xs font-medium text-red-600">
                  Sold out
                </p>
              )}
            </div>
          )}

          {/* DETAILS */}
          <div className="mt-10 border-t border-gray-200 pt-7">
            <div className="grid gap-5 text-sm">
              {/* MATERIAL */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
                  MATERIAL
                </p>

                <p className="mt-2 text-looms-teal">
                  {product.material ||
                    "Premium Satin Voile"}
                </p>
              </div>

              {/* CARE */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
                  CARE
                </p>

                <p className="mt-2 text-looms-gray">
                  {product.care_instructions ||
                    "Hand wash cold. Dry flat away from direct sunlight."}
                </p>
              </div>

              {/* PRODUCT CODE */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
                  PRODUCT CODE
                </p>

                <p className="mt-2 text-looms-gray">
                  {product.sku}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
