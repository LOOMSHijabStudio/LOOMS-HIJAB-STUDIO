"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

const statuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

const money = (value: number | string) =>
  `Rp ${Number(value).toLocaleString("id-ID")}`;

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number | string;
  shipping_amount: number | string;
  total: number | string;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerData = {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email: string | null;
} | null;

type AddressData = {
  id: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
  full_address: string;
} | null;

type OrderItem = {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  sku_snapshot: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
};

type StatusHistory = {
  id?: string;
  order_id?: string;
  status?: string;
  from_status?: string | null;
  to_status?: string;
  created_at?: string;
};

type Detail = {
  order: OrderData & {
    customer: CustomerData;
    address: AddressData;
    items: OrderItem[];
    status_history: StatusHistory[];
  };
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      try {
        setError(null);

        const response = await fetch(`/api/admin/orders/${id}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load order");
        }

        if (!cancelled) {
          setDetail(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load order"
          );
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function updateStatus(status: string) {
    if (!detail) return;

    const previousStatus = detail.order.status;

    if (status === previousStatus) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      setDetail((current) => {
        if (!current) return current;

        return {
          ...current,
          order: {
            ...current.order,
            status,
            updated_at: new Date().toISOString(),
          },
        };
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update status"
      );
    } finally {
      setSaving(false);
    }
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/orders"
          className="text-sm text-looms-teal hover:underline"
        >
          ← Semua pesanan
        </Link>

        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/orders"
          className="text-sm text-looms-teal hover:underline"
        >
          ← Semua pesanan
        </Link>

        <p className="text-sm text-gray-500">
          Memuat pesanan...
        </p>
      </div>
    );
  }

  const order = detail.order;
  const customer = order.customer;
  const address = order.address;
  const items = order.items ?? [];
  const history = order.status_history ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* BACK */}
      <Link
        href="/admin/orders"
        className="text-sm text-looms-teal hover:underline"
      >
        ← Semua pesanan
      </Link>

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
            Order
          </p>

          <h1 className="mt-2 font-display text-4xl text-looms-teal">
            {order.order_number}
          </h1>
        </div>

        <div>
          <p className="mb-2 text-xs text-gray-500">
            Status Pesanan
          </p>

          <select
            disabled={saving}
            value={order.status}
            onChange={(event) =>
              void updateStatus(event.target.value)
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* UPDATE ERROR */}
      {error && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* CUSTOMER + ADDRESS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* CUSTOMER */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl text-looms-teal">
            Customer
          </h2>

          {customer ? (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">
                  Nama
                </p>

                <p className="mt-1 font-medium">
                  {customer.full_name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  WhatsApp
                </p>

                <p className="mt-1">
                  {customer.whatsapp_number}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Email
                </p>

                <p className="mt-1">
                  {customer.email ?? "-"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Data customer tidak ditemukan.
            </p>
          )}
        </section>

        {/* ADDRESS */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl text-looms-teal">
            Pengiriman
          </h2>

          {address ? (
            <div className="mt-4 space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">
                  Alamat
                </p>

                <p className="mt-1">
                  {address.full_address}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Kecamatan
                </p>

                <p className="mt-1">
                  {address.district}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Kota
                </p>

                <p className="mt-1">
                  {address.city}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Provinsi
                </p>

                <p className="mt-1">
                  {address.province}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Kode Pos
                </p>

                <p className="mt-1">
                  {address.postal_code}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Alamat tidak ditemukan.
            </p>
          )}
        </section>
      </div>

      {/* ITEMS */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-2xl text-looms-teal">
          Items Pesanan
        </h2>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Tidak ada item dalam pesanan.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-gray-200">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {item.product_name_snapshot}
                  </p>

                  <p className="mt-1 text-gray-500">
                    {item.variant_name_snapshot ?? "Default"}
                    {" · "}
                    Qty {item.quantity}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    SKU: {item.sku_snapshot}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-medium">
                    {money(
                      Number(item.unit_price) *
                        item.quantity
                    )}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {money(item.unit_price)} / item
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TOTAL */}
        <div className="mt-4 border-t border-gray-200 pt-4 text-sm">
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>
              {money(order.subtotal)}
            </span>
          </p>

          <p className="mt-2 flex justify-between">
            <span>Shipping</span>
            <span>
              {money(order.shipping_amount)}
            </span>
          </p>

          <p className="mt-3 flex justify-between text-base font-medium">
            <span>Total</span>
            <span>
              {money(order.total)}
            </span>
          </p>
        </div>

        {/* NOTES */}
        {order.customer_notes && (
          <div className="mt-5 border-t border-gray-200 pt-4">
            <p className="text-sm font-medium">
              Catatan Customer
            </p>

            <p className="mt-2 text-sm text-gray-600">
              {order.customer_notes}
            </p>
          </div>
        )}
      </section>

      {/* ORDER INFORMATION */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-2xl text-looms-teal">
          Informasi Pesanan
        </h2>

        <div className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">
              Order ID
            </p>

            <p className="mt-1 break-all">
              {order.id}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Nomor Order
            </p>

            <p className="mt-1 font-medium">
              {order.order_number}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Dibuat
            </p>

            <p className="mt-1">
              {new Date(
                order.created_at
              ).toLocaleString("id-ID")}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Terakhir diperbarui
            </p>

            <p className="mt-1">
              {new Date(
                order.updated_at
              ).toLocaleString("id-ID")}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Status
            </p>

            <p className="mt-1 font-medium">
              {order.status}
            </p>
          </div>
        </div>
      </section>

      {/* STATUS HISTORY */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-2xl text-looms-teal">
          Status History
        </h2>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Belum ada riwayat status.
          </p>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            {history.map((entry, index) => {
              const currentStatus =
                entry.to_status ??
                entry.status ??
                "-";

              const previousStatus =
                entry.from_status ??
                (index === 0 ? "NEW" : null);

              return (
                <div
                  key={
                    entry.id ??
                    `${currentStatus}-${index}`
                  }
                  className="rounded-lg bg-gray-50 p-3"
                >
                  <p className="font-medium">
                    {previousStatus
                      ? `${previousStatus} → ${currentStatus}`
                      : currentStatus}
                  </p>

                  {entry.created_at && (
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(
                        entry.created_at
                      ).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
