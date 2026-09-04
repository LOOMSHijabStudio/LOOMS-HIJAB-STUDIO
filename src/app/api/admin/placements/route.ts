import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";
import { isAdmin } from "@/server/authorization/permissions";

export const dynamic = "force-dynamic";

const ALLOWED_PLACEMENTS = [
  "HOME",
  "SHOP",
  "NEW_ARRIVALS",
  "COLLECTION",
  "BEST_SELLERS",
] as const;

type ProductPlacement = (typeof ALLOWED_PLACEMENTS)[number];

function isValidPlacement(value: unknown): value is ProductPlacement {
  return (
    typeof value === "string" &&
    ALLOWED_PLACEMENTS.includes(value as ProductPlacement)
  );
}

/**
 * GET
 *
 * Contoh:
 * /api/admin/placements?placement=HOME
 *
 * Mengambil semua produk yang ditempatkan pada section tertentu.
 */
export async function GET(request: NextRequest) {
  try {
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        products: [],
      });
    }

    const placement = request.nextUrl.searchParams.get("placement");

    if (!isValidPlacement(placement)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Placement tidak valid. Gunakan HOME, SHOP, NEW_ARRIVALS, COLLECTION, atau BEST_SELLERS.",
        },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    const { data: placementRows, error: placementError } = await client
      .from("product_placements")
      .select("product_id, placement, position")
      .eq("placement", placement)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (placementError) {
      console.error(
        "Product placement list error:",
        placementError
      );

      return NextResponse.json(
        {
          success: false,
          error: `Gagal mengambil placement produk: ${placementError.message}`,
        },
        { status: 500 }
      );
    }

    const productIds = (placementRows || []).map(
      (row) => row.product_id
    );

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        products: [],
        total: 0,
      });
    }

    const { data: products, error: productsError } = await client
      .from("products")
      .select(
        `
        id,
        name,
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
      `
      )
      .in("id", productIds);

    if (productsError) {
      console.error(
        "Products by placement error:",
        productsError
      );

      return NextResponse.json(
        {
          success: false,
          error: `Gagal mengambil data produk: ${productsError.message}`,
        },
        { status: 500 }
      );
    }

    const productMap = new Map(
      (products || []).map((product) => [product.id, product])
    );

    const formattedProducts = (placementRows || [])
      .map((placementRow) => {
        const product = productMap.get(placementRow.product_id);

        if (!product) {
          return null;
        }

        const images = (product.product_images || []) as Array<{
          storage_path: string;
          is_primary: boolean;
        }>;

        const primaryImagePath =
          images.find((image) => image.is_primary)
            ?.storage_path || images[0]?.storage_path;

        let primaryImage = "/images/editorial-sand.svg";

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
          placement: placementRow.placement,
          position: placementRow.position,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      total: formattedProducts.length,
    });
  } catch (error) {
    console.error("Admin placements GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan internal",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 *
 * Menghapus produk dari satu section saja.
 *
 * Contoh:
 * {
 *   "product_id": "uuid-produk",
 *   "placement": "HOME"
 * }
 *
 * Produk TIDAK dihapus dari tabel products.
 */
export async function DELETE(request: NextRequest) {
  try {
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        message: "Placement berhasil dihapus.",
      });
    }

    const body = await request.json();

    const productId = body.product_id;
    const placement = body.placement;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "product_id wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!isValidPlacement(placement)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Placement tidak valid. Gunakan HOME, SHOP, NEW_ARRIVALS, COLLECTION, atau BEST_SELLERS.",
        },
        { status: 400 }
      );
    }

    const client = createSupabaseServiceClient();

    const { error } = await client
      .from("product_placements")
      .delete()
      .eq("product_id", productId)
      .eq("placement", placement);

    if (error) {
      console.error(
        "Delete product placement error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: `Gagal menghapus placement: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Placement produk berhasil dihapus.",
    });
  } catch (error) {
    console.error("Admin placements DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan internal",
      },
      { status: 500 }
    );
  }
}
