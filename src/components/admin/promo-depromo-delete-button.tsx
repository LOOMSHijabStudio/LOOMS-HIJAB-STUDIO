"use client";

import { useState } from "react";

type PromoDeleteButtonProps = {
  id: string;
  code: string;
};

export function PromoDeleteButton({
  id,
  code,
}: PromoDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Hapus kode promo "${code}"? Promo yang sudah dihapus tidak dapat dikembalikan.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const response = await fetch("/api/admin/promo-codes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Promo gagal dihapus."
        );
      }

      window.location.reload();
    } catch (error) {
      console.error("Delete promo error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Promo gagal dihapus."
      );

      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDeleting ? "Menghapus..." : "Hapus"}
    </button>
  );
}
