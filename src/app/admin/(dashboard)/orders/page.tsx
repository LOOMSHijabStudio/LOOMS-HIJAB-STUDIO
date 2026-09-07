
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number | string;
  shipping_amount: number | string;
  total: number | string;
  created_at: string;
  customers: {
    full_name: string;
    whatsapp_number: string;
  } | null;
};

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (status) {
        params.set("status", status);
      }

      const response = await fetch(
        `/api/admin/orders?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to fetch orders"
        );
      }

      setOrders(data.orders ?? []);
      setTotal(Number(data.total ?? 0));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to fetch orders"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [page, status]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-looms-teal">
            Pesanan
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Kelola seluruh pesanan customer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* FILTER */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-medium text-gray-900">
              Filter Status
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Pilih status pesanan yang ingin ditampilkan.
            </p>
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">
              Semua Status
            </option>

            {statuses.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ORDERS */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            Memuat pesanan...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500">
              Belum ada pesanan.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">

                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left font-medium text-gray-600">
                      Order
                    </th>

                    <th className="px-5 py-4 text-left font-medium text-gray-600">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-left font-medium text-gray-600">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left font-medium text-gray-600">
                      Total
                    </th>

                    <th className="px-5 py-4 text-left font-medium text-gray-600">
                      Tanggal
                    </th>

                    <th className="px-5 py-4 text-right font-medium text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {order.order_number}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {order.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {order.customers?.full_name ?? "-"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {order.customers?.whatsapp_number ?? "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                          {order.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {money(order.total)}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {new Date(
                          order.created_at
                        ).toLocaleString("id-ID")}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex rounded-lg bg-looms-teal px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-gray-200 md:hidden">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="space-y-4 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.order_number}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {order.customers?.full_name ?? "-"}
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                      {order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">
                        Total
                      </p>

                      <p className="mt-1 font-medium">
                        {money(order.total)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Tanggal
                      </p>

                      <p className="mt-1">
                        {new Date(
                          order.created_at
                        ).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="block rounded-lg bg-looms-teal px-4 py-2.5 text-center text-sm font-medium text-white"
                  >
                    View Detail
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && orders.length > 0 && (
        <div className="flex items-center justify-between gap-4">

          <p className="text-sm text-gray-500">
            Halaman {page} dari {totalPages}
          </p>

          <div className="flex gap-2">

            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sebelumnya
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Berikutnya
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
```
