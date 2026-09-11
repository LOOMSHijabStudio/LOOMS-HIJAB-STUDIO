"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChangeEvent,
  useCallback,
  useEffect,
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
  availability: string;
  status: string;
  image?: string;
  description?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  placements?: string[];
}

interface ProductImageRecord {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  position: number;
  is_primary: boolean;
}

interface ProductImageUpload {
  file: File;
  preview: string;
}

export default function AdminProductsPage() {
  const searchParams = useSearchParams();

  const placement = searchParams.get("placement");

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  /* =====================================================
     EDIT MODAL
  ===================================================== */

  const [editingProduct, setEditingProduct] =
    useState<ProductRecord | null>(null);

  const [editForm, setEditForm] = useState({
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
     SINGLE MAIN IMAGE
  ===================================================== */

  const [editImageFile, setEditImageFile] =
    useState<File | null>(null);

  const [editImagePreview, setEditImagePreview] =
    useState("");

  /* =====================================================
     EXISTING PRODUCT IMAGES
  ===================================================== */

  const [existingImages, setExistingImages] =
    useState<ProductImageRecord[]>([]);

  const [isLoadingImages, setIsLoadingImages] =
    useState(false);

  const [deletingImageId, setDeletingImageId] =
    useState<string | null>(null);

  /* =====================================================
     MULTIPLE PRODUCT IMAGES
  ===================================================== */

  const [additionalImages, setAdditionalImages] =
    useState<ProductImageUpload[]>([]);

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
     LOAD EXISTING IMAGES
  ===================================================== */

  async function loadExistingImages(
    productId: string
  ) {
    try {
      setIsLoadingImages(true);

      const response = await fetch(
        `/api/admin/products/${productId}/images`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Gagal memuat foto produk"
        );
      }

      setExistingImages(
        data.images || []
      );
    } catch (imageError) {
      setExistingImages([]);

      setError(
        imageError instanceof Error
          ? imageError.message
          : "Gagal memuat foto produk"
      );
    } finally {
      setIsLoadingImages(false);
    }
  }

  /* =====================================================
     OPEN EDIT
  ===================================================== */

  function openEditModal(
    product: ProductRecord
  ) {
    setEditingProduct(product);

    setEditForm({
      name: product.name,
      price: product.price.toString(),
      sale_price:
        product.sale_price !== null
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
        product.description || "",
    });

    setEditImageFile(null);

    setEditImagePreview(
      product.image ||
        "/images/editorial-sand.svg"
    );

    setAdditionalImages([]);
    setExistingImages([]);
    setError(null);

    void loadExistingImages(product.id);
  }

  /* =====================================================
     CLOSE EDIT
  ===================================================== */

  function closeEditModal() {
    if (
      editImagePreview.startsWith("blob:")
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
    setExistingImages([]);

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
      editImagePreview.startsWith("blob:")
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
     MULTIPLE IMAGE CHANGE
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

    const currentTotal =
      existingImages.length +
      additionalImages.length;

    const remainingSlots =
      3 - currentTotal;

    if (remainingSlots <= 0) {
      setError(
        "Maksimal 3 foto produk."
      );

      event.target.value = "";
      return;
    }

    const selectedFiles =
      files.slice(
        0,
        remainingSlots
      );

    if (
      files.length >
      remainingSlots
    ) {
      setError(
        `Maksimal 3 foto. Hanya ${remainingSlots} foto yang dapat ditambahkan.`
      );
    }

    const validFiles: ProductImageUpload[] =
      [];

    for (const file of selectedFiles) {
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
      (current) => [
        ...current,
        ...validFiles,
      ]
    );

    event.target.value = "";
  }

  /* =====================================================
     REMOVE NEW ADDITIONAL IMAGE
  ===================================================== */

  function removeAdditionalImage(
    index: number
  ) {
    setAdditionalImages(
      (current) => {
        const target =
          current[index];

        if (target) {
          URL.revokeObjectURL(
            target.preview
          );
        }

        return current.filter(
          (_, itemIndex) =>
            itemIndex !== index
        );
      }
    );
  }

  /* =====================================================
     DELETE EXISTING IMAGE
  ===================================================== */

  async function handleDeleteExistingImage(
    image: ProductImageRecord
  ) {
    if (!editingProduct) {
      return;
    }

    const confirmed =
      window.confirm(
        "Hapus foto ini dari produk?\n\nData produk, harga, stok, dan Pre-Order TIDAK akan terhapus."
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingImageId(image.id);
      setError(null);
      setSuccessMsg(null);

      const response =
        await fetch(
          `/api/admin/products/${editingProduct.id}/images`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              imageId: image.id,
            }),
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
            "Gagal menghapus foto"
        );
      }

      setExistingImages(
        (current) =>
          current.filter(
            (item) =>
              item.id !== image.id
          )
      );

      setSuccessMsg(
        "Foto berhasil dihapus. Data Pre-Order dan produk tetap aman."
      );

      window.setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus foto"
      );
    } finally {
      setDeletingImageId(null);
    }
  }

  /* =====================================================
     SAVE EDIT
  ===================================================== */

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
      /* -----------------------------------------------
         UPDATE PRODUCT DATA
      ------------------------------------------------ */

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

      const response =
        await fetch(
          `/api/admin/products/${editingProduct.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
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

      /* -----------------------------------------------
         UPLOAD MAIN IMAGE
      ------------------------------------------------ */

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
              body:
                imageFormData,
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
              "Produk tersimpan, tetapi gambar utama gagal diunggah."
          );
        }
      }

      /* -----------------------------------------------
         UPLOAD ADDITIONAL IMAGES
      ------------------------------------------------ */

      if (
        additionalImages.length >
        0
      ) {
        for (
          const imageItem of additionalImages
        ) {
          const imageFormData =
            new FormData();

          imageFormData.append(
            "image",
            imageItem.file
          );

          const imageResponse =
            await fetch(
              `/api/admin/products/${editingProduct.id}/images`,
              {
                method: "POST",
                body:
                  imageFormData,
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
                `Foto "${imageItem.file.name}" gagal diunggah.`
            );
          }
        }
      }

      /* -----------------------------------------------
         SUCCESS
      ------------------------------------------------ */

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

  /* =====================================================
     PLACEMENT FILTER
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
      (product) => {
        const search =
          searchQuery
            .toLowerCase()
            .trim();

        return (
          product.name
            .toLowerCase()
            .includes(search) ||
          product.sku
            .toLowerCase()
            .includes(search)
        );
      }
    );

  const pageTitle =
    placement === "NEW_ARRIVALS"
      ? "New Arrivals"
      : placement ===
        "BEST_SELLERS"
      ? "Best Sellers"
      : "Katalog Produk";

  const pageDescription =
    placement === "NEW_ARRIVALS"
      ? "Kelola produk yang tampil di halaman New Arrivals."
      : placement ===
        "BEST_SELLERS"
      ? "Kelola produk yang tampil di halaman Best Sellers."
      : "Kelola harga, foto, stok, dan deskripsi produk LOOMS.";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="space-y-6">

      {/* HEADER */}

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
          className="self-start rounded-lg bg-looms-teal px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-looms-cream shadow-sm transition hover:bg-looms-teal/90 sm:self-auto"
        >
          + Tambah Produk Baru
        </Link>
      </div>

      {/* SUCCESS */}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <span>✓</span>
          <span>
            {successMsg}
          </span>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* PLACEMENT */}

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

      {/* SEARCH */}

      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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

        <div className="whitespace-nowrap text-xs text-gray-500">
          Total:{" "}
          <strong>
            {
              filteredProducts.length
            }
          </strong>{" "}
          produk
        </div>
      </div>

      {/* TABLE */}

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
                    Belum ada produk yang
                    cocok.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(
                  (product) => (
                    <tr
                      key={product.id}
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
                              {
                                product.name
                              }
                            </div>

                            <div className="line-clamp-1 max-w-xs text-[11px] text-gray-500">
                              {
                                product.description ||
                                "-"
                              }
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
                          {
                            product.stock
                          }{" "}
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
                        <div className="flex justify-end gap-2">
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
          EDIT MODAL
      ================================================= */}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">

            {/* MODAL HEADER */}

            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Edit Produk
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
                className="p-1 text-lg font-bold text-gray-400 transition hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit=
