"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: string;
  image?: string | null;
  placements?: string[];
};

export default function CollectionAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ==========================================
  // LOAD PRODUCTS FROM ADMIN PRODUCTS API
  // ==========================================
  async function loadProducts() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/products", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal mengambil produk");
      }

      const allProducts: Product[] = data.products || [];

      // HANYA PRODUK YANG MASUK COLLECTION
      const collectionProducts = allProducts.filter((product) =>
        product.placements?.includes("COLLECTION")
      );

      setProducts(collectionProducts);
    } catch (error) {
      console.error("Collection products error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil produk"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // REMOVE PRODUCT FROM COLLECTION
  // ==========================================
  async function removeFromCollection(productId: string) {
    const confirmed = window.confirm(
      "Hapus produk ini dari Collection?\n\n" +
        "Produk tidak akan dihapus dari database. " +
        "Produk hanya akan dikeluarkan dari Collection."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(productId);

      const response = await fetch("/api/admin/placements", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          placement: "COLLECTION",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gagal menghapus produk dari Collection"
        );
      }

      // Hapus langsung dari tampilan
      setProducts((current) =>
        current.filter((product) => product.id !== productId)
      );
    } catch (error) {
      console.error("Remove collection error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus produk"
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    void loadProducts();
  }, []);

  // ==========================================
  // SEARCH
  // ==========================================
  const filteredProducts = products.filter((product) => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(keyword) ||
      product.sku.toLowerCase().includes(keyword)
    );
  });

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-looms-cream p-6">
      <div className="mx-auto max-w-7xl">
        {/* ==========================================
            HEADER
        ========================================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-looms-teal">
                Collection
              </h1>

              <p className="mt-2 text-sm text-gray-600">
                Kelola produk yang ditampilkan di bagian Collection.
              </p>
            </div>

            {!loading && (
              <div className="rounded-full bg-looms-teal/10 px-4 py-2 text-sm font-medium text-looms-teal">
                {products.length} produk
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            SEARCH
        ========================================== */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari produk atau SKU..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-looms-teal"
          />
        </div>

        {/* ==========================================
            PRODUCT TABLE
        ========================================== */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Memuat produk Collection...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-gray-700">
                Belum ada produk di Collection.
              </p>

              {search ? (
                <p className="mt-2 text-sm text-gray-500">
                  Tidak ada produk yang cocok dengan pencarian "{search}".
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Tambahkan produk ke Collection melalui pengaturan placement
                  produk.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* ==========================================
                    TABLE HEADER
                ========================================== */}
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Produk
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      SKU
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Harga
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Stok
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                      Aksi
                    </th>
                  </tr>
                </thead>

                {/* ==========================================
                    TABLE BODY
                ========================================== */}
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      {/* PRODUK */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                              No Image
                            </div>
                          )}

                          <div>
                            <div className="font-medium text-gray-900">
                              {product.name}
                            </div>

                            <div className="mt-1 text-xs text-gray-500">
                              {product.status}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.sku}
                      </td>

                      {/* HARGA */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        Rp {product.price.toLocaleString("id-ID")}
                      </td>

                      {/* STOK */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.stock}
                      </td>

                      {/* AKSI */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeFromCollection(product.id)}
                          disabled={deletingId === product.id}
                          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === product.id
                            ? "Menghapus..."
                            : "Hapus dari Collection"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
