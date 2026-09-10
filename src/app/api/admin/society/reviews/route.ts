import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyAdminRequestWithAnyRole } from "@/server/auth/api-utils";

export const dynamic = "force-dynamic";

type SocietyReview = {
  id: string;
  order_id: string | null;
  name: string | null;
  rating: number | null;
  notes: string | null;
  is_public: boolean;
  created_at: string;
};

/*
 * ==========================================
 * GET
 * ==========================================
 *
 * Mengambil semua review Looms Society
 * untuk halaman Admin.
 */
export async function GET() {
  const auth =
    await verifyAdminRequestWithAnyRole([
      "OWNER",
      "ADMIN",
    ]);

  if (!auth.success) {
    return auth.response;
  }

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
          order_id,
          name,
          rating,
          notes,
          is_public,
          created_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Admin Looms Society GET error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message ||
            "Gagal mengambil review Looms Society.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      reviews:
        (data ?? []) as SocietyReview[],
    });
  } catch (error) {
    console.error(
      "Admin Looms Society GET exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil review Looms Society.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ==========================================
 * DELETE
 * ==========================================
 *
 * Hapus review berdasarkan ID.
 *
 * Contoh:
 * DELETE
 * /api/admin/society/reviews?id=xxxxxxxx
 */
export async function DELETE(
  request: Request
) {
  const auth =
    await verifyAdminRequestWithAnyRole([
      "OWNER",
      "ADMIN",
    ]);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const url =
      new URL(request.url);

    const id =
      url.searchParams.get("id");

    if (!id || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Review ID wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    const client =
      createSupabaseServiceClient();

    /*
     * Cari review terlebih dahulu.
     */
    const {
      data: existingReview,
      error: findError,
    } = await client
      .from("looms_society_reviews")
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
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "Admin Looms Society find error:",
        findError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            findError.message ||
            "Gagal mencari review.",
        },
        {
          status: 500,
        }
      );
    }

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Review tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Hapus review.
     */
    const {
      error: deleteError,
    } = await client
      .from("looms_society_reviews")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Admin Looms Society delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            deleteError.message ||
            "Gagal menghapus review.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Review berhasil dihapus.",
      deletedReview:
        existingReview,
    });
  } catch (error) {
    console.error(
      "Admin Looms Society DELETE exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus review.",
      },
      {
        status: 500,
      }
    );
  }
}
