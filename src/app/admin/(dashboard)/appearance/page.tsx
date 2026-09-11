"use client";

import { useEffect, useState } from "react";

interface AppearanceState {
  announcementText: string;

  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: string;

  editorialEyebrow: string;
  editorialTitle: string;
  editorialDescription: string;
  editorialImage: string;

  storyTitle: string;
  storyDescription: string;
  storyImage: string;

  whatsappNumber: string;
}

type ImageField =
  | "heroImage"
  | "editorialImage";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/gif",
];

const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".gif",
];

function isAllowedImageFile(file: File): boolean {
  const fileName = file.name.toLowerCase();

  const hasAllowedExtension =
    ALLOWED_IMAGE_EXTENSIONS.some((extension) =>
      fileName.endsWith(extension)
    );

  const hasAllowedMimeType =
    ALLOWED_IMAGE_TYPES.includes(file.type);

  return (
    hasAllowedExtension &&
    hasAllowedMimeType
  );
}

export default function AdminAppearancePage() {
  const [form, setForm] =
    useState<AppearanceState>({
      announcementText: "",

      heroEyebrow: "",
      heroTitle: "",
      heroDescription: "",
      heroImage: "",

      editorialEyebrow: "",
      editorialTitle: "",
      editorialDescription: "",
      editorialImage: "",

      storyTitle: "",
      storyDescription: "",
      storyImage: "",

      whatsappNumber: "",
    });

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [uploadingField, setUploadingField] =
    useState<ImageField | null>(null);

  const [deletingField, setDeletingField] =
    useState<ImageField | null>(null);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function fetchAppearance() {
      try {
        setError(null);

        const res = await fetch(
          "/api/admin/appearance",
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(
            data.error ||
              "Gagal mengambil pengaturan tampilan"
          );
        }

        if (data.appearance) {
          setForm(data.appearance);
        }
      } catch (err) {
        console.error(
          "Failed to load appearance:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat pengaturan tampilan"
        );
      } finally {
        setIsLoading(false);
      }
    }

    void fetchAppearance();
  }, []);

  function updateField(
    field: keyof AppearanceState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(
        "/api/admin/appearance",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Gagal menyimpan perubahan tampilan"
        );
      }

      if (data.appearance) {
        setForm(data.appearance);
      }

      setSuccessMsg(
        "Tampilan website berhasil disimpan!"
      );

      window.setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImageUpload(
    field: ImageField,
    file: File
  ) {
    setError(null);
    setSuccessMsg(null);

    /*
     * =====================================================
     * VALIDASI FILE
     * =====================================================
     */

    if (!isAllowedImageFile(file)) {
      setError(
        "File ditolak. Hanya JPG, JPEG, dan GIF yang diperbolehkan."
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        "Ukuran file maksimal 8 MB."
      );
      return;
    }

    /*
     * =====================================================
     * CEK MIME TYPE
     * =====================================================
     */

    if (
      file.type !== "image/jpeg" &&
      file.type !== "image/jpg" &&
      file.type !== "image/gif"
    ) {
      setError(
        "Format file tidak valid. Hanya JPG, JPEG, dan GIF yang diperbolehkan."
      );
      return;
    }

    setUploadingField(field);

    try {
      const formData =
        new FormData();

      formData.append(
        "field",
        field
      );

      formData.append(
        "file",
        file
      );

      const res = await fetch(
        "/api/admin/appearance",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Gagal mengupload gambar"
        );
      }

      if (data.appearance) {
        setForm(data.appearance);
      }

      const fileExtension =
        file.name
          .toLowerCase()
          .split(".")
          .pop();

      const mediaType =
        fileExtension === "gif"
          ? "GIF"
          : "JPG";

      setSuccessMsg(
        field === "heroImage"
          ? `Hero Banner ${mediaType} berhasil diupload!`
          : `Banner Editorial ${mediaType} berhasil diupload!`
      );

      window.setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengupload gambar"
      );
    } finally {
      setUploadingField(null);
    }
  }

  async function handleDeleteImage(
    field: ImageField
  ) {
    const label =
      field === "heroImage"
        ? "Hero Banner"
        : "Banner Editorial";

    const confirmed =
      window.confirm(
        `Hapus ${label}?\n\nGambar akan dikembalikan ke gambar bawaan LOOMS.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingField(field);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(
        "/api/admin/appearance",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            field,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Gagal menghapus gambar"
        );
      }

      if (data.appearance) {
        setForm(data.appearance);
      }

      setSuccessMsg(
        `${label} berhasil dihapus.`
      );

      window.setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus gambar"
      );
    } finally {
      setDeletingField(null);
    }
  }

  function renderImageUpload(
    field: ImageField,
    label: string
  ) {
    const image =
      form[field];

    const isUploading =
      uploadingField === field;

    const isDeleting =
      deletingField === field;

    const inputId =
      field === "heroImage"
        ? "hero-image-upload"
        : "editorial-image-upload";

    return (
      <div className="md:col-span-2">
        <label className="mb-2 block font-semibold text-gray-700">
          {label}
        </label>

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">

          {/* ========================================= */}
          {/* UPLOAD AREA */}
          {/* ========================================= */}

          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">

            <input
              id={inputId}
              type="file"

              /*
               * Hanya tampilkan JPG/JPEG/GIF
               * di file picker.
               */
              accept=".jpg,.jpeg,.gif,image/jpeg,image/gif"

              className="hidden"

              disabled={
                isUploading ||
                isDeleting
              }

              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  void handleImageUpload(
                    field,
                    file
                  );
                }

                /*
                 * Reset input agar file yang sama
                 * bisa dipilih kembali.
                 */
                event.currentTarget.value =
                  "";
              }}
            />

            <div className="flex flex-wrap gap-2">

              {/* PILIH FILE */}

              <label
                htmlFor={inputId}
                className={`inline-flex cursor-pointer items-center justify-center rounded-lg bg-looms-teal px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 ${
                  isUploading ||
                  isDeleting
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                {isUploading
                  ? "Mengupload..."
                  : "Pilih JPG / GIF"}
              </label>

              {/* HAPUS */}

              <button
                type="button"
                onClick={() =>
                  void handleDeleteImage(
                    field
                  )
                }
                disabled={
                  isUploading ||
                  isDeleting
                }
                className="rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting
                  ? "Menghapus..."
                  : "Hapus"}
              </button>
            </div>

            {/* ===================================== */}
            {/* FORMAT INFO */}
            {/* ===================================== */}

            <div className="mt-4 space-y-1">

              <p className="text-xs font-medium text-gray-700">
                Format yang didukung:
                <span className="ml-1 font-bold">
                  JPG / JPEG / GIF
                </span>
              </p>

              <p className="text-[11px] leading-5 text-gray-500">
                Maksimal ukuran 8 MB.
                File akan otomatis
                disimpan ke Supabase
                Storage.
              </p>

              <p className="text-[11px] leading-5 text-gray-500">
                File selain JPG, JPEG,
                dan GIF akan ditolak
                untuk mencegah error
                atau bug pada website.
              </p>

              <p className="text-[11px] leading-5 text-gray-500">
                GIF akan tetap bergerak
                dan mengulang otomatis
                saat ditampilkan di
                website publik.
              </p>
            </div>

            {/* ===================================== */}
            {/* ACTIVE IMAGE URL */}
            {/* ===================================== */}

            {image && (
              <div className="mt-4 rounded-lg bg-white px-3 py-2">

                <p className="text-[10px] text-gray-400">
                  Media aktif:
                </p>

                <p className="mt-1 break-all text-[10px] text-gray-600">
                  {image}
                </p>

              </div>
            )}
          </div>

          {/* ========================================= */}
          {/* PREVIEW */}
          {/* ========================================= */}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">

            {image ? (
              /*
               * PENTING:
               *
               * Kita menggunakan <img>, bukan background-image.
               * Dengan begitu GIF tetap dianimasikan.
               */
              <img
                src={image}
                alt={label}
                className="h-56 w-full object-cover"
              />
            ) : (
              <div className="flex h-56 items-center justify-center px-5 text-center text-xs text-gray-400">
                Belum ada media.
                <br />
                Upload JPG / GIF
                untuk menampilkan
                media.
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="flex items-center gap-2">

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-looms-teal border-t-transparent" />

          <span>
            Memuat pengaturan tampilan...
          </span>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <div>

        <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
          Storefront Customization
        </p>

        <h1 className="mt-1 font-display text-3xl text-looms-teal">
          Tampilan & Konten Website
        </h1>

        <p className="mt-1 text-xs text-gray-500">
          Sesuaikan teks hero, banner
          gambar, pengumuman atas,
          dan konten beranda toko
          LOOMS.
        </p>

      </div>

      {/* ============================================= */}
      {/* SUCCESS */}
      {/* ============================================= */}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">

          <span>✓</span>

          <span>
            {successMsg}
          </span>

        </div>
      )}

      {/* ============================================= */}
      {/* ERROR */}
      {/* ============================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">

          {error}

        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-6 text-xs"
      >

        {/* ================================================= */}
        {/* 1. ANNOUNCEMENT */}
        {/* ================================================= */}

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-900">
            1. Baris Pengumuman Atas
            (Top Announcement Bar)
          </h2>

          <div>

            <label className="mb-1 block font-semibold text-gray-700">
              Teks Pengumuman Promo /
              Gratis Ongkir
            </label>

            <input
              type="text"
              value={
                form.announcementText
              }
              onChange={(event) =>
                updateField(
                  "announcementText",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
            />

          </div>
        </div>

        {/* ================================================= */}
        {/* 2. HERO */}
        {/* ================================================= */}

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-900">
            2. Hero Banner Utama
            (Bagian Paling Atas Beranda)
          </h2>

          <div className="grid gap-4 md:grid-cols-2">

            {/* EYEBROW */}

            <div>

              <label className="mb-1 block font-semibold text-gray-700">
                Label Sub-Header
                (Eyebrow)
              </label>

              <input
                type="text"
                value={
                  form.heroEyebrow
                }
                onChange={(event) =>
                  updateField(
                    "heroEyebrow",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
              />

            </div>

            {/* TITLE */}

            <div>

              <label className="mb-1 block font-semibold text-gray-700">
                Judul Hero Banner
              </label>

              <input
                type="text"
                value={
                  form.heroTitle
                }
                onChange={(event) =>
                  updateField(
                    "heroTitle",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
              />

            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">

              <label className="mb-1 block font-semibold text-gray-700">
                Deskripsi Hero
              </label>

              <textarea
                rows={3}
                value={
                  form.heroDescription
                }
                onChange={(event) =>
                  updateField(
                    "heroDescription",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
              />

            </div>

            {/* HERO IMAGE */}

            {renderImageUpload(
              "heroImage",
              "Foto / Gambar Hero Banner"
            )}

          </div>
        </div>

        {/* ================================================= */}
        {/* 3. EDITORIAL */}
        {/* ================================================= */}

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-900">
            3. Banner Editorial /
            Koleksi
            (&quot;The New Arrivals&quot;)
          </h2>

          <div className="grid gap-4 md:grid-cols-2">

            {/* EYEBROW */}

            <div>

              <label className="mb-1 block font-semibold text-gray-700">
                Label Editorial
              </label>

              <input
                type="text"
                value={
                  form.editorialEyebrow
                }
                onChange={(event) =>
                  updateField(
                    "editorialEyebrow",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
              />

            </div>

            {/* TITLE */}

            <div>

              <label className="mb-1 block font-semibold text-gray-700">
                Judul Editorial
              </label>

              <input
                type="text"
                value={
                  form.editorialTitle
                }
                onChange={(event) =>
                  updateField(
                    "editorialTitle",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
              />

            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">

              <label className="mb-1 block font-semibold text-gray-700">
                Deskripsi Editorial
              </label>

              <textarea
                rows={3}
                value={
                  form.editorialDescription
                }
                onChange={(event) =>
                  updateField(
                    "editorialDescription",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
              />

            </div>

            {/* EDITORIAL IMAGE */}

            {renderImageUpload(
              "editorialImage",
              "Gambar Banner Editorial"
            )}

          </div>
        </div>

        {/* ================================================= */}
        {/* 4. WHATSAPP */}
        {/* ================================================= */}

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-900">
            4. Pengaturan Kontak &
            WhatsApp Toko
          </h2>

          <div>

            <label className="mb-1 block font-semibold text-gray-700">
              Nomor WhatsApp Penerima
              Order (Gunakan awalan 62)
            </label>

            <input
              type="text"
              placeholder="6281558066629"
              value={
                form.whatsappNumber
              }
              onChange={(event) =>
                updateField(
                  "whatsappNumber",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-xs focus:border-looms-teal focus:bg-white focus:outline-none"
            />

            <p className="mt-1 text-[11px] text-gray-400">
              Nomor ini digunakan saat
              pelanggan mengklik tombol
              &quot;Pesan via WhatsApp&quot;
              pada saat checkout.
            </p>

          </div>
        </div>

        {/* ================================================= */}
        {/* SUBMIT */}
        {/* ================================================= */}

        <div className="flex justify-end pt-2">

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-looms-teal px-8 py-3 text-xs font-semibold uppercase tracking-wider text-looms-cream shadow-sm transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Menyimpan Perubahan..."
              : "Simpan Pengaturan Tampilan"}
          </button>

        </div>

      </form>
    </div>
  );
}
