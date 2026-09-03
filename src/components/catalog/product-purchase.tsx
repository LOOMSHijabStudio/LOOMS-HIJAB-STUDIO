"use client";

import { useState } from "react";

type ProductPurchaseProps = {
  productId: string;
  variantId: string | null;
  price: number;
  maxQuantity: number;
  disabled: boolean;
};

export function ProductPurchase({
  productId,
  variantId,
  price,
  maxQuantity,
  disabled,
}: ProductPurchaseProps) {
  const [quantity, setQuantity] = useState(1);

  const canBuy = !disabled && maxQuantity > 0;

  function decrease() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increase() {
    setQuantity((current) =>
      Math.min(Math.max(1, maxQuantity), current + 1)
    );
  }

  function handleAddToBag() {
    if (!canBuy) return;

    console.log("ADD TO BAG", {
      productId,
      variantId,
      price,
      quantity,
    });
  }

  function handleBuyNow() {
    if (!canBuy) return;

    console.log("BUY NOW", {
      productId,
      variantId,
      price,
      quantity,
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrease}
          disabled={!canBuy || quantity <= 1}
          className="flex h-12 w-12 items-center justify-center border border-gray-300 text-xl text-looms-teal transition hover:border-looms-teal disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Decrease quantity"
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
          className="flex h-12 w-12 items-center justify-center border border-gray-300 text-xl text-looms-teal transition hover:border-looms-teal disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={handleAddToBag}
        disabled={!canBuy}
        className="mt-4 w-full bg-looms-teal px-6 py-4 text-xs font-medium tracking-[0.16em] text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {canBuy ? "ADD TO BAG" : "SOLD OUT"}
      </button>

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
