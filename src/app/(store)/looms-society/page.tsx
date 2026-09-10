import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type SocietyReview = {
  id: string;
  name: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
};

async function getReviews(): Promise<SocietyReview[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from("looms_society_reviews")
      .select(`
        id,
        name,
        rating,
        notes,
        created_at
      `)
      .eq("is_public", true)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Failed to load Looms Society reviews:",
        error
      );

      return [];
    }

    return (data ?? []) as SocietyReview[];
  } catch (error) {
    console.error(
      "Looms Society reviews error:",
      error
    );

    return [];
  }
}

function Stars({
  rating,
}: {
  rating: number | null;
}) {
  const value =
    typeof rating === "number" ? rating : 0;

  return (
    <div
      className="flex items-center gap-1"
      aria-label={
        rating
          ? `${rating} dari 5 bintang`
          : "Belum ada rating"
      }
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= value
              ? "text-looms-teal"
              : "text-gray-300"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

export default async function LoomsSocietyPage() {
  const reviews = await getReviews();

  const ratedReviews = reviews.filter(
    (review) =>
      typeof review.rating === "number"
  );

  const totalRating = ratedReviews.reduce(
    (sum, review) =>
      sum + Number(review.rating ?? 0),
    0
  );

  const averageRating =
    ratedReviews.length > 0
      ? totalRating / ratedReviews.length
      : 0;

  return (
    <main className="min-h-screen bg-looms-cream">

      {/* HERO */}
      <section className="border-b border-looms-teal/10">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-10 lg:py-28">

          <p className="text-xs font-medium uppercase tracking-[0.28em] text-looms-teal">
            THE LOOMS COMMUNITY
          </p>

          <h1 className="mt-5 font-display text-5xl leading-[0.95] text-looms-teal sm:text-6xl lg:text-7xl">
            Looms Society
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-sm leading-8 text-looms-gray sm:text-base">
            A space for the people who wear,
            experience, and grow with LOOMS.
            Discover stories and thoughts from
            our community.
          </p>

        </div>
      </section>

      {/* RATING SUMMARY */}
      <section className="border-b border-looms-teal/10 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-14 text-center sm:flex-row sm:gap-10">

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-looms-gray">
              Community Rating
            </p>

            <div className="mt-3 flex items-center gap-4">
              <span className="font-display text-5xl text-looms-teal">
                {averageRating > 0
                  ? averageRating.toFixed(1)
                  : "—"}
              </span>

              <div className="text-left">
                <Stars
                  rating={
                    ratedReviews.length > 0
                      ? Math.round(
                          averageRating
                        )
                      : null
                  }
                />

                <p className="mt-1 text-xs text-looms-gray">
                  {ratedReviews.length}{" "}
                  {ratedReviews.length === 1
                    ? "rating"
                    : "ratings"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* REVIEWS */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:py-24">

        {reviews.length === 0 ? (
          <div className="mx-auto max-w-2xl py-20 text-center">

            <p className="text-xs font-medium uppercase tracking-[0.25em] text-looms-gray">
              LOOMS SOCIETY
            </p>

            <h2 className="mt-4 font-display text-4xl text-looms-teal">
              Be the first to share.
            </h2>

            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-looms-gray">
              Setelah melakukan pembelian,
              kamu bisa memberikan rating dan
              cerita singkat di halaman checkout.
            </p>

          </div>
        ) : (
          <>
            <div className="mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-looms-gray">
                FROM OUR COMMUNITY
              </p>

              <h2 className="mt-3 font-display text-4xl text-looms-teal sm:text-5xl">
                What they say.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="bg-white p-6 shadow-sm"
                >

                  <div className="flex items-start justify-between gap-4">
                    <Stars
                      rating={review.rating}
                    />

                    <p className="text-[10px] text-looms-gray">
                      {formatDate(
                        review.created_at
                      )}
                    </p>
                  </div>

                  {review.notes ? (
                    <p className="mt-5 text-sm leading-7 text-looms-teal">
                      “{review.notes}”
                    </p>
                  ) : (
                    <p className="mt-5 text-sm italic leading-7 text-looms-gray">
                      Customer memberikan
                      rating untuk LOOMS.
                    </p>
                  )}

                  <div className="mt-6 border-t border-looms-teal/10 pt-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-looms-gray">
                      {review.name ||
                        "LOOMS Customer"}
                    </p>
                  </div>

                </article>
              ))}

            </div>
          </>
        )}

      </section>

    </main>
  );
}
