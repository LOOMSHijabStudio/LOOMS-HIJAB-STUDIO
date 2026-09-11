"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function NewPromoCodePage() {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minimumPurchase, setMinimumPurchase] = useState("");
  const [maximumDiscount, setMaximumDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: Number(discountValue),
          minimum_purchase: Number(minimumPurchase || 0),
          maximum_discount:
            discountType === "percentage" && maximumDiscount
              ? Number(maximumDiscount)
              : null,
          usage_limit: usageLimit ? Number(usageLimit) : null,
          starts_at: startsAt
            ? new Date(startsAt).toISOString()
            : null,
          expires_at: expiresAt
            ? new Date(expiresAt).toISOString()
            : null,
          is_active: isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Promo code gagal disimpan."
        );
      }

      window.location.href = "/admin/promo-codes";
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Promo code gagal disimpan."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/promo-codes"
          className="text-xs font-medium text-looms-gray hover:text-black"
        >
          ← Kembali ke Promo Codes
        </Link>

        <p className="mt-6 text-[10px] font-medium tracking-[0.18em] text-looms-gray">
          PEMASARAN
        </p>

        <h1 className="mt-2 font-display text-4xl md:text-5xl">
          Tambah Promo
        </h1>

        <p className="mt-3 text-sm leading-6 text-looms-gray">
          Buat kode promo baru untuk pelanggan LOOMS.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-black/10 bg-white p-6 md:p-8"
      >
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Informasi Promo
            </h2>

            <p className="mt-1 text-sm text-looms-gray">
              Tentukan kode dan jenis diskon yang diberikan.
            </p>
          </div>

          <div>
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-medium"
            >
              Kode Promo
            </label>

            <input
              id="code"
              type="text"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.toUpperCase())
              }
              placeholder="Contoh: LOOMS10"
              required
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm uppercase outline-none transition focus:border-black"
            />

            <p className="mt-2 text-xs text-looms-gray">
              Kode akan otomatis dibuat huruf kapital.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="discountType"
                className="mb-2 block text-sm font-medium"
              >
                Tipe Diskon
              </label>

              <select
                id="discountType"
                value={discountType}
                onChange={(event) =>
                  setDiscountType(
                    event.target.value as
                      | "percentage"
                      | "fixed"
                  )
                }
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="percentage">
                  Persentase (%)
                </option>

                <option value="fixed">
                  Nominal Tetap (Rp)
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="discountValue"
                className="mb-2 block text-sm font-medium"
              >
                Nilai Diskon
              </label>

              <input
                id="discountValue"
                type="number"
                min="0"
                step="1"
                value={discountValue}
                onChange={(event) =>
                  setDiscountValue(event.target.value)
                }
                placeholder={
                  discountType === "percentage"
                    ? "Contoh: 10"
                    : "Contoh: 15000"
                }
                required
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
              />

              <p className="mt-2 text-xs text-looms-gray">
                {discountType === "percentage"
                  ? "Masukkan angka 1–100."
                  : "Masukkan nominal dalam rupiah."}
              </p>
            </div>
          </div>
        </section>

        <div className="h-px bg-black/5" />

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Ketentuan Pembelian
            </h2>

            <p className="mt-1 text-sm text-looms-gray">
              Atur syarat penggunaan promo.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="minimumPurchase"
                className="mb-2 block text-sm font-medium"
              >
                Minimum Pembelian
              </label>

              <input
                id="minimumPurchase"
                type="number"
                min="0"
                step="1"
                value={minimumPurchase}
                onChange={(event) =>
                  setMinimumPurchase(event.target.value)
                }
                placeholder="Contoh: 150000"
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
              />

              <p className="mt-2 text-xs text-looms-gray">
                Isi 0 jika tidak ada minimum pembelian.
              </p>
            </div>

            <div>
              <label
                htmlFor="maximumDiscount"
                className="mb-2 block text-sm font-medium"
              >
                Maksimum Diskon
              </label>

              <input
                id="maximumDiscount"
                type="number"
                min="0"
                step="1"
                value={maximumDiscount}
                onChange={(event) =>
                  setMaximumDiscount(event.target.value)
                }
                placeholder="Contoh: 50000"
                disabled={discountType === "fixed"}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-black/5"
              />

              <p className="mt-2 text-xs text-looms-gray">
                Berlaku untuk diskon persentase.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="usageLimit"
              className="mb-2 block text-sm font-medium"
            >
              Batas Penggunaan
            </label>

            <input
              id="usageLimit"
              type="number"
              min="1"
              step="1"
              value={usageLimit}
              onChange={(event) =>
                setUsageLimit(event.target.value)
              }
              placeholder="Contoh: 100"
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
            />

            <p className="mt-2 text-xs text-looms-gray">
              Kosongkan jika tidak ada batas penggunaan.
            </p>
          </div>
        </section>

        <div className="h-px bg-black/5" />

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Periode Promo
            </h2>

            <p className="mt-1 text-sm text-looms-gray">
              Tentukan kapan promo mulai dan berakhir.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="startsAt"
                className="mb-2 block text-sm font-medium"
              >
                Mulai
              </label>

              <input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(event) =>
                  setStartsAt(event.target.value)
                }
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="expiresAt"
                className="mb-2 block text-sm font-medium"
              >
                Berakhir
              </label>

              <input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) =>
                  setExpiresAt(event.target.value)
                }
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-black/5" />

        <section>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) =>
                setIsActive(event.target.checked)
              }
              className="h-4 w-4 rounded border-black/20"
            />

            <span>
              <span className="block text-sm font-medium">
                Aktifkan promo
              </span>

              <span className="mt-1 block text-xs text-looms-gray">
                Promo dapat digunakan pelanggan saat aktif.
              </span>
            </span>
          </label>
        </section>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Link
            href="/admin/promo-codes"
            className="rounded-xl border border-black/10 px-5 py-3 text-center text-sm font-medium transition hover:bg-black/5"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Promo"}
          </button>
        </div>
      </form>
    </main>
  );
}
