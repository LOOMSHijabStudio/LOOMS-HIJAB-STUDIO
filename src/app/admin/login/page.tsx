"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LoginState {
  isLoading: boolean;
  error: string | null;
  remainingAttempts?: number;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<LoginState>({
    isLoading: false,
    error: null,
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Clear previous errors
    setState((prev) => ({ ...prev, error: null }));

    // Validate inputs
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setState((prev) => ({
        ...prev,
        error: "Username/email dan password harus diisi.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: trimmedIdentifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setState((prev) => ({
          ...prev,
          error: data.error || "Terjadi kesalahan saat login.",
          remainingAttempts: data.remainingAttempts,
        }));
        return;
      }

      if (data.success && data.redirectUrl) {
        router.push(data.redirectUrl);
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setState((prev) => ({
        ...prev,
        error: "Terjadi kesalahan koneksi saat login. Silakan coba lagi.",
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <h1 className="font-display text-4xl tracking-[0.16em] text-looms-teal">
              LOOMS
            </h1>
            <p className="text-xs tracking-[0.2em] uppercase text-looms-teal/70 mt-1 font-medium">
              Management Portal
            </p>
          </Link>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl shadow-looms-teal/5 rounded-2xl sm:px-10 border border-gray-100">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Masuk ke Admin Panel
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Gunakan kredensial admin terdaftar Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier Field (Username or Email) */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
              >
                Username atau Email
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username atau email admin"
                autoComplete="username email"
                disabled={state.isLoading}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-looms-teal focus:ring-2 focus:ring-looms-teal/20 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={state.isLoading}
                  required
                  className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-looms-teal focus:ring-2 focus:ring-looms-teal/20 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <svg
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <svg
                    className="w-4 h-4 text-red-500 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{state.error}</span>
                </div>
                {state.remainingAttempts !== undefined && (
                  <p className="pl-5 text-red-600 font-medium">
                    Sisa percobaan yang diperbolehkan: {state.remainingAttempts}
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={state.isLoading}
              className="w-full bg-looms-teal text-looms-cream font-medium py-3 rounded-lg hover:bg-looms-teal/90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-sm text-sm tracking-wide"
            >
              {state.isLoading && (
                <svg
                  className="animate-spin h-4 w-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              <span>{state.isLoading ? "Memproses..." : "Masuk ke Admin Panel"}</span>
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-[11px] text-gray-400 space-y-1">
            <p>Akses terbatas hanya untuk administrator resmi LOOMS.</p>
            <p>Seluruh aktivitas login dan audit dicatat demi keamanan.</p>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-looms-teal hover:underline transition-colors font-medium inline-flex items-center gap-1"
          >
            <span>← Kembali ke Toko LOOMS</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
