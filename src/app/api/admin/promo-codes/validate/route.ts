import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const code = String(body?.code ?? "")
      .trim()
      .toUpperCase();

    const subtotal = Number(body?.subtotal ?? 0);

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Masukkan kode promo.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Subtotal tidak valid.",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();

    const { data: promo, error: promoError } = await supabase
      .from("promo_codes")
      .select(
        `
          id,
          code,
          discount_type,
          discount_value,
          minimum_purchase,
          maximum_discount,
          usage_limit,
          used_count,
          starts_at,
          expires_at,
          is_active
        `
      )
      .eq("code", code)
      .maybeSingle();

    if (promoError) {
      console.error(
        "Promo validation Supabase error:",
        promoError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            promoError.message ||
            "Kode promo tidak dapat diperiksa.",
          details: promoError.details || null,
          hint: promoError.hint || null,
          code: promoError.code || null,
        },
        { status: 500 }
      );
    }

    if (!promo) {
      return NextResponse.json(
        {
          success: false,
          error: "Kode promo tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (promo.is_active !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "Kode promo sedang tidak aktif.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    if (promo.starts_at) {
      const startsAt = new Date(promo.starts_at);

      if (
        !Number.isNaN(startsAt.getTime()) &&
        now < startsAt
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Kode promo belum mulai berlaku.",
          },
          { status: 400 }
        );
      }
    }

    if (promo.expires_at) {
      const expiresAt = new Date(promo.expires_at);

      if (
        !Number.isNaN(expiresAt.getTime()) &&
        now > expiresAt
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Kode promo sudah kedaluwarsa.",
          },
          { status: 400 }
        );
      }
    }

    const usedCount = Number(promo.used_count ?? 0);
    const usageLimit =
      promo.usage_limit === null ||
      promo.usage_limit === undefined
        ? null
        : Number(promo.usage_limit);

    if (
      usageLimit !== null &&
      Number.isFinite(usageLimit) &&
      usedCount >= usageLimit
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kode promo sudah mencapai batas penggunaan.",
        },
        { status: 400 }
      );
    }

    const minimumPurchase = Number(
      promo.minimum_purchase ?? 0
    );

    if (
      Number.isFinite(minimumPurchase) &&
      subtotal < minimumPurchase
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Minimal pembelian untuk kode ini adalah Rp " +
            minimumPurchase.toLocaleString("id-ID") +
            ".",
        },
        { status: 400 }
      );
    }

    const discountValue = Number(
      promo.discount_value ?? 0
    );

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Nilai diskon promo tidak valid.",
        },
        { status: 400 }
      );
    }

    let discount = 0;

    if (promo.discount_type === "percentage") {
      discount =
        subtotal * (discountValue / 100);

      const maximumDiscount =
        promo.maximum_discount === null ||
        promo.maximum_discount === undefined
          ? null
          : Number(promo.maximum_discount);

      if (
        maximumDiscount !== null &&
        Number.isFinite(maximumDiscount) &&
        maximumDiscount > 0
      ) {
        discount = Math.min(
          discount,
          maximumDiscount
        );
      }
    } else if (promo.discount_type === "fixed") {
      discount = discountValue;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Tipe diskon promo tidak valid.",
        },
        { status: 400 }
      );
    }

    discount = Math.max(
      0,
      Math.min(discount, subtotal)
    );

    return NextResponse.json({
      success: true,
      code: promo.code,
      discount,
      discountType: promo.discount_type,
      message: "Kode promo berhasil digunakan.",
    });
  } catch (error) {
    console.error(
      "Promo validation API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses kode promo.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Promo validation API is active.",
  });
}
