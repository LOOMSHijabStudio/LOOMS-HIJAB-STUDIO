"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChangeEvent,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSearchParams } from "next/navigation";

interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock: number;
  availability: string;
  status: string;
  image?: string;
  description?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  placements?: string[];
}

interface SelectedImage {
  file: File;
  preview: string;
}

export default function AdminProductsPage() {
  const searchParams = useSearchParams();

  const placement = searchParams.get("placement");

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

  /* =====================================================
     EDIT MODAL
  ===================================================== */

  const [editingProduct, setEditingProduct] =
    useState<ProductRecord | null>(null);

  const [editForm, setEditForm] = useState<{
    name: string;
    price: string;
    sale_price: string;
    stock: string;
    availability: string;
    image: string;
    status: string;
    description: string;
  }>({
    name: "",
    price: "",
    sale_price: "",
    stock: "0",
    availability: "regular",
    image: "",
    status: "ACTIVE",
    description: "",
  });

  /* =====================================================
     FOTO UTAMA
  ===================================================== */

  const [editImageFile, setEditImageFile] =
    useState<File | null>(null);

  const [editImagePreview, setEditImagePreview] =
    useState("");

  /* =====================================================
     FOTO TAMBAHAN / SLIDER
  ===================================================== */

  const [additionalImages, setAdditionalImages] =
    useState<SelectedImage[]>([]);

  const [isSaving, setIsSaving] =
    useState(false);

  /* =====================================================
     LOAD PRODUCTS
  ===================================================== */

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        "/api/admin/products",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Gagal memuat data produk"
        );
      }

      setProducts(data.products || []);
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

  /* =====================================================
     OPEN EDIT MODAL
  ===================================================== */

  function openEditModal(
    product: ProductRecord
  ) {
    setEditingProduct(product);

    setEditForm({
      name: product.name,
      price: product.price.toString(),

      sale_price:
        product.sale_price !== null &&
        product.sale_price !== undefined
          ? product.sale_price.toString()
          : "",

      stock: product.stock.toString(),

      availability:
        product.availability ||
        "regular",

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

    /* Reset foto tambahan setiap membuka modal */
    setAdditionalImages([]);

    setError(null);
  }

  /* =====================================================
     CLOSE EDIT MODAL
  ===================================================== */

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

    additionalImages.forEach(
      (item) => {
        URL.revokeObjectURL(
          item.preview
        );
      }
    );

    setEditImageFile(null);

    setEditImagePreview("");

    setAdditionalImages([]);

    setEditingProduct(null);
  }

  /* =====================================================
     MAIN IMAGE CHANGE
  ===================================================== */

  function handleEditImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

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

  /* =====================================================
     ADDITIONAL IMAGES CHANGE
  ===================================================== */

  function handleAdditionalImagesChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    setError(null);

    const validFiles: SelectedImage[] =
      [];

    for (const file of files) {
      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type)
      ) {
        setError(
          `File "${file.name}" bukan JPG, PNG, atau WebP.`
        );

        continue;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setError(
          `File "${file.name}" lebih dari 5 MB.`
        );

        continue;
      }

      validFiles.push({
        file,
        preview:
          URL.createObjectURL(file),
      });
    }

    setAdditionalImages(
      (previous) => [
        ...previous,
        ...validFiles,
      ]
    );

    /* Supaya file yang sama bisa dipilih lagi */
    event.target.value = "";
  }

  /* =====================================================
     REMOVE ADDITIONAL IMAGE BEFORE SAVE
  ===================================================== */

  function removeAdditionalImage(
    index: number
  ) {
    setAdditionalImages(
      (previous) => {
        const target =
          previous[index];

        if (target) {
          URL.revokeObjectURL(
            target.preview
          );
        }

        return previous.filter(
          (_, i) =>
            i !== index
        );
      }
    );
  }

  /* =====================================================
     SAVE EDIT
  ===================================================== */

  async function handleSaveEdit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!editingProduct) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      /* =================================================
         1. UPDATE DATA PRODUK
      ================================================= */

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

        availability:
          editForm.availability,

        status:
          editForm.status,

        description:
          editForm.description,
      };

      const res = await fetch(
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
        await res.json();

      if (
        !res.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Gagal memperbarui produk"
        );
      }

      /* =================================================
         2. UPLOAD FOTO UTAMA
      ================================================= */

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
              "Data produk tersimpan, tetapi gambar utama gagal diunggah"
          );
        }
      }

      /* =================================================
         3. UPLOAD SEMUA FOTO TAMBAHAN
         
         Endpoint yang sama dipakai.
         Setiap file dikirim satu per satu
         menggunakan field "image".
      ================================================= */

      if (
        additionalImages.length >
        0
      ) {
        for (
          const item of additionalImages
        ) {
          const imageFormData =
            new FormData();

          imageFormData.append(
            "image",
            item.file
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
                `Foto "${item.file.name}" gagal diunggah`
            );
          }
        }
      }

      /* =================================================
         4. SUCCESS
      ================================================= */

      setSuccessMsg(
        `Produk "${editForm.name}" berhasil diperbarui! ${
          additionalImages.length > 0
            ? `${additionalImages.length} foto tambahan berhasil ditambahkan.`
            : ""
        }`
      );

      closeEditModal();

      await loadProducts();

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan perubahan"
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =====================================================
     DELETE PRODUCT
  ===================================================== */

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

      const res = await fetch(
        `/api/admin/products/${product.id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await res.json();

      if (
        !res.ok ||
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

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus produk"
      );
    }
  }

  /* =====================================================
     FILTER PLACEMENT
  ===================================================== */

  const placementFilteredProducts =
    placement === "NEW_ARRIVALS" ||
    placement === "BEST_SELLERS"
      ? products.filter(
          (product) =>
            product.placements?.includes(
              placement
            )
        )
      : products;

  const filteredProducts =
    placementFilteredProducts.filter(
      (p) => {
        const search =
          searchQuery.toLowerCase();

        return (
          p.name
            .toLowerCase()
            .includes(search) ||
          p.sku
            .toLowerCase()
            .includes(search)
        );
      }
    );

  const pageTitle =
    placement === "NEW_ARRIVALS"
      ? "New Arrivals"
      : placement === "BEST_SELLERS"
      ? "Best Sellers"
      : "Katalog Produk";

  const pageDescription =
    placement === "NEW_ARRIVALS"
      ? "Kelola produk yang tampil di halaman New Arrivals."
      : placement === "BEST_SELLERS"
      ? "Kelola produk yang tampil di halaman Best Sellers."
      : "Kelola harga, foto, stok, dan deskripsi produk LOOMS.";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

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
          className="flex items-center gap-1.5 self-start rounded-lg bg-looms-teal px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-looms-cream shadow-sm transition hover:bg-looms-teal/90 sm:self-auto"
        >
          <span>
            + Tambah Produk Baru
          </span>
        </Link>
      </div>

      {/* =================================================
          SUCCESS
      ================================================= */}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <span>✓</span>

          <span>
            {successMsg}
          </span>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          PLACEMENT INFO
      ================================================= */}

      {placement ===
        "NEW_ARRIVALS" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
          <strong>
            New Arrivals aktif.
          </strong>{" "}
          Yang ditampilkan hanya produk
          yang sudah diberi placement
          New Arrivals.
        </div>
      )}

      {placement ===
        "BEST_SELLERS" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <strong>
            Best Sellers aktif.
          </strong>{" "}
          Yang ditampilkan hanya produk
          yang sudah diberi placement
          Best Sellers.
        </div>
      )}

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

        <div className="relative max-w-md flex-1">

          <input
            type="text"
            placeholder="Cari nama produk atau SKU..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
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
            {filteredProducts.length}
          </strong>{" "}
          produk
        </div>
      </div>

      {/* =================================================
          PRODUCT TABLE
      ================================================= */}

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
              ) : filteredProducts.length ===
                0 ? (
                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    {placement ===
                    "NEW_ARRIVALS"
                      ? "Belum ada produk di New Arrivals."
                      : placement ===
                        "BEST_SELLERS"
                      ? "Belum ada produk di Best Sellers."
                      : "Belum ada produk yang cocok. Klik “+ Tambah Produk Baru” untuk membuat produk."}
                  </td>

                </tr>
              ) : (
                filteredProducts.map(
                  (product) => (
                    <tr
                      key={
                        product.id
                      }
                      className="transition-colors hover:bg-gray-50/80"
                    >

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
                              {product.name}
                            </div>

                            <div className="line-clamp-1 max-w-xs text-[11px] text-gray-500">
                              {product.description ||
                                "-"}
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

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${
                            product.stock >
                            5
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : product.stock >
                                0
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : "border border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {product.stock}{" "}
                          pcs
                        </span>

                      </td>

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

                      <td className="whitespace-nowrap px-5 py-4 text-right">

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
                              handleDeleteProduct(
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

      {/* =================================================
          EDIT PRODUCT MODAL
      ================================================= */}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">

            {/* HEADER */}

            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">

              <div>

                <h2 className="text-lg font-bold text-gray-900">
                  Edit Produk & Foto
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
              className="space-y-5 text-xs"
            >

              {/* =================================================
                  NAMA
              ================================================= */}

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
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      name: e.target
                        .value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-looms-teal focus:bg-white focus:outline-none"
                />

              </div>

              {/* =================================================
                  PRICE
              ================================================= */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-1 block font-semibold text-gray-700">
                    Harga Normal (Rp)
                  </label>

                  <input
                    type="number"
                    required
                    min="1"
                    value={
                      editForm.price
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        price: e.target
                          .value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-looms-teal focus:bg-white focus:outline-none"
                  />

                </div>

                <div>

                  <label className="mb-1 block font-semibold text-gray-700">
                    Harga Promo / Diskon (Rp)
                  </label>

                  <input
                    type="number"
                    min="0"
                    placeholder="Kosongkan jika tidak ada"
                    value={
                      editForm.sale_price
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        sale_price:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-looms-teal focus:bg-white focus:outline-none"
                  />

                </div>

              </div>

              {/* =================================================
                  STOCK & STATUS
              ================================================= */}

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
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        stock: e.target
                          .value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-looms-teal focus:bg-white focus:outline-none"
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
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-looms-teal focus:bg-white focus:outline-none"
                  >

                    <option value="ACTIVE">
                      Active (Tampil di Toko)
                    </option>

                    <option value="DRAFT">
                      Draft (Disembunyikan)
                    </option>

                    <option value="ARCHIVED">
                      Archived
                    </option>

                  </select>

                </div>

              </div>

              {/* =================================================
                  AVAILABILITY
              ================================================= */}

              <div>

                <label className="mb-1 block font-semibold text-gray-700">
                  Ketersediaan Produk
                </label>

                <select
                  value={
                    editForm.availability
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      availability:
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-looms-teal focus:bg-white focus:outline-none"
                >

                  <option value="regular">
                    Regular — Ready Stock
                  </option>

                  <option value="preorder_3">
                    Pre-Order — 3 Hari
                  </option>

                  <option value="preorder_5">
                    Pre-Order — 5 Hari
                  </option>

                  <option value="preorder_7">
                    Pre-Order — 7 Hari
                  </option>

                  <option value="preorder_14">
                    Pre-Order — 14 Hari
                  </option>

                  <option value="preorder_30">
                    Pre-Order — 30 Hari
                  </option>

                </select>

              </div>

              {/* =================================================
                  FOTO UTAMA
              ================================================= */}

              <div>

                <label className="mb-1 block font-semibold text-gray-700">
                  Foto Utama Produk
                </label>

                <div className="flex items-center gap-4">

                  <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-looms-teal/40 bg-looms-teal/5 px-4 py-4 text-center font-semibold text-looms-teal transition hover:bg-looms-teal/10">

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
                      : "Pilih foto utama"}

                  </label>

                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">

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
                  Foto utama yang akan
                  tampil pertama kali di
                  halaman produk.
                </p>

              </div>

              {/* =================================================
                  FOTO TAMBAHAN
              ================================================= */}

              <div className="rounded-xl border border-looms-teal/20 bg-looms-teal/[0.03] p-4">

                <div className="mb-3">

                  <h3 className="font-semibold text-looms-teal">
                    Foto Tambahan Produk
                  </h3>

                  <p className="mt-1 text-[10px] leading-5 text-gray-500">
                    Tambahkan beberapa foto
                    dari angle berbeda untuk
                    slider foto di halaman
                    detail produk.
                  </p>

                </div>

                {/* UPLOAD BUTTON */}

                <label className="block cursor-pointer rounded-lg border border-dashed border-looms-teal/40 bg-white px-4 py-4 text-center font-semibold text-looms-teal transition hover:bg-looms-teal/5">

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleAdditionalImagesChange
                    }
                    className="sr-only"
                  />

                  <span className="text-sm">
                    + Tambahkan Foto Produk
                  </span>

                  <span className="mt-1 block text-[10px] font-normal text-gray-500">
                    Bisa pilih beberapa foto
                    sekaligus · JPG, PNG, WebP ·
                    Maks. 5 MB/foto
                  </span>

                </label>

                {/* PREVIEW FOTO TAMBAHAN */}

                {additionalImages.length >
                  0 && (
                  <div className="mt-4">

                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Foto yang akan
                      ditambahkan (
                      {
                        additionalImages.length
                      }
                      )
                    </p>

                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">

                      {additionalImages.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={`${item.file.name}-${index}`}
                            className="group relative"
                          >

                            <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">

                              <Image
                                src={
                                  item.preview
                                }
                                alt={`Foto tambahan ${index + 1}`}
                                fill
                                unoptimized
                                className="object-cover"
                              />

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeAdditionalImage(
                                  index
                                )
                              }
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                              aria-label={`Hapus foto ${index + 1}`}
                            >
                              ×
                            </button>

                            <p className="mt-1 truncate text-[9px] text-gray-500">
                              {item.file.name}
                            </p>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

              </div>

              {/* =================================================
                  DESCRIPTION
              ================================================= */}

              <div>

                <label className="mb-1 block font-semibold text-gray-700">
                  Deskripsi Produk
                </label>

                <textarea
                  rows={3}
                  value={
                    editForm.description
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      description:
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-looms-teal focus:bg-white focus:outline-none"
                />

              </div>

              {/* =================================================
                  BUTTON
              ================================================= */}

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
                  disabled={isSaving}
                  className="rounded-lg bg-looms-teal px-5 py-2 font-semibold text-looms-cream transition hover:bg-looms-teal/90 disabled:opacity-50"
                >
                  {isSaving
                    ? "Menyimpan foto & produk..."
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
