"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  image?: string;
  description?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminHomePage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadHomeProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/placements?placement=HOME", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gagal memuat produk yang tampil di Home"
        );
      }

      setProducts(data.products || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat produk Home"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomeProducts();
  }, [loadHomeProducts]);

  async function handleRemoveFromHome(product: ProductRecord) {
    const confirmed = window.confirm(
      `Hapus "${product.name}" dari bagian Home?\n\nProduk tidak akan dihapus dari database. Produk hanya tidak akan tampil di Home.`
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMsg(null);

      const response = await fetch("/api/admin/placements", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: product.id,
          placement: "HOME",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gagal menghapus produk dari Home"
        );
      }

      setSuccessMsg(
        `"${product.name}" berhasil dihapus dari Home. Produk tetap tersimpan.`
      );

      await loadHomeProducts();

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Gagal menghapus produk dari Home"
      );
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
          Home Management
        </p>

        <h1 className="mt-1 font-display text-3xl text-looms-teal">
          Home
        </h1>

        <p className="text-xs text-gray-500 mt-1">
          Kelola produk yang ditampilkan pada bagian Home website LOOMS.
        </p>
      </div>

      {/* Notification */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari nama produk atau SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-looms-teal"
          />

          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="text-xs text-gray-500">
          Total: <strong>{filteredProducts.length}</strong> produk
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Produk & Foto</th>
                <th className="px-5 py-3.5">SKU</th>
                <th className="px-5 py-3.5">Harga</th>
                <th className="px-5 py-3.5">Stok</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-looms-teal border-t-transparent rounded-full animate-spin" />
                      <span>Memuat produk Home...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    Belum ada produk yang ditempatkan di Home.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    {/* Product */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                          <Image
                            src={
                              product.image ||
                              "/images/editorial-sand.svg"
                            }
                            alt={product.name}
                            fill
                            unoptimized={
                              product.image?.startsWith("http") ||
                              product.image?.startsWith("data:")
                            }
                            className="object-cover"
                          />
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {product.name}
                          </div>

                          <div className="text-[11px] text-gray-500 line-clamp-1 max-w-xs">
                            {product.description || "-"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-5 py-4 font-mono text-gray-600">
                      {product.sku}
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4">
                      {product.sale_price ? (
                        <div>
                          <span className="line-through text-gray-400 text-[11px]">
                            Rp {product.price.toLocaleString("id-ID")}
                          </span>

                          <div className="font-semibold text-emerald-700">
                            Rp{" "}
                            {product.sale_price.toLocaleString("id-ID")}
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">
                          Rp {product.price.toLocaleString("id-ID")}
                        </span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                          product.stock > 5
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : product.stock > 0
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {product.stock} pcs
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          product.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() =>
                          handleRemoveFromHome(product)
                        }
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition"
                      >
                        Hapus dari Home
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
