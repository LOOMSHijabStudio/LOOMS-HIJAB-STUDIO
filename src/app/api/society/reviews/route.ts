import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * =========================================================
 * GET
 * =========================================================
 *
 * Mengambil review yang boleh tampil di Looms Society.
 */
export async function GET() {
  try {
    const client =
      createSupabaseServiceClient();

    const {
      data,
      error,
    } = await client
      .from("looms_society_reviews")
      .select(
        `
          id,
          name,
          rating,
          notes,
          created_at
        `
      )
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
          error:
            "Gagal mengambil review Looms Society",
        },
        { status: 500 }
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
          "Gagal mengambil review Looms Society",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 *
 * Menyimpan review setelah order berhasil dibuat.
 *
 * Semua field review bersifat opsional.
 */
export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const orderId =
      typeof body.orderId === "string"
        ? body.orderId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : "";

    const rawRating = body.rating;

    const rating =
      rawRating === null ||
      rawRating === undefined ||
      rawRating === ""
        ? null
        : Number(rawRating);

    /*
     * Tidak ada isi review sama sekali.
     *
     * Ini tetap dianggap valid, tetapi
     * biasanya frontend tidak akan memanggil API
     * kalau semuanya kosong.
     */
    if (
      !orderId &&
      !name &&
      !notes &&
      rating === null
    ) {
      return NextResponse.json({
        success: true,
        skipped: true,
      });
    }

    /*
     * Order ID wajib supaya review terhubung
     * dengan order yang benar.
     */
    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order ID tidak ditemukan",
        },
        { status: 400 }
      );
    }

    /*
     * Validasi rating.
     */
    if (
      rating !== null &&
      (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Rating harus antara 1 sampai 5",
        },
        { status: 400 }
      );
    }

    /*
     * Batasi panjang input.
     */
    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nama terlalu panjang",
        },
        { status: 400 }
      );
    }

    if (notes.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Review terlalu panjang",
        },
        { status: 400 }
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
          error:
            "Gagal memeriksa pesanan",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pesanan tidak ditemukan",
        },
        { status: 404 }
      );
    }

    /*
     * Cek apakah order sudah pernah memberi review.
     */
    const {
      data: existingReview,
      error: existingError,
    } = await client
      .from("looms_society_reviews")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Looms Society existing review error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gagal memeriksa review",
        },
        { status: 500 }
      );
    }

    /*
     * Kalau sudah ada → update.
     *
     * Kalau belum ada → insert.
     */
    if (existingReview) {
      const {
        data,
        error,
      } = await client
        .from("looms_society_reviews")
        .update({
          name:
            name || null,

          rating,

          notes:
            notes || null,

          is_public: true,
        })
        .eq("id", existingReview.id)
        .select()
        .single();

      if (error) {
        console.error(
          "Looms Society update error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Gagal memperbarui review",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        review: data,
      });
    }

    /*
     * Review baru.
     */
    const {
      data,
      error,
    } = await client
      .from("looms_society_reviews")
      .insert({
        order_id: orderId,

        name:
          name || null,

        rating,

        notes:
          notes || null,

        is_public: true,
      })
      .select()
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
            "Gagal menyimpan review",
        },
        { status: 500 }
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
          "Gagal menyimpan review Looms Society",
      },
      { status: 500 }
    );
  }
}
