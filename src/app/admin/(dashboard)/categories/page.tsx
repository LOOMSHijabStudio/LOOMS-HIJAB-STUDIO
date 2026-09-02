"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  position: number;
  product_count?: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/admin/categories", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load categories");
        }

        setCategories(data.categories || []);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load categories"
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCategories();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description,
          image_path: null,
          position: categories.length + 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create category");
      }

      setName("");
      setSlug("");
      setDescription("");
      const refreshed = await fetch("/api/admin/categories", { cache: "no-store" });
      const refreshedData = await refreshed.json();
      if (refreshed.ok && refreshedData.success) {
        setCategories(refreshedData.categories || []);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create category"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-looms-gray/60">
          Catalog
        </p>
        <h1 className="mt-2 font-display text-4xl text-looms-teal">Kategori</h1>
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
                      Memuat kategori...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                      Belum ada kategori.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">{category.name}</td>
                      <td className="px-4 py-4">{category.slug}</td>
                      <td className="px-4 py-4">{category.product_count ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-looms-teal">Tambah kategori</h2>
            <p className="mt-1 text-sm text-gray-500">Buat grup katalog baru.</p>
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
            {isSubmitting ? "Menyimpan..." : "Simpan kategori"}
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
