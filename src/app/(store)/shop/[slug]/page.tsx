import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

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

async function getProduct(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    console.error("Supabase belum dikonfigurasi.");
    return null;
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
      .eq("slug", slug)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) {
      console.error("Gagal mengambil detail produk:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      ...(data as Product),
      price: Number(data.price ?? 0),
      sale_price:
        data.sale_price !== null && data.sale_price !== undefined
          ? Number(data.sale_price)
          : null,
      stock: Number(data.stock ?? 0),
      product_images: (data.product_images ?? []) as ProductImage[],
      product_variants: ((data.product_variants ?? []) as ProductVariant[]).map(
        (variant) => ({
          ...variant,
          price:
            variant.price !== null && variant.price !== undefined
              ? Number(variant.price)
              : null,
          stock: Number(variant.stock ?? 0),
        })
      ),
    };
  } catch (error) {
    console.error("Product detail error:", error);
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
      title: "Product Not Found",
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
  client: ReturnType<typeof createSupabaseServiceClient>,
  storagePath: string | null | undefined
) {
  if (!storagePath) {
    return "/images/editorial-mocha.svg";
  }

  return client.storage
    .from("product-images")
    .getPublicUrl(storagePath).data.publicUrl;
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

  const images = [...(product.product_images ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  const primaryImage =
    images.find((image) => image.is_primary) ?? images[0];

  const mainImage = getImageUrl(
    client,
    primaryImage?.storage_path
  );

  const activeVariants = (product.product_variants ?? []).filter(
    (variant) => variant.is_active
  );

  const hasVariants = activeVariants.length > 0;

  const startingPrice =
    product.sale_price !== null
      ? product.sale_price
      : product.price;

  const isInStock = hasVariants
    ? activeVariants.some((variant) => variant.stock > 0)
    : product.stock > 0;

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10 lg:py-16">
      <div className="mb-8">
        <Link
          href="/shop"
          className="text-xs font-medium tracking-[0.12em] text-looms-gray transition hover:text-looms-teal"
        >
          ← BACK TO SHOP
        </Link>
      </div>

      <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* PRODUCT IMAGE */}
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

        {/* PRODUCT INFORMATION */}
        <div className="flex flex-col justify-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-looms-gray">
            {product.is_new_arrival
              ? "NEW ARRIVAL"
              : product.is_best_seller
                ? "BEST SELLER"
                : "THE LOOMS COLLECTION"}
          </p>

          <h1 className="mt-4 font-display text-5xl leading-[0.95] text-looms-teal md:text-6xl">
            {product.name}
          </h1>

          <div className="mt-6 flex items-center gap-3">
            {product.sale_price !== null ? (
              <>
                <span className="text-lg font-medium text-looms-teal">
                  {formatRupiah(product.sale_price)}
                </span>

                <span className="text-sm text-looms-gray line-through">
                  {formatRupiah(product.price)}
                </span>
              </>
            ) : (
              <span className="text-lg font-medium text-looms-teal">
                {formatRupiah(product.price)}
              </span>
            )}
          </div>

          <div className="mt-8 max-w-xl">
            <p className="text-sm leading-7 text-looms-gray">
              {product.description ||
                "A considered LOOMS piece designed for everyday wear."}
            </p>
          </div>

          {/* VARIANTS */}
          {hasVariants ? (
            <div className="mt-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
                COLOUR
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {activeVariants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`border px-4 py-3 text-xs ${
                      variant.stock > 0
                        ? "border-looms-teal text-looms-teal"
                        : "border-gray-200 text-gray-400 line-through"
                    }`}
                  >
                    {variant.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* STOCK */}
          <div className="mt-7">
            {isInStock ? (
              <p className="text-xs font-medium text-green-700">
                In stock
              </p>
            ) : (
              <p className="text-xs font-medium text-red-600">
                Sold out
              </p>
            )}
          </div>

          {/* PURCHASE AREA */}
          <div className="mt-7 max-w-md">
            <ProductPurchase
              productId={product.id}
              variantId={
                hasVariants
                  ? activeVariants.find(
                      (variant) => variant.stock > 0
                    )?.id ?? null
                  : null
              }
              price={startingPrice}
              maxQuantity={
                hasVariants
                  ? Math.max(
                      ...activeVariants.map(
                        (variant) => variant.stock
                      )
                    )
                  : product.stock
              }
              disabled={!isInStock}
            />
          </div>

          {/* DETAILS */}
          <div className="mt-10 border-t border-gray-200 pt-7">
            <div className="grid gap-5 text-sm">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
                  MATERIAL
                </p>

                <p className="mt-2 text-looms-teal">
                  {product.material || "Premium Satin Voile"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
                  CARE
                </p>

                <p className="mt-2 text-looms-gray">
                  {product.care_instructions ||
                    "Hand wash cold. Dry flat away from direct sunlight."}
                </p>
              </div>

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

/* =========================================================
   PURCHASE COMPONENT
   ========================================================= */

import { use } from "react";

function ProductPurchase({
  productId,
  variantId,
  price,
  maxQuantity,
  disabled,
}: {
  productId: string;
  variantId: string | null;
  price: number;
  maxQuantity: number;
  disabled: boolean;
}) {
  void productId;
  void variantId;
  void price;

  const quantity = useQuantity();

  const canBuy = !disabled && maxQuantity > 0;

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={quantity.decrease}
          disabled={!canBuy || quantity.value <= 1}
          className="flex h-12 w-12 items-center justify-center border border-gray-300 text-xl text-looms-teal transition hover:border-looms-teal disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Decrease quantity"
        >
          −
        </button>

        <div className="flex h-12 min-w-16 items-center justify-center border border-gray-300 px-4 text-sm font-medium text-looms-teal">
          {quantity.value}
        </div>

        <button
          type="button"
          onClick={() =>
            quantity.increase(Math.max(1, maxQuantity))
          }
          disabled={
            !canBuy || quantity.value >= maxQuantity
          }
          className="flex h-12 w-12 items-center justify-center border border-gray-300 text-xl text-looms-teal transition hover:border-looms-teal disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <button
        type="button"
        disabled={!canBuy}
        className="mt-4 w-full bg-looms-teal px-6 py-4 text-xs font-medium tracking-[0.16em] text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {canBuy ? "ADD TO BAG" : "SOLD OUT"}
      </button>

      <button
        type="button"
        disabled={!canBuy}
        className="mt-3 w-full border border-looms-teal px-6 py-4 text-xs font-medium tracking-[0.16em] text-looms-teal transition hover:bg-looms-teal hover:text-looms-cream disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
      >
        BUY NOW
      </button>
    </div>
  );
}

/* =========================================================
   SIMPLE QUANTITY HOOK
   ========================================================= */

function useQuantity() {
  const [value, setValue] = useState(1);

  function decrease() {
    setValue((current) => Math.max(1, current - 1));
  }

  function increase(max: number) {
    setValue((current) =>
      Math.min(max, current + 1)
    );
  }

  return {
    value,
    decrease,
    increase,
  };
}
