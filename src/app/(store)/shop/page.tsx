import type { Metadata } from "next";
import { ShopBrowser } from "@/components/catalog/shop-browser";
import { getCatalogProducts } from "@/server/store/catalog-store";

export const metadata: Metadata = {
  title: "Shop",
  description: "Explore the considered LOOMS collection.",
};

export default async function ShopPage() {
  const products = await getCatalogProducts();

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10 lg:py-16">
      <p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">
        THE LOOMS COLLECTION
      </p>

      <h1 className="mt-3 font-display text-5xl md:text-7xl">
        Shop all pieces.
      </h1>

      <p className="mt-5 max-w-lg text-sm leading-7 text-looms-gray">
        Explore the latest LOOMS collection, curated directly from our
        catalogue.
      </p>

      <ShopBrowser products={products} />
    </main>
  );
}
