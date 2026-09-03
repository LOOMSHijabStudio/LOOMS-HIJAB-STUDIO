"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

interface CollectionRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_path: string | null;
  banner_image_path: string | null;
  position: number;
  product_count?: number;
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ==========================================
  // LOAD COLLECTIONS
  // ==========================================
  useEffect(() => {
    async function loadCollections() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/admin/collections", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load collections");
        }

        setCollections(data.collections || []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load collections"
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCollections();
  }, []);

  // ==========================================
  // CREATE COLLECTION
  // ==========================================
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          description,
          cover_image_path: null,
          banner_image_path: null,
          position: collections.length + 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create collection");
      }

      // Reset form
      setName("");
      setSlug("");
      setDescription("");

      // Refresh collection list
      const refreshed = await fetch("/api/admin/collections", {
        cache: "no-store",
      });

      const refreshedData = await refreshed.json();

      if (!refreshed.ok || !refreshedData.success) {
        throw new Error(
          refreshedData.error || "Failed to refresh collections"
        );
      }

      setCollections(refreshedData.collections || []);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create collection"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // DELETE COLLECTION
  // ==========================================
  async function handleDelete(id: string, collectionName: string) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus collection "${collectionName}"?\n\n` +
        `Semua hubungan produk dengan collection ini juga akan dihapus.\n` +
        `Produk itu sendiri TIDAK akan dihapus.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);

      const response = await fetch(
        `/api/admin/collections?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus collection");
      }

      // Hapus langsung dari tampilan
      setCollections((current) =>
        current.filter((collection) => collection.id !== id)
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus collection"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ==========================================
          HEADER
      ========================================== */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-looms-gray/60">
          Edit
        </p>

        <h1 className="mt-2 font-display text-4xl text-looms-teal">
          Collection
        </h1>
      </div>

      {/* ==========================================
          ERROR MESSAGE
      ========================================== */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* ==========================================
            COLLECTION TABLE
        ========================================== */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-[0.12em] text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nama</th>

                  <th className="px-4 py-3">Slug</th>

                  <th className="px-4 py-3">Jumlah</th>

                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {/* LOADING */}
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Memuat collection...
                    </td>
                  </tr>
                ) : collections.length === 0 ? (
                  /* EMPTY */
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Belum ada collection.
                    </td>
                  </tr>
                ) : (
                  /* COLLECTION LIST */
                  collections.map((collection) => (
                    <tr
                      key={collection.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {collection.name}
                      </td>

                      <td className="px-4 py-4">
                        {collection.slug}
                      </td>

                      <td className="px-4 py-4">
                        {collection.product_count ?? 0}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              collection.id,
                              collection.name
                            )
                          }
                          disabled={deletingId === collection.id}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === collection.id
                            ? "Menghapus..."
                            : "Hapus"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==========================================
            ADD COLLECTION FORM
        ========================================== */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-looms-teal">
              Tambah collection
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Buat lini edit baru untuk toko.
            </p>
          </div>

          {/* NAMA */}
          <label className="block text-sm text-gray-700">
            <span className="mb-2 block">Nama</span>

            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Hijab"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-looms-teal focus:outline-none"
            />
          </label>

          {/* SLUG */}
          <label className="block text-sm text-gray-700">
            <span className="mb-2 block">Slug</span>

            <input
              required
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="Contoh: hijab"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-looms-teal focus:outline-none"
            />
          </label>

          {/* DESKRIPSI */}
          <label className="block text-sm text-gray-700">
            <span className="mb-2 block">Deskripsi</span>

            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Deskripsi collection..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-looms-teal focus:outline-none"
            />
          </label>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-looms-teal px-4 py-2.5 text-sm font-medium text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan collection"}
          </button>

          {/* BACK */}
          <div className="text-right">
            <Link
              href="/admin"
              className="text-sm text-looms-teal hover:underline"
            >
              Kembali ke dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
