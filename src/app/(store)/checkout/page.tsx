"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { buildCheckoutWhatsAppUrl } from "@/lib/checkout-whatsapp";

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;
const inputClass =
  "w-full border border-looms-teal/20 bg-white px-3 py-3 text-sm outline-none transition focus:border-looms-teal";
const shippingRates: Record<string, number> = {
  "DKI Jakarta": 10000,
  "Jawa Barat": 10000,
  "Banten": 10000,
  "Jawa Tengah": 15000,
  "DI Yogyakarta": 15000,
  "Jawa Timur": 15000,

  "Sumatera Selatan": 30000,
  "Lampung": 30000,
  "Sumatera Barat": 35000,
  "Jambi": 35000,
  "Bengkulu": 35000,
  "Riau": 35000,
  "Sumatera Utara": 40000,
  "Aceh": 45000,
  "Kepulauan Riau": 40000,
  "Kepulauan Bangka Belitung": 40000,

  "Bali": 30000,
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
  "Gorontalo": 50000,

  "Maluku": 55000,
  "Maluku Utara": 60000,
  "Papua": 65000,
  "Papua Barat": 65000,
  "Papua Selatan": 70000,
  "Papua Tengah": 70000,
  "Papua Pegunungan": 75000,
  "Papua Barat Daya": 70000,
};
export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const shipping =
  subtotal >= 500000
    ? 0
    : form.province
      ? shippingRates[form.province] ?? 0
      : 0;

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const whatsappUrl = buildCheckoutWhatsAppUrl({
      customer: {
        fullName: form.fullName,
        whatsappNumber: form.whatsappNumber,
        email: form.email,
      },
      address: {
        province: form.province,
        city: form.city,
        district: form.district,
        postalCode: form.postalCode,
        fullAddress: form.fullAddress,
        notes: form.notes,
      },
      items: items.map((item) => ({
        name: item.product.name,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: item.product.salePrice ?? item.product.price,
      })),
      subtotal,
      shipping,
    });

    window.location.assign(whatsappUrl);
  }

  if (!items.length) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="text-xs tracking-[0.16em] text-looms-gray">YOUR BAG</p>
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
        <p className="text-xs tracking-[0.16em] text-looms-gray">YOUR BAG</p>
        <h1 className="mt-3 font-display text-5xl text-looms-teal">
          Checkout.
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="space-y-8">
          <section>
            <h2 className="font-display text-3xl text-looms-teal">Contact</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Full name
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => update("fullName", event.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="text-sm">
                WhatsApp number
                <input
                  required
                  type="tel"
                  value={form.whatsappNumber}
                  onChange={(event) =>
                    update("whatsappNumber", event.target.value)
                  }
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="text-sm">
                Email <span className="text-looms-gray">(optional)</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
            </div>
          </section>

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
    onChange={(event) => update("province", event.target.value)}
    className={`${inputClass} mt-2`}
  >
    <option value="">Select province</option>

    {Object.keys(shippingRates).map((province) => (
      <option key={province} value={province}>
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
                  onChange={(event) => update("city", event.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="text-sm">
                District
                <input
                  required
                  value={form.district}
                  onChange={(event) => update("district", event.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="text-sm">
                Postal code
                <input
                  required
                  inputMode="numeric"
                  value={form.postalCode}
                  onChange={(event) => update("postalCode", event.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Full address
                <textarea
                  required
                  rows={4}
                  value={form.fullAddress}
                  onChange={(event) => update("fullAddress", event.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Notes <span className="text-looms-gray">(optional)</span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
            </div>
          </section>

          <button
            disabled={isSubmitting}
            className="w-full bg-looms-teal px-5 py-4 text-xs font-medium tracking-[0.13em] text-looms-cream transition hover:bg-looms-teal/90 disabled:opacity-60"
          >
            {isSubmitting ? "OPENING WHATSAPP..." : "CHECKOUT VIA WHATSAPP"}
          </button>
        </form>

        <aside className="h-fit border-t border-looms-teal/20 pt-6 lg:sticky lg:top-8 lg:border-t-0 lg:pt-0">
          <h2 className="font-display text-3xl text-looms-teal">Summary</h2>
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex justify-between gap-4 text-sm"
              >
                <div>
                  <p>{item.product.name}</p>
                  <p className="mt-1 text-xs text-looms-gray">
                    {item.variant} &middot; Qty {item.quantity}
                  </p>
                </div>
                <p>
                  {money(
                    (item.product.salePrice ?? item.product.price) *
                      item.quantity
                  )}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3 border-t border-looms-teal/15 pt-5 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shipping ? money(shipping) : "Complimentary"}</span>
            </div>
            <div className="flex justify-between border-t border-looms-teal/15 pt-4 text-base font-medium">
              <span>Total</span>
              <span>{money(subtotal + shipping)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
