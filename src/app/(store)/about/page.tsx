"use client";

import { useEffect, useState } from "react";

type AboutState = {
  eyebrow: string;
  title: string;
  description: string;
  image_url: string;

  philosophy_eyebrow: string;
  philosophy_title: string;
  philosophy_description: string;

  intention_eyebrow: string;
  intention_title: string;
  intention_description: string;
};

type StatusMessage =
  | string
  | null;

export default function AdminAboutPage() {
  const [form, setForm] =
    useState<AboutState>({
      eyebrow: "",
      title: "",
      description: "",
      image_url: "",

      philosophy_eyebrow: "",
      philosophy_title: "",
      philosophy_description: "",

      intention_eyebrow: "",
      intention_title: "",
      intention_description: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [success, setSuccess] =
    useState<StatusMessage>(
      null
    );

  const [error, setError] =
    useState<StatusMessage>(
      null
    );

  useEffect(() => {
    async function loadAbout() {
      try {
        const response =
          await fetch(
            "/api/admin/about",
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
              "Gagal memuat About Us"
          );
        }

        setForm({
          eyebrow:
            data.about.eyebrow ??
            "",
          title:
            data.about.title ??
            "",
          description:
            data.about.description ??
            "",
          image_url:
            data.about.image_url ??
            "",

          philosophy_eyebrow:
            data.about
              .philosophy_eyebrow ??
            "",
          philosophy_title:
            data.about
              .philosophy_title ??
            "",
          philosophy_description:
            data.about
              .philosophy_description ??
            "",

          intention_eyebrow:
            data.about
              .intention_eyebrow ??
            "",
          intention_title:
            data.about
              .intention_title ??
            "",
          intention_description:
            data.about
              .intention_description ??
            "",
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat About Us"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAbout();
  }, []);

  function updateField(
    field: keyof AboutState,
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

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/admin/about",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              form
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
            "Gagal menyimpan About Us"
        );
      }

      if (data.about) {
        setForm((current) => ({
          ...current,
          ...data.about,
        }));
      }

      setSuccess(
        "About Us berhasil disimpan!"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan About Us"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(
    file: File
  ) {
    if (
      file.type !==
      "image/jpeg"
    ) {
      setError(
        "Hanya JPG/JPEG yang diperbolehkan."
      );
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setError(
        "Ukuran gambar maksimal 8 MB."
      );
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/admin/about",
          {
            method: "POST",
            body: formData,
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
            "Gagal upload foto"
        );
      }

      setForm((current) => ({
        ...current,
        image_url:
          data.about.image_url,
      }));

      setSuccess(
        "Foto About berhasil diupload!"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal upload foto"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage() {
    const confirmed =
      window.confirm(
        "Hapus foto About?\n\nFoto akan kembali ke gambar bawaan LOOMS."
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/admin/about",
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
            "Gagal menghapus foto"
        );
      }

      setForm((current) => ({
        ...current,
        image_url:
          data.about.image_url,
      }));

      setSuccess(
        "Foto About berhasil dihapus."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus foto"
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Memuat About Us...
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-looms-teal/70">
          Storefront Content
        </p>

        <h1 className="mt-1 font-display text-3xl text-looms-teal">
          About Us
        </h1>

        <p className="mt-2 text-xs text-gray-500">
          Edit seluruh konten halaman About
          yang tampil di website public.
        </p>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-6"
      >

        {/* HERO ABOUT */}
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-3 text-base font-bold">
            1. About Header
          </h2>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Eyebrow
            </label>

            <input
              value={form.eyebrow}
              onChange={(event) =>
                updateField(
                  "eyebrow",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Judul Utama
            </label>

            <textarea
              rows={3}
              value={form.title}
              onChange={(event) =>
                updateField(
                  "title",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Deskripsi
            </label>

            <textarea
              rows={5}
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>

        </section>

        {/* IMAGE */}
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-3 text-base font-bold">
            2. Foto About
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">

              <input
                id="about-image"
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                className="hidden"
                disabled={
                  uploading ||
                  deleting
                }
                onChange={(event) => {
                  const file =
                    event.target.files?.[0];

                  if (file) {
                    void handleUpload(
                      file
                    );
                  }

                  event.currentTarget.value =
                    "";
                }}
              />

              <div className="flex flex-wrap gap-2">

                <label
                  htmlFor="about-image"
                  className={`cursor-pointer rounded-lg bg-looms-teal px-5 py-3 text-sm font-semibold text-white ${
                    uploading ||
                    deleting
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  {uploading
                    ? "Mengupload..."
                    : "Pilih JPG"}
                </label>

                <button
                  type="button"
                  onClick={() =>
                    void handleDeleteImage()
                  }
                  disabled={
                    uploading ||
                    deleting
                  }
                  className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {deleting
                    ? "Menghapus..."
                    : "Hapus"}
                </button>

              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500">
                Format JPG/JPEG.
                Maksimal 8 MB.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt="About Preview"
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-xs text-gray-400">
                  Belum ada gambar
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PHILOSOPHY */}
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-3 text-base font-bold">
            3. The LOOMS Philosophy
          </h2>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Eyebrow
            </label>

            <input
              value={
                form.philosophy_eyebrow
              }
              onChange={(event) =>
                updateField(
                  "philosophy_eyebrow",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Judul
            </label>

            <input
              value={
                form.philosophy_title
              }
              onChange={(event) =>
                updateField(
                  "philosophy_title",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Deskripsi
            </label>

            <textarea
              rows={5}
              value={
                form.philosophy_description
              }
              onChange={(event) =>
                updateField(
                  "philosophy_description",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>
        </section>

        {/* INTENTION */}
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="border-b border-gray-100 pb-3 text-base font-bold">
            4. Made With Intention
          </h2>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Eyebrow
            </label>

            <input
              value={
                form.intention_eyebrow
              }
              onChange={(event) =>
                updateField(
                  "intention_eyebrow",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Judul
            </label>

            <input
              value={
                form.intention_title
              }
              onChange={(event) =>
                updateField(
                  "intention_title",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Deskripsi
            </label>

            <textarea
              rows={5}
              value={
                form.intention_description
              }
              onChange={(event) =>
                updateField(
                  "intention_description",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-looms-teal focus:bg-white focus:outline-none"
            />
          </div>
        </section>

        {/* SAVE */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-looms-teal px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-looms-cream shadow-sm disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : "Simpan About Us"}
          </button>
        </div>

      </form>
    </div>
  );
}
