import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";
import { isAdmin } from "@/server/authorization/permissions";
import {
  getLocalProducts,
  addLocalProduct,
} from "@/server/store/products-store";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

const ALLOWED_PLACEMENTS = [
  "HOME",
  "SHOP",
  "NEW_ARRIVALS",
  "COLLECTION",
  "BEST_SELLERS",
] as const;

type ProductPlacement = (typeof ALLOWED_PLACEMENTS)[number];

interface ProductListResponse {
  success: boolean;
  products?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    sale_price: number | null;
    stock: number;
    status: string;
    is_featured: boolean;
    image?: string;
    description?: string;
    material?: string;
    created_at: string;
    updated_at: string;
  }>;
  total?: number;
  error?: string;
}

/**
 * GET /api/admin/products
 *
 * Mengambil daftar produk dari Supabase.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ProductListResponse>> {
  try {
    // ================================
    // 1. VERIFIKASI ADMIN
    // ================================
    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<ProductListResponse>;
    }

    const hasPermission = await isAdmin();

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // ================================
    // 2. JIKA SUPABASE BELUM DISET
    // ================================
    if (!isSupabaseConfigured()) {
      const local = getLocalProducts();

      return NextResponse.json({
        success: true,
        products: local,
        total: local.length,
      });
    }

    // ================================
    // 3. CONNECT KE SUPABASE
    // ================================
    const client = createSupabaseServiceClient();

    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10)
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || "50", 10)
      )
    );

    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * pageSize;

    // ================================
    // 4. QUERY PRODUCTS
    // ================================
    let query = client
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        sku,
        price,
        sale_price,
        stock,
        status,
        description,
        material,
        is_featured,
        created_at,
        updated_at,
        product_images (
          storage_path,
          is_primary
        )
      `,
        { count: "exact" }
      );

    // Filter status jika diberikan
    if (status) {
      query = query.eq("status", status);
    }

    // Search nama / SKU
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sku.ilike.%${search}%`
      );
    }

    // ================================
    // 5. EKSEKUSI QUERY
    // ================================
    const {
      data: products,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(skip, skip + pageSize - 1);

    // ================================
    // 6. JIKA SUPABASE ERROR
    // ================================
    if (error) {
      console.error("Products list error:", error);

      return NextResponse.json(
        {
          success: false,
          error: `Gagal mengambil produk dari Supabase: ${error.message}`,
        },
        { status: 500 }
      );
    }

    // ================================
    // 7. FORMAT DATA
    // ================================
    const formatted = (products || []).map((product) => {
      const images = (product.product_images || []) as Array<{
        storage_path: string;
        is_primary: boolean;
      }>;

      const primaryImagePath =
        images.find((img) => img.is_primary)?.storage_path ||
        images[0]?.storage_path;

      let primaryImage = "/images/editorial-mocha.svg";

      if (primaryImagePath) {
        const publicUrl = client.storage
          .from("product-images")
          .getPublicUrl(primaryImagePath);

        primaryImage = publicUrl.data.publicUrl;
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        sale_price:
          product.sale_price !== null &&
          product.sale_price !== undefined
            ? Number(product.sale_price)
            : null,
        stock: Number(product.stock || 0),
        status: product.status,
        description: product.description || "",
        material: product.material || "",
        is_featured: Boolean(product.is_featured),
        image: primaryImage,
        created_at: product.created_at,
        updated_at: product.updated_at,
      };
    });

    // ================================
    // 8. RETURN DATA
    // ================================
    return NextResponse.json({
      success: true,
      products: formatted,
      total: count ?? formatted.length,
    });
  } catch (error) {
    // ================================
    // 9. ERROR INTERNAL
    // ================================
    console.error("Products endpoint error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 *
 * Membuat produk baru.
 *
 * Body dapat berisi:
 * placements: [
 *   "HOME",
 *   "SHOP",
 *   "NEW_ARRIVALS",
 *   "COLLECTION",
 *   "BEST_SELLERS"
 * ]
 */
export async function POST(request: NextRequest) {
  try {
    // ================================
    // 1. VERIFIKASI ADMIN
    // ================================
    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response;
    }

    const hasPermission = await isAdmin();

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // ================================
    // 2. BACA BODY
    // ================================
    const body = await request.json();

    if (!body.name || body.price === undefined || body.price === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Nama produk dan harga harus diisi",
        },
        { status: 400 }
      );
    }

    // ================================
    // 3. VALIDASI PLACEMENTS
    // ================================
    const requestedPlacements = Array.isArray(body.placements)
      ? body.placements
      : [];

    const placements = requestedPlacements.filter(
      (placement: unknown): placement is ProductPlacement =>
        typeof placement === "string" &&
        ALLOWED_PLACEMENTS.includes(
          placement as ProductPlacement
        )
    );

    // Hapus duplikat placement
    const uniquePlacements = Array.from(new Set(placements));

    // ================================
    // 4. BUAT SLUG
    // ================================
    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // ================================
    // 5. BUAT SKU
    // ================================
    const sku =
      body.sku ||
      `LMS-${slug.toUpperCase().slice(0, 8)}-${Math.floor(
        100 + Math.random() * 900
      )}`;

    // ================================
    // 6. JIKA SUPABASE BELUM DISET
    // ================================
    if (!isSupabaseConfigured()) {
      const newProduct = addLocalProduct({
        name: body.name,
        slug,
        sku,
        price: Number(body.price),
        sale_price:
          body.sale_price !== undefined &&
          body.sale_price !== null &&
          body.sale_price !== ""
            ? Number(body.sale_price)
            : null,
        stock: Number(body.stock || 0),
        status: body.status || "ACTIVE",
        is_featured: Boolean(body.is_featured),
        image: body.image || "/images/editorial-sand.svg",
        description: body.description || "",
        material: body.material || "",
      });

      await logAuditEvent({
        action: "admin.product_created",
        entityType: "product",
        entityId: newProduct.id,
        metadata: {
          name: newProduct.name,
          price: newProduct.price,
          placements: uniquePlacements,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Produk berhasil ditambahkan",
          product: newProduct,
          placements: uniquePlacements,
        },
        { status: 201 }
      );
    }

    // ================================
    // 7. CONNECT KE SUPABASE
    // ================================
    const client = createSupabaseServiceClient();

    // ================================
    // 8. INSERT PRODUCT
    // ================================
    const { data: newProduct, error: insertError } = await client
      .from("products")
      .insert({
        name: body.name,
        slug,
        sku,
        price: Number(body.price),
        sale_price:
          body.sale_price !== undefined &&
          body.sale_price !== null &&
          body.sale_price !== ""
            ? Number(body.sale_price)
            : null,
        stock: Number(body.stock || 0),
        status: body.status || "ACTIVE",
        description: body.description || null,
        material: body.material || null,
        is_featured: Boolean(body.is_featured),
      })
      .select("id")
      .single();

    // ================================
    // 9. JIKA INSERT GAGAL
    // ================================
    if (insertError || !newProduct) {
      console.error(
        "Supabase insert product error:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            insertError?.message ||
            "Gagal menyimpan produk ke Supabase",
        },
        { status: 500 }
      );
    }

    // ================================
    // 10. INSERT PRODUCT PLACEMENTS
    // ================================
    if (uniquePlacements.length > 0) {
      const placementRows = uniquePlacements.map((placement, index) => ({
        product_id: newProduct.id,
        placement,
        position: index,
      }));

      const { error: placementError } = await client
        .from("product_placements")
        .insert(placementRows);

      if (placementError) {
        console.error(
          "Supabase insert product placements error:",
          placementError
        );

        // Produk sudah terbuat, tetapi placement gagal.
        // Kita hapus kembali produknya agar tidak meninggalkan
        // data produk tanpa placement yang diminta.
        await client
          .from("products")
          .delete()
          .eq("id", newProduct.id);

        return NextResponse.json(
          {
            success: false,
            error: `Gagal menyimpan penempatan produk: ${placementError.message}`,
          },
          { status: 500 }
        );
      }
    }

    // ================================
    // 11. AUDIT LOG
    // ================================
    await logAuditEvent({
      action: "admin.product_created",
      entityType: "product",
      entityId: newProduct.id,
      metadata: {
        name: body.name,
        price: body.price,
        placements: uniquePlacements,
      },
    });

    // ================================
    // 12. BERHASIL
    // ================================
    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil ditambahkan",
        productId: newProduct.id,
        placements: uniquePlacements,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create product error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
