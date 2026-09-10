```tsx
"use client";

import { FormEvent, useState } from "react";

const inputClass =
  "w-full border border-looms-teal/20 bg-white px-3 py-3 text-sm outline-none transition focus:border-looms-teal";

export function SocietyReviewForm() {
  const [name, setName] = useState("");
  const [rating, setRating] =
    useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/society/reviews",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim() || null,
            rating,
            notes: notes.trim() || null,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Review gagal disimpan."
        );
      }

      setName("");
      setRating(null);
      setNotes("");

      setMessage(
        "Thank you. Your review has been submitted."
      );
    } catch (error) {
      console.error(
        "Looms Society review submit error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Review gagal disimpan. Silakan coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="border-y border-looms-teal/10 bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 lg:py-20">

        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-looms-teal">
            YOUR VOICE MATTERS
          </p>

          <h2 className="mt-3 font-display text-4xl text-looms-teal sm:text-5xl">
            Share your experience.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-looms-gray">
            Tell us about your experience
            with LOOMS. You may leave your
            name, rating, review, or all three.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-10 space-y-6"
        >

          <label className="block text-sm">
            Name{" "}
            <span className="text-looms-gray">
              (optional)
            </span>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className={`${inputClass} mt-2`}
              placeholder="Your name"
            />
          </label>

          <div>
            <p className="text-sm">
              Rating{" "}
              <span className="text-looms-gray">
                (optional)
              </span>
            </p>

            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map(
                (star) => {
                  const active =
                    rating !== null &&
                    star <= rating;

                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setRating(
                          active
                            ? null
                            : star
                        )
                      }
                      className={`text-3xl leading-none transition ${
                        active
                          ? "text-looms-teal"
                          : "text-gray-300 hover:text-looms-teal/60"
                      }`}
                      aria-label={`Rating ${star} dari 5`}
                    >
                      ★
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <label className="block text-sm">
            Review / Notes{" "}
            <span className="text-looms-gray">
              (optional)
            </span>

            <textarea
              rows={5}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              className={`${inputClass} mt-2`}
              placeholder="Tell us about your experience with LOOMS..."
            />
          </label>

          {message && (
            <div className="border border-looms-teal/20 bg-looms-cream px-4 py-4 text-sm text-looms-teal">
              {message}
            </div>
          )}

          {error && (
            <div className="border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-looms-teal px-5 py-4 text-xs font-medium tracking-[0.13em] text-looms-cream transition hover:bg-looms-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "SUBMITTING..."
              : "SUBMIT REVIEW"}
          </button>

          <p className="text-center text-xs leading-6 text-looms-gray">
            By submitting a review, you
            allow LOOMS to display it on
            the Looms Society page.
          </p>

        </form>
      </div>
    </section>
  );
}
```
