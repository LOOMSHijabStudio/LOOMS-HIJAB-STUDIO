"use client";

import Image from "next/image";
import Link from "next/link";

import type { DemoProduct } from "@/features/catalog/demo-data";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { Icon } from "@/components/ui/icons";
import { PriceDisplay } from "./price-display";

export function ProductCard({
  product,
}: {
  product: DemoProduct;
}) {
  console.log(
    "PRODUCT AVAILABILITY:",
    product.name,
    product.availability,
  );

  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const wishlisted = isWishlisted(product.id);

  const firstVariant = product.variants?.[0];
  const firstVariantId = firstVariant
    ? product.variantIds?.[firstVariant]
    : undefined;

  const availability = String(
    product.availability ?? "regular",
  )
    .trim()
    .toLowerCase();

  const isReadyStock =
    availability === "regular" ||
    availability === "ready_stock" ||
    availability === "ready-stock";

  const preorderDays = availability.startsWith(
    "preorder_",
  )
    ? availability.replace("preorder_", "")
    : "";

  function handleWishlist() {
    toggleWishlist(product.id);
  }

  function handleQuickAdd() {
    if (!firstVariant || !firstVariantId) {
      return;
    }

    addItem(
      product,
      product.id,
      firstVariantId,
      firstVariant,
    );
  }

  return (
    <article className="group relative">
      {/* PRODUCT IMAGE */}
      <Link
        href={`/shop/${product.slug}`}
        className="block focus-visible:outline-offset-4"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#d0c2b5]">
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 motion-safe:g
