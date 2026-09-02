"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat daftar admin user");
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-looms-teal/70">
            Access Control
          </p>
          <h1 className="text-3xl font-display text-looms-teal mt-1">
            Admin Users
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kelola staf dan hak akses (role) administrator LOOMS
          </p>
        </div>

        <button
          onClick={() => void loadUsers()}
          className="self-start sm:self-auto bg-white border border-gray-200 hover:bg-gray-50 rounded-lg px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition"
        >
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Nama & Email</th>
                <th className="px-5 py-3.5">Username</th>
                <th className="px-5 py-3.5">Peran (Roles)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Terdaftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-looms-teal border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    Belum ada admin user yang terdaftar.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">
                        {u.displayName || u.email}
                      </div>
                      <div className="text-gray-400 text-[11px] font-mono">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-600">
                      {u.username ? `@${u.username}` : "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length > 0 ? (
                          u.roles.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                role === "OWNER"
                                  ? "bg-purple-100 text-purple-800"
                                  : role === "ADMIN"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-[11px]">Tanpa role</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
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
