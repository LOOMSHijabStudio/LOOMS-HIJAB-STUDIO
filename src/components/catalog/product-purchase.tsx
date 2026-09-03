"use client";

import { useState } from "react";

import type { DemoProduct } from "@/features/catalog/demo-data";
import { useCart } from "@/components/cart/cart-provider";

type ProductPurchaseProps = {
  product: DemoProduct;
  variantId: string | null;
  variant: string;
  price: number;
  maxQuantity: number;
  disabled: boolean;
};

export function ProductPurchase({
  product,
  variantId,
  variant,
  price,
  maxQuantity,
  disabled,
}: ProductPurchaseProps) {
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const canBuy = !disabled && maxQuantity > 0;

  function decrease() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increase() {
    setQuantity((current) =>
      Math.min(maxQuantity, current + 1)
    );
  }

  function handleAddToBag() {
    if (!canBuy) return;

    const finalVariantId =
      variantId ?? product.id;

    addItem(
      product,
      product.id,
      finalVariantId,
      variant || "Default",
      quantity
    );

    setAdding(true);

    window.setTimeout(() => {
      setAdding(false);
    }, 700);
  }

  function handleBuyNow() {
    if (!canBuy) return;

    const finalVariantId =
      variantId ?? product.id;

    const buyNowItem = {
      product,
      productId: product.id,
      variantId: finalVariantId,
      variant: variant || "Default",
      quantity,
      price,
    };

    sessionStorage.setItem(
      "looms-buy-now",
      JSON.stringify(buyNowItem)
    );

    window.location.href =
      "/checkout?mode=buy-now";
  }

  return (
    <div>
      {/* QUANTITY */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrease}
          disabled={!canBuy || quantity <= 1}
          aria-label="Decrease quantity"
          className="flex h-12 w-12 items-center justify-center border border-gray-300 text-xl text-looms-teal transition hover:border-looms-teal disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>

        <div className="flex h-12 min-w-16 items-center justify-center border border-gray-300 px-4 text-sm font-medium text-looms-teal">
          {quantity}
        </div>

        <button
          type="button"
          onClick={increase}
          disabled={!canBuy || quantity >= maxQuantity}
          aria-label="Increase quantity"
          className="flex h-12 w-12 items-center justify-center border border-gray-300 text-xl text-looms-teal transition hover:border-looms-teal disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>

      {/* ADD TO BAG */}
      <button
        type="button"
        onClick={handleAddToBag}
        disabled={!canBuy || adding}
        className="mt-4 w-full bg-looms-teal px-6 py-4 text-xs font-medium tracking-[0.16em] text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {!canBuy
          ? "SOLD OUT"
          : adding
            ? "ADDED TO BAG"
            : "ADD TO BAG"}
      </button>

      {/* BUY NOW */}
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={!canBuy}
        className="mt-3 w-full border border-looms-teal px-6 py-4 text-xs font-medium tracking-[0.16em] text-looms-teal transition hover:bg-looms-teal hover:text-looms-cream disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
      >
        BUY NOW
      </button>
    </div>
  );
}
