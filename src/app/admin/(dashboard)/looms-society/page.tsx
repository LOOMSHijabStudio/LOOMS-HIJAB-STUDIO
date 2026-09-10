"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SocietyReview = {
  id: string;
  order_id: string | null;
  name: string | null;
  rating: number | null;
  notes: string | null;
  is_public: boolean;
  created_at: string;
};

function formatDate(
  value: string
): string {
  return new Date(
    value
  ).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function renderStars(
  rating: number | null
): string {
  if (
    rating === null ||
    rating < 1
  ) {
    return "☆☆☆☆☆";
  }

  return (
    "★".repeat(rating) +
    "☆".repeat(5 - rating)
  );
}

export default function AdminLoomsSocietyPage() {
  const [reviews, setReviews] =
    useState<SocietyReview[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadReviews =
    useCallback(async () => {
      try {
        setError(null);

        const response =
          await fetch(
            "/api/admin/society/reviews",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Gagal memuat review Looms Society."
          );
        }

        setReviews(
          Array.isArray(
            data.reviews
          )
            ? data.reviews
            : []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat review."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const ratingStats =
    useMemo(() => {
      const ratedReviews =
        reviews.filter(
          (review) =>
            review.rating !== null
        );

      if (
        ratedReviews.length === 0
      ) {
        return {
          average: "0.0",
          total: 0,
          five: 0,
          four: 0,
          three: 0,
          two: 0,
          one: 0,
        };
      }

      const total =
        ratedReviews.length;

      const sum =
        ratedReviews.reduce(
          (
            accumulator,
            review
          ) =>
            accumulator +
            (review.rating ?? 0),
          0
        );

      return {
        average: (
          sum / total
        ).toFixed(1),

        total,

        five: ratedReviews.filter(
          (review) =>
            review.rating === 5
        ).length,

        four: ratedReviews.filter(
          (review) =>
            review.rating === 4
        ).length,

        three: ratedReviews.filter(
          (review) =>
            review.rating === 3
        ).length,

        two: ratedReviews.filter(
          (review) =>
            review.rating === 2
        ).length,

        one: ratedReviews.filter(
          (review) =>
            review.rating === 1
        ).length,
      };
    }, [reviews]);

  async function handleDelete(
    review: SocietyReview
  ) {
    const reviewer =
      review.name?.trim() ||
      "Anonymous";

    const confirmed =
      window.confirm(
        `Hapus review dari "${reviewer}"?\n\nReview yang dihapus tidak akan tampil lagi di Looms Society.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        review.id
      );

      setError(null);
      setSuccess(null);

      const response =
        await fetch(
          `/api/admin/society/reviews?id=${encodeURIComponent(
            review.id
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Gagal menghapus review."
        );
      }

      setReviews(
        (current) =>
          current.filter(
            (item) =>
              item.id !== review.id
          )
      );

      setSuccess(
        "Review berhasil dihapus dari Looms Society."
      );

      window.setTimeout(() => {
        setSuccess(null);
      }, 4000);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus review."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-looms-gray/60">
          Community
        </p>

        <h1 className="mt-2 font-display text-4xl text-looms-teal">
          Looms Society
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Kelola rating dan review pelanggan
          yang tampil di halaman Looms Society.
        </p>
      </div>

      {/* ================================= */}
      {/* SUCCESS */}
      {/* ================================= */}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* ================================= */}
      {/* ERROR */}
      {/* ================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ================================= */}
      {/* SUMMARY */}
      {/* ================================= */}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
            Average Rating
          </p>

          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-5xl text-looms-teal">
              {ratingStats.average}
            </span>

            <span className="pb-2 text-lg text-looms-teal">
              ★
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
            Total Ratings
          </p>

          <p className="mt-3 font-display text-5xl text-looms-teal">
            {ratingStats.total}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
            Total Reviews
          </p>

          <p className="mt-3 font-display text-5xl text-looms-teal">
            {reviews.length}
          </p>
        </div>
      </div>

      {/* ================================= */}
      {/* RATING BREAKDOWN */}
      {/* ================================= */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-2xl text-looms-teal">
          Rating Overview
        </h2>

        <div className="mt-5 space-y-3">
          {[
            {
              stars: 5,
              count: ratingStats.five,
            },
            {
              stars: 4,
              count: ratingStats.four,
            },
            {
              stars: 3,
              count: ratingStats.three,
            },
            {
              stars: 2,
              count: ratingStats.two,
            },
            {
              stars: 1,
              count: ratingStats.one,
            },
          ].map(
            (item) => {
              const percentage =
                ratingStats.total > 0
                  ? Math.round(
                      (item.count /
                        ratingStats.total) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={item.stars}
                  className="flex items-center gap-3"
                >
                  <div className="w-20 shrink-0 text-sm text-gray-600">
                    {item.stars} ★
                  </div>

                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-looms-teal transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <div className="w-12 text-right text-xs text-gray-500">
                    {item.count}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* ================================= */}
      {/* REVIEWS */}
      {/* ================================= */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-looms-teal">
              Customer Reviews
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Review terbaru berada di bagian atas.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadReviews()
            }
            className="self-start rounded-lg border border-looms-teal/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-looms-teal transition hover:bg-looms-teal/5"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="px-5 py-16 text-center text-sm text-gray-500">
            Memuat review Looms Society...
          </div>
        ) : reviews.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-display text-3xl text-looms-teal">
              Belum ada review.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Review pelanggan akan muncul di
              sini setelah mereka mengirim rating
              atau komentar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reviews.map(
              (review) => {
                const reviewer =
                  review.name?.trim() ||
                  "Anonymous";

                return (
                  <div
                    key={review.id}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {/* TOP */}

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold uppercase tracking-[0.12em] text-looms-teal">
                              {reviewer}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              {formatDate(
                                review.created_at
                              )}
                            </p>
                          </div>

                          <div className="text-lg tracking-[0.14em] text-looms-teal">
                            {renderStars(
                              review.rating
                            )}
                          </div>
                        </div>

                        {/* REVIEW */}

                        {review.notes && (
                          <div className="mt-5 border-l-2 border-looms-teal/20 pl-4">
                            <p className="text-sm leading-7 text-gray-700">
                              “
                              {
                                review.notes
                              }
                              ”
                            </p>
                          </div>
                        )}

                        {/* META */}

                        <div className="mt-5 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                              review.is_public
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {review.is_public
                              ? "Public"
                              : "Hidden"}
                          </span>

                          {review.order_id && (
                            <span className="rounded-full bg-gray-50 px-3 py-1 text-[10px] font-medium text-gray-500">
                              Order terhubung
                            </span>
                          )}
                        </div>
                      </div>

                      {/* DELETE */}

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(
                            review
                          )
                        }
                        disabled={
                          deletingId ===
                          review.id
                        }
                        className="self-start rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId ===
                        review.id
                          ? "Menghapus..."
                          : "Hapus"}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}
