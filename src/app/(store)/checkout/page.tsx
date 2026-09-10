"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

const money = (value: number) =>
  `Rp ${value.toLocaleString("id-ID")}`;

const inputClass =
  "w-full border border-looms-teal/20 bg-white px-3 py-3 text-sm outline-none transition focus:border-looms-teal";

const shippingRates: Record<string, number> = {
  "DKI Jakarta": 10000,
  "Jawa Barat": 10000,
  Banten: 10000,
  "Jawa Tengah": 15000,
  "DI Yogyakarta": 15000,
  "Jawa Timur": 15000,

  "Sumatera Selatan": 30000,
  Lampung: 30000,
  "Sumatera Barat": 35000,
  Jambi: 35000,
  Bengkulu: 35000,
  Riau: 35000,
  "Sumatera Utara": 40000,
  Aceh: 45000,
  "Kepulauan Riau": 40000,
  "Kepulauan Bangka Belitung": 40000,

  Bali: 30000,
  "Nusa Tenggara Barat": 35000,
  "Nusa Tenggara Timur": 40000,

  "Kalimantan Barat": 40000,
  "Kalimantan Tengah": 40000,
  "Kalimantan Selatan": 40000,
  "Kalimantan Timur": 45000,
  "Kalimantan Utara": 50000,

  "Sulawesi Selatan": 45000,
  "Sulawesi Barat": 45000,
  "Sulawesi Tengah": 50000,
  "Sulawesi Tenggara": 50000,
  "Sulawesi Utara": 50000,
  Gorontalo: 50000,

  Maluku: 55000,
  "Maluku Utara": 60000,

  Papua: 65000,
  "Papua Barat": 65000,
  "Papua Selatan": 70000,
  "Papua Tengah": 70000,
  "Papua Pegunungan": 75000,
  "Papua Barat Daya": 70000,
};

export default function CheckoutPage() {
  const { items, subtotal } = useCart();

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
   * Data customer
   */
  const [form, setForm] = useState({
    fullName: "",
    whatsappNumber: "",
    email: "",
    province: "",
    city: "",
    district: "",
    postalCode: "",
    fullAddress: "",
    notes: "",
  });

  /*
   * Looms Society
   *
   * Semua field optional.
   */
  const [societyReview, setSocietyReview] =
    useState({
      name: "",
      rating: null as number | null,
      notes: "",
    });

  /*
   * Ongkir hanya untuk tampilan checkout.
   * Total final tetap dihitung server/database.
   */
  const shipping =
    subtotal >= 500000
      ? 0
      : form.province
        ? shippingRates[form.province] ?? 15000
        : 0;

  function update(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateSocietyReview(
    field:
      | "name"
      | "rating"
      | "notes",
    value: string | number | null
  ) {
    setSocietyReview((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      /*
       * Satu checkout = satu idempotency key.
       */
      const idempotencyKey =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      /*
       * Payload order.
       *
       * Harga TIDAK dikirim dari browser.
       * Server/database tetap menjadi sumber
       * harga yang sebenarnya.
       */
      const payload = {
        idempotencyKey,

        items: items.map((item) => ({
          productId: item.productId,
          variantId:
            item.variantId || undefined,
          quantity: item.quantity,
        })),

        customer: {
          fullName:
            form.fullName.trim(),
          whatsappNumber:
            form.whatsappNumber.trim(),
          email:
            form.email.trim() || undefined,
        },

        address: {
          province:
            form.province.trim(),
          city:
            form.city.trim(),
          district:
            form.district.trim(),
          postalCode:
            form.postalCode.trim(),
          fullAddress:
            form.fullAddress.trim(),
          notes:
            form.notes.trim() ||
            undefined,
        },
      };

      /*
       * ==========================
       * 1. CREATE ORDER
       * ==========================
       */
      const response = await fetch(
        "/api/checkout/order",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      /*
       * Kalau order gagal,
       * jangan lanjut ke review/WhatsApp.
       */
      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Order tidak dapat dibuat. Silakan coba lagi."
        );
      }

      /*
       * Order ID wajib ada
       * karena review dikaitkan ke order.
       */
      const orderId =
        result?.order?.id;

      if (!orderId) {
        throw new Error(
          "Order berhasil dibuat tetapi ID order tidak tersedia."
        );
      }

      /*
       * ==========================
       * 2. SAVE LOOMS SOCIETY
       * ==========================
       *
       * Review hanya dikirim kalau
       * customer benar-benar mengisi sesuatu.
       */
      const hasSocietyReview =
        societyReview.name.trim() !== "" ||
        societyReview.notes.trim() !== "" ||
        societyReview.rating !== null;

      if (hasSocietyReview) {
        const reviewResponse =
          await fetch(
            "/api/society/reviews",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                orderId,
                name:
                  societyReview.name.trim() ||
                  null,
                rating:
                  societyReview.rating,
                notes:
                  societyReview.notes.trim() ||
                  null,
              }),
            }
          );

        const reviewResult =
          await reviewResponse.json();

        if (
          !reviewResponse.ok ||
          !reviewResult.success
        ) {
          throw new Error(
            reviewResult.error ||
              "Review Looms Society gagal disimpan."
          );
        }
      }

      /*
       * ==========================
       * 3. WHATSAPP
       * ==========================
       */
      if (!result.whatsappUrl) {
        throw new Error(
          "Order berhasil dibuat, tetapi link WhatsApp tidak tersedia."
        );
      }

      /*
       * Review sudah selesai disimpan.
       * Baru sekarang buka WhatsApp.
       */
      window.location.assign(
        result.whatsappUrl
      );
    } catch (error) {
      console.error(
        "Checkout error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Checkout gagal. Silakan coba lagi."
      );

      setIsSubmitting(false);
    }
  }

  /*
   * Kalau cart kosong.
   */
  if (!items.length) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="text-xs tracking-[0.16em] text-looms-gray">
          YOUR BAG
        </p>

        <h1 className="mt-4 font-display text-5xl text-looms-teal">
          Nothing here yet.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-looms-gray">
          Add a piece to your bag before continuing to checkout.
        </p>

        <Link
          href="/shop"
          className="mt-8 inline-block border-b border-looms-teal pb-1 text-xs font-medium tracking-[0.12em] text-looms-teal"
        >
          RETURN TO SHOP
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10 lg:py-16">
      <div className="mb-10">
        <p className="text-xs tracking-[0.16em] text-looms-gray">
          YOUR BAG
        </p>

        <h1 className="mt-3 font-display text-5xl text-looms-teal">
          Checkout.
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={submit}
          className="space-y-8"
        >
          {/* ========================= */}
          {/* CONTACT */}
          {/* ========================= */}

          <section>
            <h2 className="font-display text-3xl text-looms-teal">
              Contact
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Full name

                <input
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    update(
                      "fullName",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Nama lengkap"
                />
              </label>

              <label className="text-sm">
                WhatsApp number

                <input
                  required
                  type="tel"
                  value={
                    form.whatsappNumber
                  }
                  onChange={(event) =>
                    update(
                      "whatsappNumber",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="08xxxxxxxxxx"
                />
              </label>

              <label className="text-sm">
                Email{" "}
                <span className="text-looms-gray">
                  (optional)
                </span>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    update(
                      "email",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="email@example.com"
                />
              </label>
            </div>
          </section>

          {/* ========================= */}
          {/* SHIPPING ADDRESS */}
          {/* ========================= */}

          <section>
            <h2 className="font-display text-3xl text-looms-teal">
              Shipping address
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Province

                <select
                  required
                  value={form.province}
                  onChange={(event) =>
                    update(
                      "province",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                >
                  <option value="">
                    Select province
                  </option>

                  {Object.keys(
                    shippingRates
                  ).map((province) => (
                    <option
                      key={province}
                      value={province}
                    >
                      {province}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                City / Regency

                <input
                  required
                  value={form.city}
                  onChange={(event) =>
                    update(
                      "city",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Kota / Kabupaten"
                />
              </label>

              <label className="text-sm">
                District

                <input
                  required
                  value={form.district}
                  onChange={(event) =>
                    update(
                      "district",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Kecamatan"
                />
              </label>

              <label className="text-sm">
                Postal code

                <input
                  required
                  inputMode="numeric"
                  value={form.postalCode}
                  onChange={(event) =>
                    update(
                      "postalCode",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Kode pos"
                />
              </label>

              <label className="text-sm sm:col-span-2">
                Full address

                <textarea
                  required
                  rows={4}
                  value={
                    form.fullAddress
                  }
                  onChange={(event) =>
                    update(
                      "fullAddress",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Alamat lengkap..."
                />
              </label>

              <label className="text-sm sm:col-span-2">
                Notes{" "}
                <span className="text-looms-gray">
                  (optional)
                </span>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    update(
                      "notes",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Catatan untuk pesanan..."
                />
              </label>
            </div>
          </section>

          {/* ========================= */}
          {/* LOOMS SOCIETY */}
          {/* ========================= */}

          <section className="border border-looms-teal/10 bg-looms-cream/30 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-looms-teal">
                THE LOOMS COMMUNITY
              </p>

              <h2 className="mt-2 font-display text-3xl text-looms-teal">
                Looms Society
              </h2>

              <p className="mt-3 text-sm leading-7 text-looms-gray">
                Share your experience with LOOMS.
                Semua bagian di bawah ini optional.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {/* NAME */}

              <label className="block text-sm">
                Nama{" "}
                <span className="text-looms-gray">
                  (optional)
                </span>

                <input
                  value={societyReview.name}
                  onChange={(event) =>
                    updateSocietyReview(
                      "name",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Nama kamu"
                />
              </label>

              {/* RATING */}

              <div>
                <p className="text-sm">
                  Rating{" "}
                  <span className="text-looms-gray">
                    (optional)
                  </span>
                </p>

                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map(
                    (star) => {
                      const active =
                        societyReview.rating !==
                          null &&
                        star <=
                          societyReview.rating;

                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            updateSocietyReview(
                              "rating",
                              active
                                ? null
                                : star
                            )
                          }
                          className={`text-3xl leading-none transition ${
                            active
                              ? "text-looms-teal"
                              : "text-gray-300 hover:text-looms-teal/60"
                          }`}
                          aria-label={`Rating ${star} dari 5`}
                        >
                          ★
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* REVIEW */}

              <label className="block text-sm">
                Review / Notes{" "}
                <span className="text-looms-gray">
                  (optional)
                </span>

                <textarea
                  rows={4}
                  value={
                    societyReview.notes
                  }
                  onChange={(event) =>
                    updateSocietyReview(
                      "notes",
                      event.target.value
                    )
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Ceritakan pengalaman kamu dengan LOOMS..."
                />
              </label>

              <p className="text-xs leading-6 text-looms-gray">
                Dengan mengisi review, kamu
                mengizinkan review tersebut tampil di
                halaman Looms Society.
              </p>
            </div>
          </section>

          {/* ========================= */}
          {/* ERROR */}
          {/* ========================= */}

          {errorMessage && (
            <div className="border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
              <p className="font-medium">
                Checkout gagal
              </p>

              <p className="mt-1">
                {errorMessage}
              </p>
            </div>
          )}

          {/* ========================= */}
          {/* SUBMIT */}
          {/* ========================= */}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-looms-teal px-5 py-4 text-xs font-medium tracking-[0.13em] text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "CREATING ORDER..."
              : "CHECKOUT VIA WHATSAPP"}
          </button>

          <p className="text-center text-xs leading-6 text-looms-gray">
            Your order will be saved first, then
            your review will be saved to Looms
            Society, and finally you will be
            redirected to WhatsApp.
          </p>
        </form>

        {/* ========================= */}
        {/* ORDER SUMMARY */}
        {/* ========================= */}

        <aside className="h-fit border-t border-looms-teal/20 pt-6 lg:sticky lg:top-8 lg:border-t-0 lg:pt-0">
          <h2 className="font-display text-3xl text-looms-teal">
            Summary
          </h2>

          <div className="mt-5 space-y-4">
            {items.map((item) => {
              const unitPrice =
                item.product.salePrice ??
                item.product.price;

              return (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex justify-between gap-4 text-sm"
                >
                  <div>
                    <p>
                      {item.product.name}
                    </p>

                    <p className="mt-1 text-xs text-looms-gray">
                      {item.variant} · Qty{" "}
                      {item.quantity}
                    </p>
                  </div>

                  <p className="whitespace-nowrap">
                    {money(
                      unitPrice *
                        item.quantity
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ========================= */}
          {/* TOTAL */}
          {/* ========================= */}

          <div className="mt-6 space-y-3 border-t border-looms-teal/15 pt-5 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>

              <span>
                {money(subtotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Shipping</span>

              <span>
                {shipping
                  ? money(shipping)
                  : "Complimentary"}
              </span>
            </div>

            <div className="flex justify-between border-t border-looms-teal/15 pt-4 text-base font-medium">
              <span>Total</span>

              <span>
                {money(
                  subtotal + shipping
                )}
              </span>
            </div>
          </div>

          {/* INFO */}

          <div className="mt-6 border border-looms-teal/10 bg-looms-cream/40 px-4 py-4">
            <p className="text-xs leading-6 text-looms-gray">
              Order kamu akan dicatat ke sistem
              LOOMS terlebih dahulu. Jika kamu
              mengisi Looms Society, review juga
              akan disimpan sebelum WhatsApp dibuka.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
