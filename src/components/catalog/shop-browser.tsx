"use client";

import { useMemo, useState } from "react";
import { ProductGrid } from "./product-grid";
import type { DemoProduct } from "@/features/catalog/demo-data";

type ShopBrowserProps = {
  products: DemoProduct[];
};

export function ShopBrowser({ products }: ShopBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [collection, setCollection] = useState("All");
  const [sort, setSort] = useState("featured");

  const filteredProducts = useMemo(() => {
    const results = products.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;

      const matchesCollection =
        collection === "All" ||
        (collection === "New arrivals" && product.isNew) ||
        (collection === "Best sellers" && product.isBestSeller);

      const matchesSearch = product.name
        .toLowerCase()
        .includes(query.toLowerCase());

      return matchesCategory && matchesCollection && matchesSearch;
    });

    return [...results].sort((a, b) => {
      if (sort === "price-low") {
        return a.price - b.price;
      }

      if (sort === "price-high") {
        return b.price - a.price;
      }

      if (sort === "new") {
        return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      }

      if (sort === "best") {
        return (
          Number(Boolean(b.isBestSeller)) -
          Number(Boolean(a.isBestSeller))
        );
      }

      return 0;
    });
  }, [products, category, collection, query, sort]);

  return (
    <>
      <div className="mt-10 grid gap-3 border-y border-looms-teal/15 py-4 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="sr-only">Search products</span>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="SEARCH THE COLLECTION"
            className="w-full bg-transparent py-2 text-xs tracking-[0.1em] outline-none placeholder:text-looms-gray"
          />
        </label>

        <label>
          <span className="sr-only">Filter category</span>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full bg-transparent py-2 text-xs text-looms-teal outline-none"
          >
            <option value="All">All</option>
            <option value="The Essential Edit">
              The Essential Edit
            </option>
            <option value="Limited Collection">
              Limited Collection
            </option>
            <option value="New Arrivals">
              New Arrivals
            </option>
          </select>
        </label>

        <label>
          <span className="sr-only">Sort products</span>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="w-full bg-transparent py-2 text-xs text-looms-teal outline-none"
          >
            <option value="featured">Featured</option>
            <option value="new">Newest</option>
            <option value="best">Best selling</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </div>

      <div className="mt-3">
        <label>
          <span className="sr-only">Filter collection</span>

          <select
            value={collection}
            onChange={(event) => setCollection(event.target.value)}
            className="bg-transparent py-2 text-xs text-looms-gray outline-none"
          >
            <option value="All">All</option>
            <option value="New arrivals">New arrivals</option>
            <option value="Best sellers">Best sellers</option>
          </select>
        </label>
      </div>

      <p className="mt-8 text-xs text-looms-gray">
        {filteredProducts.length}{" "}
        {filteredProducts.length === 1 ? "piece" : "pieces"}
      </p>

      <div className="mt-6">
        {filteredProducts.length > 0 ? (
          <ProductGrid products={filteredProducts} />
        ) : (
          <p className="py-16 text-center text-sm text-looms-gray">
            No pieces match your selection.
          </p>
        )}
      </div>
    </>
  );
}
