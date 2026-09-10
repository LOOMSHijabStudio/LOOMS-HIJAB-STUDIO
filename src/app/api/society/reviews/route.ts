import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function cleanString(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned || null;
}

function normalizeRating(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const rating =
    Number(value);

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return null;
  }

  return rating;
}

/*
 * ==========================================
 * GET REVIEWS
 * ==========================================
 */

export async function GET() {
  try {
    const client =
      createSupabaseServiceClient();

    const {
      data,
      error,
    } = await client
      .from(
        "looms_society_reviews"
      )
      .select(
        `
          id,
          order_id,
          name,
          rating,
          notes,
          is_public,
          created_at
        `
      )
      .eq(
        "is_public",
        true
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Looms Society GET error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      reviews: data ?? [],
    });
  } catch (error) {
    console.error(
      "Looms Society GET exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load reviews.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ==========================================
 * POST REVIEW
 * ==========================================
 */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const orderId =
      cleanString(
        body?.orderId
      );

    const name =
      cleanString(
        body?.name
      );

    const notes =
      cleanString(
        body?.notes
      );

    const rating =
      normalizeRating(
        body?.rating
      );

    /*
     * Nama / rating / review
     * minimal salah satu harus diisi.
     */
    if (
      !name &&
      !notes &&
      rating === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Review kosong.",
        },
        {
          status: 400,
        }
      );
    }

    const client =
      createSupabaseServiceClient();

    /*
     * ======================================
     * KALAU ORDER ID ADA
     * ======================================
     */

    if (orderId) {
      const {
        data: order,
        error: orderError,
      } = await client
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .maybeSingle();

      if (orderError) {
        console.error(
          "Looms Society order check error:",
          orderError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              orderError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (!order) {
        console.warn(
          "Order ID supplied but not found:",
          orderId
        );
      } else {
        const {
          data,
          error,
        } = await client
          .from(
            "looms_society_reviews"
          )
          .upsert(
            {
              order_id:
                orderId,
              name,
              rating,
              notes,
              is_public: true,
            },
            {
              onConflict:
                "order_id",
            }
          )
          .select(
            `
              id,
              order_id,
              name,
              rating,
              notes,
              is_public,
              created_at
            `
          )
          .single();

        if (error) {
          console.error(
            "Looms Society upsert error:",
            error
          );

          return NextResponse.json(
            {
              success: false,
              error:
                error.message,
            },
            {
              status: 500,
            }
          );
        }

        return NextResponse.json({
          success: true,
          review: data,
        });
      }
    }

    /*
     * ======================================
     * TANPA ORDER ID
     * ======================================
     *
     * Review tetap disimpan.
     *
     * Ini penting karena order sudah
     * berhasil dibuat tetapi ID order
     * belum tersedia di response frontend.
     */

    const {
      data,
      error,
    } = await client
      .from(
        "looms_society_reviews"
      )
      .insert({
        order_id: null,
        name,
        rating,
        notes,
        is_public: true,
      })
      .select(
        `
          id,
          order_id,
          name,
          rating,
          notes,
          is_public,
          created_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Looms Society insert error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      review: data,
    });
  } catch (error) {
    console.error(
      "Looms Society POST exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save review.",
      },
      {
        status: 500,
      }
    );
  }
}
