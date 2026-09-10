import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyAdminRequestWithAnyRole } from "@/server/auth/api-utils";

export const dynamic = "force-dynamic";

/*
 * ==========================================
 * TYPES
 * ==========================================
 */

type SocietyReview = {
  id: string;
  order_id: string | null;
  name: string | null;
  rating: number | null;
  notes: string | null;
  is_public: boolean;
  created_at: string;
};

function isValidId(
  value: string
): boolean {
  return (
    value.trim().length > 0
  );
}

/*
 * ==========================================
 * GET
 * ==========================================
 *
 * Hanya ADMIN / OWNER.
 *
 * Dipakai halaman:
 * /admin/looms-society
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
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

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

    const reviews =
      (data ?? []) as SocietyReview[];

    return NextResponse.json({
      success: true,
      reviews,
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
            : "Gagal mengambil review.",
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
 * Hanya ADMIN / OWNER.
 *
 * Contoh:
 * DELETE /api/admin/society/reviews?id=xxxx
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

    if (
      !id ||
      !isValidId(id)
    ) {
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
     * Cek apakah review memang ada.
     */
    const {
      data: existingReview,
      error:
        existingError,
    } = await client
      .from(
        "looms_society_reviews"
      )
      .select(
        "id, name, rating, notes"
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Admin Looms Society lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            existingError.message,
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
      .from(
        "looms_society_reviews"
      )
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Admin Looms Society DELETE error:",
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
