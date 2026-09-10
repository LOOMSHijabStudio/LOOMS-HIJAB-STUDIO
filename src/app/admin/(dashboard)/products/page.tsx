"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

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
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  created_at: string;
  updated_at: string;
}

type PlacementType =
  | "ALL"
  | "NEW_ARRIVALS"
  | "BEST_SELLERS";

export default function AdminProductsPage() {
  const searchParams =
    useSearchParams();

  const placementParam =
    searchParams.get("placement");

  const placement: PlacementType =
    placementParam ===
    "NEW_ARRIVALS"
      ? "NEW_ARRIVALS"
      : placementParam ===
          "BEST_SELLERS"
        ? "BEST_SELLERS"
        : "ALL";

  const [products, setProducts] =
    useState<ProductRecord[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [editingProduct, setEditingProduct] =
    useState<ProductRecord | null>(null);

  const [editForm, setEditForm] =
    useState<{
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

  const [editImageFile, setEditImageFile] =
    useState<File | null>(null);

  const [editImagePreview, setEditImagePreview] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  /*
   * ==========================================
   * LOAD PRODUCTS
   * ==========================================
   */

  const loadProducts =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/admin/products",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Gagal memuat data produk"
          );
        }

        setProducts(
          Array.isArray(
            data.products
          )
            ? data.products
            : []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat produk"
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  /*
   * ==========================================
   * FILTER BERDASARKAN MENU
   * ==========================================
   */

  const placementProducts =
    useMemo(() => {
      let result = products;

      if (
        placement ===
        "NEW_ARRIVALS"
      ) {
        result = products.filter(
          (product) =>
            product.is_new_arrival ===
            true
        );
      }

      if (
        placement ===
        "BEST_SELLERS"
      ) {
        result = products.filter(
          (product) =>
            product.is_best_seller ===
            true
        );
      }

      const search =
        searchQuery
          .trim()
          .toLowerCase();

      if (search) {
        result = result.filter(
          (product) =>
            product.name
              .toLowerCase()
              .includes(search) ||
            product.sku
              .toLowerCase()
              .includes(search)
        );
      }

      return result;
    }, [
      products,
      placement,
      searchQuery,
    ]);

  /*
   * ==========================================
   * PAGE TITLE
   * ==========================================
   */

  const pageTitle =
    placement ===
    "NEW_ARRIVALS"
      ? "New Arrivals"
      : placement ===
          "BEST_SELLERS"
        ? "Best Sellers"
        : "Katalog Produk";

  const pageDescription =
    placement ===
    "NEW_ARRIVALS"
      ? "Kelola produk yang tampil di halaman New Arrivals."
      : placement ===
          "BEST_SELLERS"
        ? "Kelola produk yang tampil di halaman Best Sellers."
        : "Kelola harga, foto, stok, dan deskripsi produk LOOMS.";

  /*
   * ==========================================
   * EDIT PRODUCT
   * ==========================================
   */

  function openEditModal(
    product: ProductRecord
  ) {
    setEditingProduct(product);

    setEditForm({
      name: product.name,
      price:
        product.price.toString(),
      sale_price:
        product.sale_price !==
          null &&
        product.sale_price !==
          undefined
          ? product.sale_price.toString()
          : "",
      stock:
        product.stock.toString(),
      image:
        product.image ||
        "/images/editorial-sand.svg",
      status:
        product.status ||
        "ACTIVE",
      description:
        product.description ||
        "",
    });

    setEditImageFile(null);

    setEditImagePreview(
      product.image ||
        "/images/editorial-sand.svg"
    );
  }

  function closeEditModal() {
    if (
      editImagePreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        editImagePreview
      );
    }

    setEditImageFile(null);
    setEditImagePreview("");
    setEditingProduct(null);
  }

  function handleEditImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Format gambar harus JPG, PNG, atau WebP."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Ukuran gambar maksimal 5 MB."
      );

      event.target.value = "";

      return;
    }

    if (
      editImagePreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        editImagePreview
      );
    }

    setError(null);

    setEditImageFile(file);

    setEditImagePreview(
      URL.createObjectURL(file)
    );
  }

  async function handleSaveEdit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!editingProduct) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name: editForm.name,
        price: Number(
          editForm.price
        ),
        sale_price:
          editForm.sale_price
            ? Number(
                editForm.sale_price
              )
            : null,
        stock: Number(
          editForm.stock
        ),
        status:
          editForm.status,
        description:
          editForm.description,
      };

      const response =
        await fetch(
          `/api/admin/products/${editingProduct.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              payload
            ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Gagal memperbarui produk"
        );
      }

      if (editImageFile) {
        const imageFormData =
          new FormData();

        imageFormData.append(
          "image",
          editImageFile
        );

        const imageResponse =
          await fetch(
            `/api/admin/products/${editingProduct.id}/images`,
            {
              method: "POST",
              body: imageFormData,
            }
          );

        const imageData =
          await imageResponse.json();

        if (
          !imageResponse.ok ||
          !imageData.success
        ) {
          throw new Error(
            imageData.error ||
              "Data produk tersimpan, tetapi gambar gagal diunggah"
          );
        }
      }

      setSuccessMsg(
        `Produk "${editForm.name}" berhasil diperbarui!`
      );

      closeEditModal();

      await loadProducts();

      window.setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Gagal menyimpan perubahan"
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * ==========================================
   * DELETE PRODUCT
   * ==========================================
   */

  async function handleDeleteProduct(
    product: ProductRecord
  ) {
    const confirmed =
      window.confirm(
        `Apakah Anda yakin ingin menghapus produk "${product.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);

      const response =
        await fetch(
          `/api/admin/products/${product.id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Gagal menghapus produk"
        );
      }

      setSuccessMsg(
        `Produk "${product.name}" berhasil dihapus.`
      );

      await loadProducts();

      window.setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus produk"
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
            Catalog Management
          </p>

          <h1 className="mt-1 font-display text-3xl text-looms-teal">
            {pageTitle}
          </h1>

          <p className="mt-1 text-xs text-gray-500">
            {pageDescription}
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="self-start rounded-lg bg-looms-teal px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-looms-cream transition hover:bg-looms-teal/90"
        >
          + Tambah Produk Baru
        </Link>
      </div>

      {/* ===================================== */}
      {/* SUCCESS */}
      {/* ===================================== */}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <span>✓</span>
          <span>
            {successMsg}
          </span>
        </div>
      )}

      {/* ===================================== */}
      {/* ERROR */}
      {/* ===================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ===================================== */}
      {/* FILTER BAR */}
      {/* ===================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs outline-none transition focus:border-looms-teal focus:bg-white"
            />

            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
            Total:{" "}
            <strong>
              {
                placementProducts.length
              }
            </strong>{" "}
            produk
          </div>
        </div>
      </div>

      {/* ===================================== */}
      {/* TABLE */}
      {/* ===================================== */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">
                  Produk & Foto
                </th>

                <th className="px-5 py-3.5">
                  SKU
                </th>

                <th className="px-5 py-3.5">
                  Harga
                </th>

                <th className="px-5 py-3.5">
                  Stok
                </th>

                <th className="px-5 py-3.5">
                  Status
                </th>

                <th className="px-5 py-3.5 text-right">
                  Aksi
                </th>
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
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-looms-teal border-t-transparent" />
                      <span>
                        Memuat katalog...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : placementProducts.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center"
                  >
                    <p className="font-display text-2xl text-looms-teal">
                      Belum ada produk.
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {placement ===
                      "NEW_ARRIVALS"
                        ? "Belum ada produk yang ditandai sebagai New Arrivals."
                        : placement ===
                            "BEST_SELLERS"
                          ? "Belum ada produk yang ditandai sebagai Best Sellers."
                          : "Belum ada produk yang cocok dengan pencarian."}
                    </p>
                  </td>
                </tr>
              ) : (
                placementProducts.map(
                  (product) => (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-gray-50/80"
                    >
                      {/* PRODUCT */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            <Image
                              src={
                                product.image ||
                                "/images/editorial-sand.svg"
                              }
                              alt={
                                product.name
                              }
                              fill
                              unoptimized={
                                product.image?.startsWith(
                                  "http"
                                ) ||
                                product.image?.startsWith(
                                  "data:"
                                )
                              }
                              className="object-cover"
                            />
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {
                                product.name
                              }
                            </div>

                            <div className="line-clamp-1 max-w-xs text-[11px] text-gray-500">
                              {product.description ||
                                "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}

                      <td className="px-5 py-4 font-mono text-gray-600">
                        {product.sku}
                      </td>

                      {/* PRICE */}

                      <td className="px-5 py-4">
                        {product.sale_price ? (
                          <div>
                            <span className="text-[11px] text-gray-400 line-through">
                              Rp{" "}
                              {product.price.toLocaleString(
                                "id-ID"
                              )}
                            </span>

                            <div className="font-semibold text-emerald-700">
                              Rp{" "}
                              {product.sale_price.toLocaleString(
                                "id-ID"
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-gray-900">
                            Rp{" "}
                            {product.price.toLocaleString(
                              "id-ID"
                            )}
                          </span>
                        )}
                      </td>

                      {/* STOCK */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${
                            product.stock >
                            5
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : product.stock >
                                  0
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {
                            product.stock
                          }{" "}
                          pcs
                        </span>
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            product.status ===
                            "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {
                            product.status
                          }
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                product
                              )
                            }
                            className="rounded-lg bg-looms-teal/10 px-3 py-1.5 font-medium text-looms-teal transition hover:bg-looms-teal/20"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleDeleteProduct(
                                product
                              )
                            }
                            className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-600 transition hover:bg-red-100"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================== */}
      {/* EDIT MODAL */}
      {/* ===================================== */}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Edit Produk &
                  Harga
                </h2>

                <p className="text-xs text-gray-500">
                  SKU:{" "}
                  {
                    editingProduct.sku
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeEditModal
                }
                className="p-1 text-lg font-bold text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                handleSaveEdit
              }
              className="space-y-4 text-xs"
            >
              {/* NAME */}

              <div>
                <label className="mb-1 block font-semibold text-gray-700">
                  Nama Produk
                </label>

                <input
                  type="text"
                  required
                  value={
                    editForm.name
                  }
                  onChange={(event) =>
                    setEditForm(
                      {
                        ...editForm,
                        name: event.target.value,
                      }
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:border-looms-teal focus:bg-white"
                />
              </div>

              {/* PRICE */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-semibold text-gray-700">
                    Harga Normal
                    (Rp)
                  </label>

                  <input
                    type="number"
                    required
                    min="1"
                    value={
                      editForm.price
                    }
                    onChange={(event) =>
                      setEditForm(
                        {
                          ...editForm,
                          price: event.target.value,
                        }
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:border-looms-teal focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-gray-700">
                    Harga Promo /
                    Diskon
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      editForm.sale_price
                    }
                    onChange={(event) =>
                      setEditForm(
                        {
                          ...editForm,
                          sale_price:
                            event.target.value,
                        }
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:border-looms-teal focus:bg-white"
                  />
                </div>
              </div>

              {/* STOCK / STATUS */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-semibold text-gray-700">
                    Jumlah Stok
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    value={
                      editForm.stock
                    }
                    onChange={(event) =>
                      setEditForm(
                        {
                          ...editForm,
                          stock: event.target.value,
                        }
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:border-looms-teal focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-gray-700">
                    Status Publikasi
                  </label>

                  <select
                    value={
                      editForm.status
                    }
                    onChange={(event) =>
                      setEditForm(
                        {
                          ...editForm,
                          status:
                            event.target.value,
                        }
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:border-looms-teal focus:bg-white"
                  >
                    <option value="ACTIVE">
                      Active
                    </option>

                    <option value="DRAFT">
                      Draft
                    </option>

                    <option value="ARCHIVED">
                      Archived
                    </option>
                  </select>
                </div>
              </div>

              {/* IMAGE */}

              <div>
                <label className="mb-1 block font-semibold text-gray-700">
                  Gambar Produk
                </label>

                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-looms-teal/40 bg-looms-teal/5 px-4 py-3 text-center font-semibold text-looms-teal transition hover:bg-looms-teal/10">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleEditImageChange
                      }
                      className="sr-only"
                    />

                    {editImageFile
                      ? editImageFile.name
                      : "Pilih gambar dari perangkat"}
                  </label>

                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    <Image
                      src={
                        editImagePreview ||
                        "/images/editorial-sand.svg"
                      }
                      alt="Preview"
                      fill
                      unoptimized={
                        editImagePreview.startsWith(
                          "blob:"
                        ) ||
                        editImagePreview.startsWith(
                          "data:"
                        )
                      }
                      className="object-cover"
                    />
                  </div>
                </div>

                <p className="mt-2 text-[10px] text-gray-500">
                  Format JPG,
                  PNG, atau WebP.
                  Maksimal 5 MB.
                </p>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1 block font-semibold text-gray-700">
                  Deskripsi Produk
                </label>

                <textarea
                  rows={3}
                  value={
                    editForm.description
                  }
                  onChange={(event) =>
                    setEditForm(
                      {
                        ...editForm,
                        description:
                          event.target.value,
                      }
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:border-looms-teal focus:bg-white"
                />
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={
                    closeEditModal
                  }
                  className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="rounded-lg bg-looms-teal px-5 py-2 font-semibold text-looms-cream transition hover:bg-looms-teal/90 disabled:opacity-50"
                >
                  {isSaving
                    ? "Menyimpan..."
                    : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
