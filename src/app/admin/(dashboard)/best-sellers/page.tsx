"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: string;
  image?: string;
};

export default function BestSellersAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/placements?placement=BEST_SELLERS",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
      } else {
        alert(data.error || "Gagal mengambil produk");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat mengambil produk");
    } finally {
      setLoading(false);
    }
  }

  async function removeFromBestSellers(productId: string) {
    const confirmed = window.confirm(
      "Hapus produk ini dari Best Sellers?\n\nProduk tidak akan dihapus dari database."
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin/placements", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          placement: "BEST_SELLERS",
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(
          data.error || "Gagal menghapus produk dari Best Sellers"
        );
        return;
      }

      setProducts((currentProducts) =>
        currentProducts.filter(
          (product) => product.id !== productId
        )
      );
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menghapus produk");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      product.name.toLowerCase().includes(keyword) ||
      product.sku.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="min-h-screen bg-looms-cream p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-looms-teal">
            Best Sellers
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Kelola produk yang ditampilkan di bagian Best Sellers.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari produk atau SKU..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-looms-teal"
          />
        </div>

        {/* Product Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Memuat produk...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Belum ada produk di Best Sellers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
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

                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      {/* Product */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-gray-100" />
                          )}

                          <div>
                            <div className="font-medium text-gray-900">
                              {product.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.sku}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        Rp {product.price.toLocaleString("id-ID")}
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.stock}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            product.status === "ACTIVE"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            removeFromBestSellers(product.id)
                          }
                          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Hapus dari Best Sellers
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total */}
        {!loading && (
          <div className="mt-4 text-sm text-gray-500">
            Menampilkan {filteredProducts.length} dari{" "}
            {products.length} produk.
          </div>
        )}
      </div>
    </div>
  );
}
