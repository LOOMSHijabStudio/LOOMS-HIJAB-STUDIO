"use client";

import { useMemo, useState } from "react";
import { ProductGrid } from "./product-grid";
import type { DemoProduct } from "@/features/catalog/demo-data";

type ShopBrowserProps = {
  products: DemoProduct[];
};

export function ShopBrowser({
  products,
}: ShopBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [collection, setCollection] = useState("All");
  const [sort, setSort] = useState("featured");

  /*
   * KATEGORI DIAMBIL DARI DATA PRODUK
   *
   * Jadi tidak lagi hardcode:
   * - The Essential Edit
   * - Limited Collection
   * - New Arrivals
   *
   * Kategori akan mengikuti database.
   */
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) => product.category)
          .filter(Boolean),
      ),
    );

    return uniqueCategories.sort((a, b) =>
      a.localeCompare(b),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const results = products.filter((product) => {
      /*
       * CATEGORY
       */
      const matchesCategory =
        category === "All" ||
        product.category === category;

      /*
       * COLLECTION
       *
       * New arrivals:
       * is_new_arrival = true
       *
       * Best sellers:
       * is_best_seller = true
       *
       * Featured:
       * is_featured = true
       */
      const matchesCollection =
        collection === "All" ||
        (collection === "New arrivals" &&
          product.isNew === true) ||
        (collection === "Best sellers" &&
          product.isBestSeller === true) ||
        (collection === "Featured" &&
          "isFeatured" in product &&
          Boolean(
            (product as DemoProduct & {
              isFeatured?: boolean;
            }).isFeatured,
          ));

      /*
       * SEARCH
       */
      const searchText = query
        .trim()
        .toLowerCase();

      const matchesSearch =
        searchText === "" ||
        product.name
          .toLowerCase()
          .includes(searchText) ||
        product.category
          .toLowerCase()
          .includes(searchText);

      return (
        matchesCategory &&
        matchesCollection &&
        matchesSearch
      );
    });

    /*
     * SORT
     */
    return [...results].sort((a, b) => {
      if (sort === "price-low") {
        return a.price - b.price;
      }

      if (sort === "price-high") {
        return b.price - a.price;
      }

      if (sort === "new") {
        return (
          Number(Boolean(b.isNew)) -
          Number(Boolean(a.isNew))
        );
      }

      if (sort === "best") {
        return (
          Number(Boolean(b.isBestSeller)) -
          Number(Boolean(a.isBestSeller))
        );
      }

      if (sort === "featured") {
        const featuredA = Boolean(
          (a as DemoProduct & {
            isFeatured?: boolean;
          }).isFeatured,
        );

        const featuredB = Boolean(
          (b as DemoProduct & {
            isFeatured?: boolean;
          }).isFeatured,
        );

        return (
          Number(featuredB) -
          Number(featuredA)
        );
      }

      return 0;
    });
  }, [
    products,
    category,
    collection,
    query,
    sort,
  ]);

  return (
    <>
      {/* =====================================================
          FILTER BAR
      ===================================================== */}
      <div className="mt-10 grid gap-3 border-y border-looms-teal/15 py-4 md:grid-cols-4">
        {/* SEARCH */}
        <label className="md:col-span-2">
          <span className="sr-only">
            Search products
          </span>

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="SEARCH THE COLLECTION"
            className="w-full bg-transparent py-2 text-xs tracking-[0.1em] outline-none placeholder:text-looms-gray"
          />
        </label>

        {/* CATEGORY */}
        <label>
          <span className="sr-only">
            Filter category
          </span>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            className="w-full bg-transparent py-2 text-xs text-looms-teal outline-none"
          >
            <option value="All">
              All categories
            </option>

            {categories.map(
              (categoryName) => (
                <option
                  key={categoryName}
                  value={categoryName}
                >
                  {categoryName}
                </option>
              ),
            )}
          </select>
        </label>

        {/* SORT */}
        <label>
          <span className="sr-only">
            Sort products
          </span>

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
            className="w-full bg-transparent py-2 text-xs text-looms-teal outline-none"
          >
            <option value="featured">
              Featured
            </option>

            <option value="new">
              Newest
            </option>

            <option value="best">
              Best selling
            </option>

            <option value="price-low">
              Price: low to high
            </option>

            <option value="price-high">
              Price: high to low
            </option>
          </select>
        </label>
      </div>

      {/* =====================================================
          COLLECTION FILTER
      ===================================================== */}
      <div className="mt-3">
        <label>
          <span className="sr-only">
            Filter collection
          </span>

          <select
            value={collection}
            onChange={(event) =>
              setCollection(event.target.value)
            }
            className="bg-transparent py-2 text-xs text-looms-gray outline-none"
          >
            <option value="All">
              All products
            </option>

            <option value="New arrivals">
              New arrivals
            </option>

            <option value="Best sellers">
              Best sellers
            </option>

            <option value="Featured">
              Featured
            </option>
          </select>
        </label>
      </div>

      {/* =====================================================
          RESULT COUNT
      ===================================================== */}
      <p className="mt-8 text-xs text-looms-gray">
        {filteredProducts.length}{" "}
        {filteredProducts.length === 1
          ? "piece"
          : "pieces"}
      </p>

      {/* =====================================================
          PRODUCTS
      ===================================================== */}
      <div className="mt-6">
        {filteredProducts.length > 0 ? (
          <ProductGrid
            products={filteredProducts}
          />
        ) : (
          <p className="py-16 text-center text-sm text-looms-gray">
            No pieces match your selection.
          </p>
        )}
      </div>
    </>
  );
}
