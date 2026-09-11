"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChangeEvent,
  FormEvent,
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

interface ProductImageUpload {
  file: File;
  preview: string;
}

interface ProductImageRecord {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  position: number;
  is_primary: boolean;
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

  const loadExistingImages = useCallback(
    async (productId: string) => {
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
          Array.isArray(data.images)
            ? data.images
            : []
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
    },
    []
  );

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
    setDeletingImageId(null);
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
      Math.max(
        0,
        3 - currentTotal
      );

    if (remainingSlots <= 0) {
      setError(
        "Maksimal 3 foto untuk setiap produk."
      );

      event.target.value = "";
      return;
    }

    const filesToProcess =
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

    for (const file of filesToProcess) {
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
     REMOVE ADDITIONAL IMAGE
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
        image.is_primary
          ? "Hapus foto utama ini? Foto lain akan otomatis menjadi foto utama."
          : "Hapus foto produk ini?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingImageId(
        image.id
      );

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
            "Gagal menghapus foto produk"
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
        "Foto produk berhasil dihapus."
      );

      await loadProducts();

      window.setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus foto produk"
      );
    } finally {
      setDeletingImageId(null);
    }
  }

  /* =====================================================
     SAVE EDIT
  ===================================================== */

  async function handleSaveEdit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingProduct) {
      return;
    }

    const totalImagesAfterUpload =
      existingImages.length +
      additionalImages.length +
      (editImageFile ? 1 : 0);

    if (
      totalImagesAfterUpload >
      3
    ) {
      setError(
        "Maksimal 3 foto untuk setiap produk. Hapus foto lama terlebih dahulu jika ingin mengganti dengan foto baru."
      );

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
          pro

