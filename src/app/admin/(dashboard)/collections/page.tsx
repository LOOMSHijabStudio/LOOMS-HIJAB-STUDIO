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

  useEffect(() => {
    async function loadCollections() {
      try {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      setName("");
      setSlug("");
      setDescription("");
      const refreshed = await fetch("/api/admin/collections", { cache: "no-store" });
      const refreshedData = await refreshed.json();
      if (refreshed.ok && refreshedData.success) {
        setCollections(refreshedData.collections || []);
      }
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-looms-gray/60">
          Edit
        </p>
        <h1 className="mt-2 font-display text-4xl text-looms-teal">Collection</h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-[0.12em] text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                      Memuat collection...
                    </td>
                  </tr>
                ) : collections.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                      Belum ada collection.
                    </td>
                  </tr>
                ) : (
                  collections.map((collection) => (
                    <tr key={collection.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">{collection.name}</td>
                      <td className="px-4 py-4">{collection.slug}</td>
                      <td className="px-4 py-4">{collection.product_count ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-looms-teal">Tambah collection</h2>
            <p className="mt-1 text-sm text-gray-500">Buat lini edit baru untuk toko.</p>
          </div>

          <label className="block text-sm text-gray-700">
            <span className="mb-2 block">Nama</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-looms-teal focus:outline-none"
            />
          </label>

          <label className="block text-sm text-gray-700">
            <span className="mb-2 block">Slug</span>
            <input
              required
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-looms-teal focus:outline-none"
            />
          </label>

          <label className="block text-sm text-gray-700">
            <span className="mb-2 block">Deskripsi</span>
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-looms-teal focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-looms-teal px-4 py-2.5 text-sm font-medium text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan collection"}
          </button>

          <div className="text-right">
            <Link href="/admin" className="text-sm text-looms-teal hover:underline">
              Kembali ke dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
