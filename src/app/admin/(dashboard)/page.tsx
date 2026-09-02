import { getAdminSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-display text-looms-teal">Dashboard</h1>
        <p className="text-looms-gray mt-2">
          Selamat datang, {session.displayName || session.email}!
        </p>
      </div>

      {/* Welcome Card */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-semibold text-looms-teal mb-4">
          Admin Panel
        </h2>
        <p className="text-looms-gray">
          Gunakan menu di samping untuk mengelola konten LOOMS.
        </p>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-looms-gray mb-3">
            Peran Anda:
          </h3>
          <div className="space-y-2">
            {session.roles.map((role) => (
              <div key={role} className="inline-block bg-looms-teal/10 text-looms-teal px-3 py-1 rounded text-sm mr-2">
                {role}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {session.roles.includes("OWNER") && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">OWNER</h3>
            <p className="text-sm text-blue-700">
              Akses penuh ke semua fitur dan pengaturan sistem.
            </p>
          </div>
        )}
        {session.roles.includes("ADMIN") && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-2">ADMIN</h3>
            <p className="text-sm text-green-700">
              Kelola produk, stok, pesanan, dan dashboard.
            </p>
          </div>
        )}
        {session.roles.includes("EDITOR") && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="font-semibold text-amber-900 mb-2">EDITOR</h3>
            <p className="text-sm text-amber-700">
              Edit konten produk dan kelola gambar.
            </p>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-2">Keamanan</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Akses tidak sah akan dicatat untuk audit.</li>
          <li>• Jangan bagikan kredensial login Anda.</li>
          <li>• Pastikan logout setelah selesai bekerja.</li>
          <li>• Gunakan password yang kuat.</li>
        </ul>
      </div>
    </div>
  );
}
