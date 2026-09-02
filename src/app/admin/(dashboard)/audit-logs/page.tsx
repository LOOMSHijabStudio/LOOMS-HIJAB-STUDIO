"use client";

import { useCallback, useEffect, useState } from "react";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (actionFilter) {
        params.append("action", actionFilter);
      }

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat audit log");
      }

      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  function formatAction(action: string) {
    const map: Record<string, { label: string; color: string }> = {
      "auth.login_success": { label: "Login Sukses", color: "bg-green-100 text-green-800" },
      "auth.login_failure": { label: "Login Gagal", color: "bg-red-100 text-red-800" },
      "auth.logout": { label: "Logout", color: "bg-gray-100 text-gray-800" },
      "admin.product_created": { label: "Produk Dibuat", color: "bg-blue-100 text-blue-800" },
      "admin.product_updated": { label: "Produk Diubah", color: "bg-amber-100 text-amber-800" },
      "admin.product_deleted": { label: "Produk Dihapus", color: "bg-red-100 text-red-800" },
      "admin.role_changed": { label: "Role Diubah", color: "bg-purple-100 text-purple-800" },
    };

    const info = map[action] || { label: action, color: "bg-gray-100 text-gray-700" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
        {info.label}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
            Security & Compliance
          </p>
          <h1 className="text-3xl font-display text-looms-teal mt-1">
            Audit Logs
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Rekam jejak seluruh aktivitas keamanan dan operasional admin
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-looms-teal shadow-sm"
          >
            <option value="">Semua Aksi</option>
            <option value="auth.login_success">Login Sukses</option>
            <option value="auth.login_failure">Login Gagal</option>
            <option value="auth.logout">Logout</option>
            <option value="admin.product_created">Produk Dibuat</option>
            <option value="admin.product_updated">Produk Diubah</option>
            <option value="admin.product_deleted">Produk Dihapus</option>
            <option value="admin.role_changed">Role Diubah</option>
          </select>

          <button
            onClick={() => void fetchLogs()}
            className="bg-white border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Aksi</th>
                <th className="px-5 py-3.5">Entitas</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5">Detail Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-looms-teal border-t-transparent rounded-full animate-spin" />
                      <span>Memuat log keamanan...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    Tidak ada catatan audit log yang ditemukan.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-500 font-mono">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {formatAction(log.action)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[11px] text-gray-600">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-gray-500">
                      {log.ip_address || "unknown"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-gray-600 max-w-xs truncate">
                      {log.metadata && Object.keys(log.metadata).length > 0
                        ? JSON.stringify(log.metadata)
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            Menampilkan {logs.length} dari {total} log
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              Sebelumnya
            </button>
            <span>
              Halaman {page} / {Math.max(1, totalPages)}
            </span>
            <button
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-white border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
