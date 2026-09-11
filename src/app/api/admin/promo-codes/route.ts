import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: "Supabase belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const code = String(body.code || "")
      .trim()
      .toUpperCase();

    const discountType = String(
      body.discount_type || ""
    ).trim();

    const discountValue = Number(
      body.discount_value || 0
    );

    const minimumPurchase = Number(
      body.minimum_purchase || 0
    );

    const maximumDiscount =
      body.maximum_discount === null ||
      body.maximum_discount === undefined ||
      body.maximum_discount === ""
        ? null
        : Number(body.maximum_discount);

    const usageLimit =
      body.usage_limit === null ||
      body.usage_limit === undefined ||
      body.usage_limit === ""
        ? null
        : Number(body.usage_limit);

    const startsAt = body.starts_at || null;
    const expiresAt = body.expires_at || null;

    const isActive = Boolean(body.is_active);

    if (!code) {
      return NextResponse.json(
        {
          error: "Kode promo wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        {
          error:
            "Kode promo hanya boleh menggunakan huruf, angka, underscore, atau tanda strip.",
        },
        { status: 400 }
      );
    }

    if (
      discountType !== "percentage" &&
      discountType !== "fixed"
    ) {
      return NextResponse.json(
        {
          error: "Tipe diskon tidak valid.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0
    ) {
      return NextResponse.json(
        {
          error: "Nilai diskon harus lebih dari 0.",
        },
        { status: 400 }
      );
    }

    if (
      discountType === "percentage" &&
      discountValue > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Diskon persentase tidak boleh lebih dari 100%.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(minimumPurchase) ||
      minimumPurchase < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum pembelian tidak boleh bernilai negatif.",
        },
        { status: 400 }
      );
    }

    if (
      maximumDiscount !== null &&
      (!Number.isFinite(maximumDiscount) ||
        maximumDiscount < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Maksimum diskon tidak boleh bernilai negatif.",
        },
        { status: 400 }
      );
    }

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) ||
        usageLimit <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Batas penggunaan harus berupa angka bulat lebih dari 0.",
        },
        { status: 400 }
      );
    }

    if (startsAt && expiresAt) {
      const startDate = new Date(startsAt);
      const endDate = new Date(expiresAt);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return NextResponse.json(
          {
            error: "Tanggal promo tidak valid.",
          },
          { status: 400 }
        );
      }

      if (endDate <= startDate) {
        return NextResponse.json(
          {
            error:
              "Tanggal berakhir harus setelah tanggal mulai.",
          },
          { status: 400 }
        );
      }
    }

    const supabase = createSupabaseServiceClient();

    const { data: existingPromo, error: existingError } =
      await supabase
        .from("promo_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Promo code duplicate check error:",
        existingError
      );

      return NextResponse.json(
        {
          error: existingError.message,
        },
        { status: 500 }
      );
    }

    if (existingPromo) {
      return NextResponse.json(
        {
          error: `Kode promo "${code}" sudah digunakan.`,
        },
        { status: 409 }
      );
    }

    const promoData = {
      code,
      discount_type: discountType,
      discount_value: discountValue,
      minimum_purchase: minimumPurchase,
      maximum_discount:
        discountType === "percentage"
          ? maximumDiscount
          : null,
      usage_limit: usageLimit,
      used_count: 0,
      starts_at: startsAt,
      expires_at: expiresAt,
      is_active: isActive,
    };

    console.log(
      "Promo code insert data:",
      promoData
    );

    const { data, error } = await supabase
      .from("promo_codes")
      .insert(promoData)
      .select()
      .single();

    if (error) {
      console.error(
        "Promo code insert error:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          details: error.details || null,
          hint: error.hint || null,
          code: error.code || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        promo: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Promo code API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan promo code.",
      },
      { status: 500 }
    );
  }
}
