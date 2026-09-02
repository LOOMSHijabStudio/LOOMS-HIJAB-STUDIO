"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, useEffect, useState, useCallback } from "react";

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

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    price: string;
    sale_price: string;
    stock: string;
    image: string;
    status: string;
    description: string;
  }>({
    name: "",
    price: "",
    sale_price: "",
    stock: "0",
    image: "",
    status: "ACTIVE",
    description: "",
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/products", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat data produk");
      }

      setProducts(data.products || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Gagal memuat produk"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function openEditModal(product: ProductRecord) {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price: product.price.toString(),
      sale_price: product.sale_price ? product.sale_price.toString() : "",
      stock: product.stock.toString(),
      image: product.image || "/images/editorial-sand.svg",
      status: product.status || "ACTIVE",
      description: product.description || "",
    });
    setEditImageFile(null);
    setEditImagePreview(product.image || "/images/editorial-sand.svg");
  }

  function closeEditModal() {
    if (editImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(editImagePreview);
    }
    setEditImageFile(null);
    setEditImagePreview("");
    setEditingProduct(null);
  }

  function handleEditImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format gambar harus JPG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      event.target.value = "";
      return;
    }

    if (editImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(editImagePreview);
    }
    setError(null);
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name: editForm.name,
        price: Number(editForm.price),
        sale_price: editForm.sale_price ? Number(editForm.sale_price) : null,
        stock: Number(editForm.stock),
        status: editForm.status,
        description: editForm.description,
      };

      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui produk");
      }

      if (editImageFile) {
        const imageFormData = new FormData();
        imageFormData.append("image", editImageFile);

        const imageResponse = await fetch(
          `/api/admin/products/${editingProduct.id}/images`,
          {
            method: "POST",
            body: imageFormData,
          }
        );
        const imageData = await imageResponse.json();
        if (!imageResponse.ok || !imageData.success) {
          throw new Error(
            imageData.error || "Data produk tersimpan, tetapi gambar gagal diunggah"
          );
        }
      }

      setSuccessMsg(`Produk "${editForm.name}" berhasil diperbarui!`);
      closeEditModal();
      await loadProducts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct(product: ProductRecord) {
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus produk");
      }
      setSuccessMsg(`Produk "${product.name}" berhasil dihapus.`);
      await loadProducts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus produk");
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
            Catalog Management
          </p>
          <h1 className="mt-1 font-display text-3xl text-looms-teal">
            Katalog Produk
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kelola harga, foto, stok, dan deskripsi produk LOOMS
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="self-start sm:self-auto rounded-lg bg-looms-teal px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-looms-cream transition hover:bg-looms-teal/90 shadow-sm flex items-center gap-1.5"
        >
          <span>+ Tambah Produk Baru</span>
        </Link>
      </div>

      {/* Notification Toast */}
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

      {/* Search & Filter Bar */}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-xs text-gray-500">
          Total: <strong>{filteredProducts.length}</strong> produk
        </div>
      </div>

      {/* Table of Products */}
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
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-looms-teal border-t-transparent rounded-full animate-spin" />
                      <span>Memuat katalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    Belum ada produk yang cocok. Klik &ldquo;+ Tambah Produk Baru&rdquo; untuk membuat produk.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                          <Image
                            src={product.image || "/images/editorial-sand.svg"}
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
                    <td className="px-5 py-4 font-mono text-gray-600">
                      {product.sku}
                    </td>
                    <td className="px-5 py-4">
                      {product.sale_price ? (
                        <div>
                          <span className="line-through text-gray-400 text-[11px]">
                            Rp {product.price.toLocaleString("id-ID")}
                          </span>
                          <div className="font-semibold text-emerald-700">
                            Rp {product.sale_price.toLocaleString("id-ID")}
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">
                          Rp {product.price.toLocaleString("id-ID")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                        product.stock > 5
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : product.stock > 0
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {product.stock} pcs
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        product.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="px-3 py-1.5 bg-looms-teal/10 hover:bg-looms-teal/20 text-looms-teal rounded-lg font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Edit Produk & Harga
                </h2>
                <p className="text-xs text-gray-500">
                  SKU: {editingProduct.sku}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal"
                />
              </div>

              {/* Price & Sale Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Harga Normal (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Harga Promo / Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Kosongkan jika tidak ada"
                    value={editForm.sale_price}
                    onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal"
                  />
                </div>
              </div>

              {/* Stock & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Status Publikasi
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal"
                  >
                    <option value="ACTIVE">Active (Tampil di Toko)</option>
                    <option value="DRAFT">Draft (Disembunyikan)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              {/* Image Upload & Preview */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Gambar Produk
                </label>
                <div className="flex gap-4 items-center">
                  <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-looms-teal/40 bg-looms-teal/5 px-4 py-3 text-center font-semibold text-looms-teal transition hover:bg-looms-teal/10">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleEditImageChange}
                      className="sr-only"
                    />
                    {editImageFile ? editImageFile.name : "Pilih gambar dari perangkat"}
                  </label>
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    <Image
                      src={editImagePreview || "/images/editorial-sand.svg"}
                      alt="Preview"
                      fill
                      unoptimized={editImagePreview.startsWith("blob:") || editImagePreview.startsWith("data:")}
                      className="object-cover"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-500">
                  Format JPG, PNG, atau WebP. Maksimal 5 MB.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-looms-teal hover:bg-looms-teal/90 text-looms-cream rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
