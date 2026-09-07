"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const statuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

const money = (value: number | string | null | undefined) =>
  `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;

type Customer = {
  full_name?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number | string;
  shipping_amount: number | string;
  total: number | string;
  created_at: string;
  customers: Customer | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (status) {
          params.set("status", status);
        }

        const response = await fetch(
          `/api/admin/orders?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to fetch orders",
          );
        }

        setOrders(data.orders ?? []);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to fetch orders",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [search, status],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void loadOrders(controller.signal);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadOrders]);

  async function handleDelete(order: Order) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus pesanan ${order.order_number}?\n\nData pesanan akan dihapus dari daftar pesanan.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(order.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${order.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gagal menghapus pesanan",
        );
      }

      setOrders((current) =>
        current.filter(
          (item) => item.id !== order.id,
        ),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus pesanan",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-looms-gray/60">
          Commerce
        </p>

        <h1 className="mt-2 font-display text-4xl text-looms-teal">
          Pesanan
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Kelola seluruh pesanan pelanggan dari sini.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* FILTER */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Cari nomor order, nama, atau WhatsApp"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-looms-teal"
        />

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-looms-teal"
        >
          <option value="">
            Semua status
          </option>

          {statuses.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-[0.12em] text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  Order
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Customer
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Total
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Status
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Tanggal
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    Memuat pesanan...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    Belum ada pesanan.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition hover:bg-gray-50"
                  >
                    {/* ORDER */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-looms-teal hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>

                    {/* CUSTOMER */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.customers
                            ?.full_name || "-"}
                        </p>

                        {order.customers
                          ?.whatsapp_number && (
                          <p className="mt-1 text-xs text-gray-500">
                            {
                              order.customers
                                .whatsapp_number
                            }
                          </p>
                        )}
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td className="whitespace-nowrap px-4 py-4 font-medium">
                      {money(order.total)}
                    </td>

                    {/* STATUS */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          order.status ===
                          "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : order.status ===
                                "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* DATE */}
                    <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                      {new Date(
                        order.created_at,
                      ).toLocaleDateString(
                        "id-ID",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="rounded-lg border border-looms-teal px-3 py-2 text-xs font-medium text-looms-teal transition hover:bg-looms-teal hover:text-white"
                        >
                          View
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(order)
                          }
                          disabled={
                            deletingId ===
                            order.id
                          }
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId ===
                          order.id
                            ? "Menghapus..."
                            : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
