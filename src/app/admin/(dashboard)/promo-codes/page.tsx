import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

type PromoCode = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_purchase: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDiscount(promo: PromoCode) {
  if (promo.discount_type === "percentage") {
    return `${promo.discount_value}%`;
  }

  return formatRupiah(Number(promo.discount_value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function PromoCodesPage() {
  let promoCodes: PromoCode[] = [];
  let errorMessage = "";

  if (!isSupabaseConfigured()) {
    errorMessage = "Supabase belum dikonfigurasi.";
  } else {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("promo_codes")
      .select(
        `
          id,
          code,
          discount_type,
          discount_value,
          minimum_purchase,
          maximum_discount,
          usage_limit,
          used_count,
          starts_at,
          expires_at,
          is_active,
          created_at
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load promo codes:", error);
      errorMessage = "Promo codes gagal dimuat.";
    } else {
      promoCodes = (data ?? []) as PromoCode[];
    }
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-[10px] font-medium tracking-[0.18em] text-looms-gray">
            PEMASARAN
          </p>

          <h1 className="mt-2 font-display text-4xl md:text-5xl">
            Promo Codes
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-looms-gray">
            Kelola kode promo, diskon, minimum pembelian, periode promo,
            dan batas penggunaan.
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80"
        >
          + Tambah Promo
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-black/10 bg-black/[0.02]">
                <tr>
                  <th className="px-5 py-4 font-medium">Kode</th>
                  <th className="px-5 py-4 font-medium">Diskon</th>
                  <th className="px-5 py-4 font-medium">Min. Pembelian</th>
                  <th className="px-5 py-4 font-medium">Maks. Diskon</th>
                  <th className="px-5 py-4 font-medium">Penggunaan</th>
                  <th className="px-5 py-4 font-medium">Periode</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {promoCodes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-sm text-looms-gray"
                    >
                      Belum ada promo code.
                    </td>
                  </tr>
                ) : (
                  promoCodes.map((promo) => (
                    <tr
                      key={promo.id}
                      className="border-b border-black/5 last:border-b-0"
                    >
                      <td className="px-5 py-5">
                        <p className="font-semibold tracking-[0.08em]">
                          {promo.code}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <span className="font-medium">
                          {formatDiscount(promo)}
                        </span>

                        <p className="mt-1 text-xs text-looms-gray">
                          {promo.discount_type === "percentage"
                            ? "Persentase"
                            : "Nominal tetap"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        {formatRupiah(
                          Number(promo.minimum_purchase ?? 0)
                        )}
                      </td>

                      <td className="px-5 py-5">
                        {promo.maximum_discount !== null
                          ? formatRupiah(
                              Number(promo.maximum_discount)
                            )
                          : "-"}
                      </td>

                      <td className="px-5 py-5">
                        {promo.used_count ?? 0}
                        {promo.usage_limit !== null
                          ? ` / ${promo.usage_limit}`
                          : " / ∞"}
                      </td>

                      <td className="px-5 py-5">
                        <p>{formatDate(promo.starts_at)}</p>

                        <p className="mt-1 text-xs text-looms-gray">
                          sampai {formatDate(promo.expires_at)}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                            promo.is_active
                              ? "bg-black text-white"
                              : "bg-black/5 text-looms-gray",
                          ].join(" ")}
                        >
                          {promo.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

