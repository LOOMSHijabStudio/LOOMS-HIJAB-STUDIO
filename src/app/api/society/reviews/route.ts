import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function cleanString(
  value: unknown,
  fallback: string | null = null
): string | null {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();

  return cleaned ? cleaned : fallback;
}

function normalizeRating(
  value: unknown
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const rating = Number(value);

  if (!Number.isInteger(rating)) {
    return null;
  }

  if (rating < 1 || rating > 5) {
    return null;
  }

  return rating;
}

/*
 * GET
 * Dipakai halaman Looms Society
 */
export async function GET() {
  try {
    const client = createSupabaseServiceClient();

    const {
      data,
      error,
    } = await client
      .from("looms_society_reviews")
      .select(`
        id,
        order_id,
        name,
        rating,
        notes,
        is_public,
        created_at
      `)
      .eq("is_public", true)
      .order("created_at", {
        ascending: false,
      });

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
            : "Failed to load reviews",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * POST
 * Dipakai checkout untuk menyimpan review
 */
export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const orderId = cleanString(body?.orderId);
    const name = cleanString(body?.name);
    const notes = cleanString(body?.notes);
    const rating = normalizeRating(body?.rating);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Minimal salah satu dari:
     * nama / rating / review
     * harus diisi.
     */
    if (!name && !notes && rating === null) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Review kosong. Isi nama, rating, atau review.",
        },
        {
          status: 400,
        }
      );
    }

    const client =
      createSupabaseServiceClient();

    /*
     * Pastikan order benar-benar ada.
     */
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
          error: orderError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Satu order = satu review.
     * Kalau order yang sama mengirim lagi,
     * review akan diperbarui.
     */
    const {
      data,
      error,
    } = await client
      .from("looms_society_reviews")
      .upsert(
        {
          order_id: orderId,
          name,
          rating,
          notes,
          is_public: true,
        },
        {
          onConflict: "order_id",
        }
      )
      .select(`
        id,
        order_id,
        name,
        rating,
        notes,
        is_public,
        created_at
      `)
      .single();

    if (error) {
      console.error(
        "Looms Society POST error:",
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
            : "Failed to save review",
      },
      {
        status: 500,
      }
    );
  }
}
