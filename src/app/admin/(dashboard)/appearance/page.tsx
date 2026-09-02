"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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

export default function AdminAppearancePage() {
  const [form, setForm] = useState<AppearanceState>({
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppearance() {
      try {
        const res = await fetch("/api/admin/appearance");
        const data = await res.json();
        if (data.success && data.appearance) {
          setForm(data.appearance);
        }
      } catch (err) {
        console.error("Failed to load appearance:", err);
      } finally {
        setIsLoading(false);
      }
    }
    void fetchAppearance();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan perubahan tampilan");
      }

      setSuccessMsg("Tampilan website dan banner berhasil disimpan!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-looms-teal border-t-transparent rounded-full animate-spin" />
          <span>Memuat pengaturan tampilan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
          Storefront Customization
        </p>
        <h1 className="mt-1 font-display text-3xl text-looms-teal">
          Tampilan & Konten Website
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Sesuaikan teks hero, banner gambar, pengumuman atas, dan konten beranda toko LOOMS
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Announcement Bar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            1. Baris Pengumuman Atas (Top Announcement Bar)
          </h2>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Teks Pengumuman Promo / Gratis Ongkir
            </label>
            <input
              type="text"
              value={form.announcementText}
              onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs"
            />
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            2. Hero Banner Utama (Bagian Paling Atas Beranda)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Label Sub-Header (Eyebrow)
              </label>
              <input
                type="text"
                value={form.heroEyebrow}
                onChange={(e) => setForm({ ...form, heroEyebrow: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Judul Hero Banner
              </label>
              <input
                type="text"
                value={form.heroTitle}
                onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Deskripsi Hero
              </label>
              <textarea
                rows={2}
                value={form.heroDescription}
                onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Foto / Gambar Hero Banner
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  value={form.heroImage}
                  onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs font-mono"
                />
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  <Image
                    src={form.heroImage || "/images/editorial-sand.svg"}
                    alt="Hero Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            3. Banner Editorial / Koleksi (&quot;The New Arrivals&quot;)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Judul Editorial
              </label>
              <input
                type="text"
                value={form.editorialTitle}
                onChange={(e) => setForm({ ...form, editorialTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Gambar Banner Editorial
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={form.editorialImage}
                  onChange={(e) => setForm({ ...form, editorialImage: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs font-mono"
                />
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  <Image
                    src={form.editorialImage || "/images/editorial-teal.svg"}
                    alt="Editorial Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Deskripsi Editorial
              </label>
              <textarea
                rows={2}
                value={form.editorialDescription}
                onChange={(e) => setForm({ ...form, editorialDescription: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp & Contact */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            4. Pengaturan Kontak & WhatsApp Toko
          </h2>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Nomor WhatsApp Penerima Order (Gunakan awalan 62)
            </label>
            <input
              type="text"
              placeholder="6281558066629"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-looms-teal text-xs font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Nomor ini digunakan saat pelanggan mengklik tombol &quot;Pesan via WhatsApp&quot; pada saat checkout.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-looms-teal hover:bg-looms-teal/90 text-looms-cream font-semibold rounded-xl transition shadow-sm disabled:opacity-60 text-xs uppercase tracking-wider"
          >
            {isSaving ? "Menyimpan Perubahan..." : "Simpan Pengaturan Tampilan"}
          </button>
        </div>
      </form>
    </div>
  );
}
