import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase belum dikonfigurasi." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const code = String(body.code || "").trim().toUpperCase();
    const subtotal = Number(body.subtotal);

    if (!code) {
      return NextResponse.json(
        { error: "Masukkan kode promo." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json(
        { error: "Subtotal tidak valid." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();

    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select(
        "id, code, discount_type, discount_value, minimum_purchase, maximum_discount, usage_limit, used_count, starts_at, expires_at, is_active"
      )
      .eq("code", code)
      .maybeSingle();

    if (error) {
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

    if (!promo) {
      return NextResponse.json(
        { error: "Kode promo tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!promo.is_active) {
      return NextResponse.json(
        { error: "Kode promo sedang tidak aktif." },
        { status: 400 }
      );
    }

    const now = new Date();

    if (promo.starts_at) {
      const startsAt = new Date(promo.starts_at);

      if (now < startsAt) {
        return NextResponse.json(
          { error: "Kode promo belum mulai berlaku." },
          { status: 400 }
        );
      }
    }

    if (promo.expires_at) {
      const expiresAt = new Date(promo.expires_at);

      if (now > expiresAt) {
        return NextResponse.json(
          { error: "Kode promo sudah kedaluwarsa." },
          { status: 400 }
        );
      }
    }

    if (
      promo.usage_limit !== null &&
      promo.usage_limit !== undefined &&
      Number(promo.used_count || 0) >= Number(promo.usage_limit)
    ) {
      return NextResponse.json(
        { error: "Kode promo sudah mencapai batas penggunaan." },
        { status: 400 }
      );
    }

    const minimumPurchase = Number(promo.minimum_purchase || 0);

    if (subtotal < minimumPurchase) {
      return NextResponse.json(
        {
          error:
            "Minimal pembelian untuk kode ini adalah Rp " +
            minimumPurchase.toLocaleString("id-ID") +
            ".",
        },
        { status: 400 }
      );
    }

    let discount = 0;

    if (promo.discount_type === "percentage") {
      discount =
        subtotal * (Number(promo.discount_value || 0) / 100);

      if (
        promo.maximum_discount !== null &&
        promo.maximum_discount !== undefined
      ) {
        discount = Math.min(
          discount,
          Number(promo.maximum_discount)
        );
      }
    } else if (promo.discount_type === "fixed") {
      discount = Number(promo.discount_value || 0);
    }

    discount = Math.max(0, Math.min(discount, subtotal));

    return NextResponse.json({
      success: true,
      code: promo.code,
      discount,
      discountType: promo.discount_type,
      message: "Kode promo berhasil digunakan.",
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses kode promo." },
      { status: 500 }
    );
  }
}
