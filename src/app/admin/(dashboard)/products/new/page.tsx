"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ProductFormState {
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: string;
  sale_price: string;
  stock: string;
  image: string;
  material: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

const initialForm: ProductFormState = {
  name: "",
  slug: "",
  description: "",
  sku: "",
  price: "",
  sale_price: "",
  stock: "10",
  image: "/images/editorial-sand.svg",
  material: "Premium Satin Voile",
  status: "ACTIVE",
};

const PLACEMENT_OPTIONS = [
  {
    value: "HOME",
    label: "Home",
    description: "Tampilkan di halaman utama",
  },
  {
    value: "SHOP",
    label: "Shop",
    description: "Tampilkan di katalog Shop",
  },
  {
    value: "NEW_ARRIVALS",
    label: "New Arrivals",
    description: "Tampilkan di produk terbaru",
  },
  {
    value: "COLLECTION",
    label: "Collection",
    description: "Tampilkan di bagian Collection",
  },
  {
    value: "BEST_SELLERS",
    label: "Best Sellers",
    description: "Tampilkan di produk terlaris",
  },
] as const;

type Placement = (typeof PLACEMENT_OPTIONS)[number]["value"];

export default function NewProductPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProductFormState>(initialForm);

  const [selectedPlacements, setSelectedPlacements] = useState<Placement[]>([
    "SHOP",
  ]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initialForm.image);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K]
  ) {
    setForm((current) => {
      const updated = { ...current, [field]: value };

      // Auto-generate slug dan SKU ketika mengetik nama produk
      if (field === "name" && typeof value === "string") {
        const generatedSlug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        if (
          !current.slug ||
          current.slug ===
            current.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        ) {
          updated.slug = generatedSlug;
        }

        if (!current.sku) {
          updated.sku = `LMS-${generatedSlug
            .toUpperCase()
            .slice(0, 6)}-${Math.floor(100 + Math.random() * 900)}`;
        }
      }

      return updated;
    });
  }

  function togglePlacement(placement: Placement) {
    setSelectedPlacements((current) => {
      if (current.includes(placement)) {
        return current.filter((item) => item !== placement);
      }

      return [...current, placement];
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Format gambar harus JPG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      event.target.value = "";
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    let createdProductId: string | null = null;

    try {
      // Minimal satu placement harus dipilih
      if (selectedPlacements.length === 0) {
        throw new Error(
          "Pilih minimal satu tempat untuk menampilkan produk."
        );
      }

      const payload = {
        name: form.name,
        slug:
          form.slug ||
          form.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        description: form.description,
        sku:
          form.sku ||
          `LMS-${Date.now().toString().slice(-6)}`,
        price: Number(form.price),
        sale_price: form.sale_price
          ? Number(form.sale_price)
          : null,
        stock: Number(form.stock),
        image: form.image,
        material: form.material,
        status: form.status,

        // INI YANG BARU
        placements: selectedPlacements,
      };

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gagal membuat produk"
        );
      }

      createdProductId =
        data.productId || data.product?.id || null;

      if (!createdProductId) {
        throw new Error(
          "Produk tersimpan tanpa ID yang valid"
        );
      }

      // Upload gambar setelah produk berhasil dibuat
      if (imageFile) {
        const imageFormData = new FormData();

        imageFormData.append("image", imageFile);

        const imageResponse = await fetch(
          `/api/admin/products/${createdProductId}/images`,
          {
            method: "POST",
            body: imageFormData,
          }
        );

        const imageData = await imageResponse.json();

        if (!imageResponse.ok || !imageData.success) {
          await fetch(
            `/api/admin/products/${createdProductId}`,
            {
              method: "DELETE",
            }
          );

          createdProductId = null;

          throw new Error(
            imageData.error ||
              "Gambar gagal diunggah. Produk belum disimpan."
          );
        }
      }

      router.push("/admin/products");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal membuat produk"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
            Catalog Management
          </p>

          <h1 className="mt-1 font-display text-3xl text-looms-teal">
            Tambah Produk Baru
          </h1>

          <p className="text-xs text-gray-500 mt-1">
            Buat produk baru untuk ditampilkan di katalog toko LOOMS
          </p>
        </div>

        <Link
          href="/admin/products"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
        >
          ← Kembali ke Daftar Produk
        </Link>
      </div>

      {/* ERROR */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-xs"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {/* PRODUCT NAME */}
          <div className="md:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1.5">
              Nama Produk{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              required
              placeholder="Contoh: Silk Square Scarf - Espresso"
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs"
            />
          </div>

          {/* PRICE */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Harga Normal (Rp){" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              required
              type="number"
              min="1"
              step="1"
              placeholder="Contoh: 289000"
              value={form.price}
              onChange={(event) =>
                updateField("price", event.target.value)
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs"
            />
          </div>

          {/* SALE PRICE */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Harga Promo / Diskon (Rp)
            </label>

            <input
              type="number"
              min="0"
              step="1"
              placeholder="Kosongkan jika tidak sedang diskon"
              value={form.sale_price}
              onChange={(event) =>
                updateField(
                  "sale_price",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs"
            />
          </div>

          {/* STOCK */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Jumlah Stok{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(event) =>
                updateField("stock", event.target.value)
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs"
            />
          </div>

          {/* STATUS */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Status Produk
            </label>

            <select
              value={form.status}
              onChange={(event) =>
                updateField(
                  "status",
                  event.target.value as ProductFormState["status"]
                )
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs"
            >
              <option value="ACTIVE">
                ACTIVE (Tampil di Toko)
              </option>

              <option value="DRAFT">
                DRAFT (Disembunyikan sementara)
              </option>

              <option value="ARCHIVED">
                ARCHIVED (Diarsipkan)
              </option>
            </select>
          </div>

          {/* ======================================== */}
          {/* PLACEMENT */}
          {/* ======================================== */}
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-looms-teal/20 bg-looms-teal/5 p-5">
              <div className="mb-4">
                <p className="text-sm font-bold text-looms-teal">
                  Mau ditaruh di mana?
                </p>

                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Centang bagian website tempat produk ini ingin
                  ditampilkan. Kamu bisa memilih lebih dari satu.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {PLACEMENT_OPTIONS.map((option) => {
                  const checked = selectedPlacements.includes(
                    option.value
                  );

                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        checked
                          ? "border-looms-teal bg-white shadow-sm"
                          : "border-gray-200 bg-white/70 hover:border-looms-teal/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          togglePlacement(option.value)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-looms-teal"
                      />

                      <div>
                        <p
                          className={`font-bold ${
                            checked
                              ? "text-looms-teal"
                              : "text-gray-700"
                          }`}
                        >
                          {option.label}
                        </p>

                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg bg-white px-3 py-2.5 text-[11px] text-gray-600">
                <span className="font-semibold text-looms-teal">
                  Dipilih:
                </span>{" "}
                {selectedPlacements.length > 0
                  ? selectedPlacements
                      .map(
                        (placement) =>
                          PLACEMENT_OPTIONS.find(
                            (option) =>
                              option.value === placement
                          )?.label
                      )
                      .join(", ")
                  : "Belum ada bagian yang dipilih"}
              </div>
            </div>
          </div>

          {/* IMAGE UPLOAD */}
          <div className="md:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1.5">
              Foto / Gambar Produk
            </label>

            <div className="flex gap-4 items-center">
              <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-looms-teal/40 bg-looms-teal/5 px-4 py-4 text-center font-semibold text-looms-teal transition hover:bg-looms-teal/10">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="sr-only"
                />

                {imageFile
                  ? imageFile.name
                  : "Pilih gambar dari perangkat"}
              </label>

              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                <Image
                  src={
                    imagePreview ||
                    "/images/editorial-sand.svg"
                  }
                  alt="Preview"
                  fill
                  unoptimized={
                    imagePreview.startsWith("blob:") ||
                    imagePreview.startsWith("data:")
                  }
                  className="object-cover"
                />
              </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-500">
              Format JPG, PNG, atau WebP. Maksimal 5 MB.
            </p>
          </div>

          {/* MATERIAL */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Bahan / Material
            </label>

            <input
              placeholder="Contoh: Premium Voile / Silk Blend"
              value={form.material}
              onChange={(event) =>
                updateField("material", event.target.value)
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              SKU (Kode Unik Produk)
            </label>

            <input
              placeholder="Auto-generate jika dikosongkan"
              value={form.sku}
              onChange={(event) =>
                updateField("sku", event.target.value)
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs font-mono"
            />
          </div>

          {/* DESCRIPTION */}
          <div className="md:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1.5">
              Deskripsi Produk
            </label>

            <textarea
              rows={4}
              placeholder="Tuliskan detail keunggulan dan cerita produk ini..."
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:border-looms-teal focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* SUBMIT ACTIONS */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            href="/admin/products"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-looms-teal px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:opacity-70 shadow-sm"
          >
            {isSubmitting
              ? "Menyimpan..."
              : "Simpan & Terbitkan Produk"}
          </button>
        </div>
      </form>
    </div>
  );
}
