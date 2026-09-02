"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "COMPLETED", "CANCELLED"];
const money = (value: number | string) => `Rp ${Number(value).toLocaleString("id-ID")}`;

type Order = { id: string; order_number: string; status: string; subtotal: number | string; shipping_amount: number | string; total: number | string; created_at: string; customers: { full_name: string; whatsapp_number: string } | null };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams(); if (search) params.set("search", search); if (status) params.set("status", status);
        const response = await fetch(`/api/admin/orders?${params}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Failed to load orders");
        setOrders(data.orders ?? []);
      } catch (loadError) { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Failed to load orders"); } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [search, status]);

  return <div className="space-y-6"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-looms-gray/60">Commerce</p><h1 className="mt-2 font-display text-4xl text-looms-teal">Pesanan</h1></div>{error && <p className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor order atau nama" className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"><option value="">Semua status</option>{statuses.map((option) => <option key={option}>{option}</option>)}</select></div><div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm"><table className="min-w-full divide-y divide-gray-200 text-left"><thead className="bg-gray-50 text-xs uppercase tracking-[0.12em] text-gray-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal</th></tr></thead><tbody className="divide-y divide-gray-200 text-sm">{loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">Memuat pesanan...</td></tr> : orders.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">Belum ada pesanan.</td></tr> : orders.map((order) => <tr key={order.id} className="hover:bg-gray-50"><td className="px-4 py-4"><Link href={`/admin/orders/${order.id}`} className="font-medium text-looms-teal hover:underline">{order.order_number}</Link></td><td className="px-4 py-4">{order.customers?.full_name ?? "-"}</td><td className="px-4 py-4">{money(order.total)}</td><td className="px-4 py-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{order.status}</span></td><td className="px-4 py-4 text-gray-500">{new Date(order.created_at).toLocaleDateString("id-ID")}</td></tr>)}</tbody></table></div></div>;
}
