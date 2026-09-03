"use client";

import { useMemo, useState } from "react";

import type { DemoProduct } from "@/features/catalog/demo-data";
import { ProductPurchase } from "@/components/catalog/product-purchase";

type ProductDetailVariant = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  is_active: boolean;
};

type ProductDetailPurchaseProps = {
  product: DemoProduct;
  variants: ProductDetailVariant[];
  defaultVariantId: string | null;
  basePrice: number;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductDetailPurchase({
  product,
  variants,
  defaultVariantId,
  basePrice,
}: ProductDetailPurchaseProps) {
  const activeVariants = useMemo(
    () =>
      variants.filter(
        (variant) => variant.is_active
      ),
    [variants]
  );

  const firstAvailableVariant =
    activeVariants.find(
      (variant) => variant.stock > 0
    ) ?? activeVariants[0] ?? null;

  const initialVariantId =
    defaultVariantId &&
    activeVariants.some(
      (variant) =>
        variant.id === defaultVariantId
    )
      ? defaultVariantId
      : firstAvailableVariant?.id ?? null;

  const [selectedVariantId, setSelectedVariantId] =
    useState<string | null>(
      initialVariantId
    );

  const selectedVariant =
    activeVariants.find(
      (variant) =>
        variant.id === selectedVariantId
    ) ?? null;

  const selectedPrice =
    selectedVariant?.price ??
    basePrice;

  const selectedStock =
    selectedVariant?.stock ??
    0;

  const hasVariants =
    activeVariants.length > 0;

  const canBuy =
    hasVariants
      ? selectedStock > 0
      : product.stock > 0;

  function handleSelectVariant(
    variant: ProductDetailVariant
  ) {
    if (variant.stock <= 0) return;

    setSelectedVariantId(variant.id);
  }

  return (
    <div>
      {/* VARIANT / COLOUR */}
      {hasVariants && (
        <div className="mb-7">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
            COLOUR
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {activeVariants.map(
              (variant) => {
                const isSelected =
                  selectedVariantId ===
                  variant.id;

                const variantPrice =
                  variant.price ??
                  basePrice;

                const isAvailable =
                  variant.stock > 0;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() =>
                      handleSelectVariant(
                        variant
                      )
                    }
                    disabled={
                      !isAvailable
                    }
                    aria-pressed={
                      isSelected
                    }
                    title={
                      isAvailable
                        ? `Stock ${variant.stock}`
                        : "Sold out"
                    }
                    className={`border px-4 py-3 text-left text-xs transition ${
                      !isAvailable
                        ? "cursor-not-allowed border-gray-200 text-gray-400"
                        : isSelected
                          ? "border-looms-teal bg-looms-teal text-looms-cream"
                          : "border-looms-teal text-looms-teal hover:bg-looms-teal/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {variant.name}
                      </span>

                      {!isAvailable && (
                        <span className="text-[9px] uppercase tracking-[0.08em]">
                          SOLD OUT
                        </span>
                      )}
                    </div>

                    {variantPrice !==
                      basePrice && (
                      <div
                        className={`mt-1 text-[10px] ${
                          isSelected
                            ? "text-looms-cream/70"
                            : "text-looms-gray"
                        }`}
                      >
                        {formatRupiah(
                          variantPrice
                        )}
                      </div>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {/* SELECTED VARIANT INFO */}
          {selectedVariant && (
            <div className="mt-3 flex items-center justify-between gap-4 text-xs">
              <span className="text-looms-gray">
                Selected:{" "}
                <span className="font-medium text-looms-teal">
                  {selectedVariant.name}
                </span>
              </span>

              <span
                className={
                  selectedStock > 0
                    ? "font-medium text-green-700"
                    : "font-medium text-red-600"
                }
              >
                {selectedStock > 0
                  ? `${selectedStock} pcs available`
                  : "Sold out"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* PRICE */}
      <div className="mb-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-looms-gray">
          PRICE
        </p>

        <p className="mt-2 text-lg font-medium text-looms-teal">
          {formatRupiah(
            selectedPrice
          )}
        </p>
      </div>

      {/* PURCHASE */}
      <ProductPurchase
        product={product}
        variantId={
          selectedVariant?.id ??
          null
        }
        variant={
          selectedVariant?.name ??
          "Default"
        }
        price={selectedPrice}
        maxQuantity={
          hasVariants
            ? selectedStock
            : product.stock
        }
        disabled={!canBuy}
      />
    </div>
  );
}
