"use client";

import Image from "next/image";
import Link from "next/link";
import type { DemoProduct } from "@/features/catalog/demo-data";
import { useCart } from "@/components/cart/cart-provider";
import { Icon } from "@/components/ui/icons";
import { PriceDisplay } from "./price-display";

export function ProductCard({ product }: { product: DemoProduct }) {
  const { addItem } = useCart();
  return <article className="group relative"><Link href={`/shop/${product.slug}`} className="block focus-visible:outline-offset-4"><div className="relative aspect-[4/5] overflow-hidden bg-[#d0c2b5]"><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-500 motion-safe:group-hover:scale-[1.03]" />{product.isNew && <span className="absolute left-3 top-3 bg-looms-cream px-2 py-1 text-[10px] font-medium tracking-[0.14em] text-looms-teal">NEW</span>}</div></Link><button type="button" aria-label={`Add ${product.name} to wishlist`} className="absolute right-3 top-3 grid h-9 w-9 place-items-center bg-looms-cream/85 text-looms-teal transition hover:bg-looms-cream"><Icon name="heart" className="h-4 w-4" /></button><div className="pt-4"><p className="text-[11px] uppercase tracking-[0.12em] text-looms-gray">{product.category}</p><div className="mt-1 flex items-start justify-between gap-3"><Link href={`/shop/${product.slug}`} className="font-medium text-looms-teal hover:underline">{product.name}</Link><PriceDisplay price={product.price} salePrice={product.salePrice} compact /></div><button type="button" onClick={() => addItem(product, product.id, product.variantIds[product.variants[0]], product.variants[0])} className="mt-4 border-b border-looms-teal pb-1 text-xs font-medium tracking-[0.1em] text-looms-teal transition hover:text-looms-gray">QUICK ADD</button></div></article>;
}
