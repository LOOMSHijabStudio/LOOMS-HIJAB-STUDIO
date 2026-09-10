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

interface ProductResponse {
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
  availability: string;
  created_at: string;
  updated_at: string;
  placements: string[];
}

interface ProductListResponse {
  success: boolean;
  products?: ProductResponse[];
  total?: number;
  error?: string;
}

/**
 * GET /api/admin/products
 *
 * Mengambil semua produk admin dari Supabase.
 *
 * Sekaligus mengambil placement:
 * HOME
 * SHOP
 * NEW_ARRIVALS
 * COLLECTION
 * BEST_SELLERS
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ProductListResponse>> {
  try {
    // =====================================================
    // 1. VERIFY ADMIN
    // =====================================================
    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<ProductListResponse>;
    }

    const adminAllowed = await isAdmin();

    if (!adminAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // =====================================================
    // 2. FALLBACK LOCAL
    // =====================================================
    if (!isSupabaseConfigured()) {
      const localProducts = getLocalProducts();

      const formattedLocalProducts: ProductResponse[] =
        localProducts.map((product) => ({
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
          is_featured: Boolean(product.is_featured),
          image: product.image,
          description: product.description || "",
          material: product.material || "",
          availability:
            product.availability || "regular",
          created_at: product.created_at,
          updated_at: product.updated_at,
          placements: [],
        }));

      return NextResponse.json({
        success: true,
        products: formattedLocalProducts,
        total: formattedLocalProducts.length,
      });
    }

    // =====================================================
    // 3. SUPABASE CLIENT
    // =====================================================
    const client = createSupabaseServiceClient();

    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(
      1,
      Number(searchParams.get("page") || "1")
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") ||
            searchParams.get("pageSize") ||
            "50"
        )
      )
    );

    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // =====================================================
    // 4. PRODUCTS QUERY
    // =====================================================
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
        availability,
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
        {
          count: "exact",
        }
      );

    // =====================================================
    // 5. FILTER STATUS
    // =====================================================
    if (status) {
      query = query.eq("status", status);
    }

    // =====================================================
    // 6. SEARCH
    // =====================================================
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sku.ilike.%${search}%`
      );
    }

    // =====================================================
    // 7. EXECUTE PRODUCTS QUERY
    // =====================================================
    const {
      data: products,
      error: productsError,
      count,
    } = await query
      .order("created_at", {
        ascending: false,
      })
      .range(from, to);

    if (productsError) {
      console.error(
        "Admin products query error:",
        productsError
      );

      return NextResponse.json(
        {
          success: false,
          error: productsError.message,
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 8. PRODUCT IDS
    // =====================================================
    const productIds = (products || []).map(
      (product) => product.id
    );

    // =====================================================
    // 9. GET PLACEMENTS
    // =====================================================
    const placementMap = new Map<
      string,
      string[]
    >();

    if (productIds.length > 0) {
      const {
        data: placementsData,
        error: placementsError,
      } = await client
        .from("product_placements")
        .select(
          `
          product_id,
          placement
        `
        )
        .in("product_id", productIds);

      if (placementsError) {
        console.error(
          "Admin product placements query error:",
          placementsError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              placementsError.message,
          },
          { status: 500 }
        );
      }

      for (const placementRow of placementsData || []) {
        const productId =
          placementRow.product_id;

        const placement =
          placementRow.placement;

        const currentPlacements =
          placementMap.get(productId) || [];

        currentPlacements.push(placement);

        placementMap.set(
          productId,
          currentPlacements
        );
      }
    }

    // =====================================================
    // 10. FORMAT PRODUCTS
    // =====================================================
    const formattedProducts: ProductResponse[] =
      (products || []).map((product) => {
        const images =
          (product.product_images || []) as Array<{
            storage_path: string;
            is_primary: boolean;
          }>;

        // -------------------------------------------------
        // Cari gambar utama
        // -------------------------------------------------
        const primaryImage =
          images.find(
            (image) => image.is_primary
          )?.storage_path ||
          images[0]?.storage_path ||
          null;

        // -------------------------------------------------
        // Default image
        // -------------------------------------------------
        let imageUrl =
          "/images/editorial-mocha.svg";

        // -------------------------------------------------
        // Supabase Storage public URL
        // -------------------------------------------------
        if (primaryImage) {
          const { data } =
            client.storage
              .from("product-images")
              .getPublicUrl(
                primaryImage
              );

          if (data?.publicUrl) {
            imageUrl =
              data.publicUrl;
          }
        }

        return {
          id: product.id,

          name: product.name,

          sku: product.sku,

          price: Number(
            product.price
          ),

          sale_price:
            product.sale_price !==
              null &&
            product.sale_price !==
              undefined
              ? Number(
                  product.sale_price
                )
              : null,

          stock: Number(
            product.stock || 0
          ),

          status:
            product.status,

          is_featured:
            Boolean(
              product.is_featured
            ),

          image: imageUrl,

          description:
            product.description ||
            "",

          material:
            product.material ||
            "",

          // =================================================
          // PENTING:
          // availability wajib ada karena ManagedProduct
          // =================================================
          availability:
            product.availability ||
            "regular",

          created_at:
            product.created_at,

          updated_at:
            product.updated_at,

          // =================================================
          // PENTING:
          // placement digunakan Admin New Arrivals /
          // Best Sellers
          // =================================================
          placements:
            placementMap.get(
              product.id
            ) || [],
        };
      });

    // =====================================================
    // 11. RESPONSE
    // =====================================================
    return NextResponse.json({
      success: true,
      products: formattedProducts,
      total:
        count ??
        formattedProducts.length,
    });
  } catch (error) {
    console.error(
      "Admin products GET error:",
      error
    );

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
 * POST /api/admin/products
 *
 * Membuat produk baru.
 */
export async function POST(
  request: NextRequest
) {
  try {
    // =====================================================
    // 1. VERIFY ADMIN
    // =====================================================
    const verification =
      await verifyAdminRequest();

    if (!verification.success) {
      return verification.response;
    }

    const adminAllowed =
      await isAdmin();

    if (!adminAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // =====================================================
    // 2. READ BODY
    // =====================================================
    const body = await request.json();

    // =====================================================
    // 3. VALIDATION
    // =====================================================
    if (
      !body.name ||
      body.price === undefined ||
      body.price === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nama produk dan harga harus diisi",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 4. SLUG
    // =====================================================
    const slug =
      body.slug ||
      String(body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // =====================================================
    // 5. SKU
    // =====================================================
    const sku =
      body.sku ||
      `LMS-${slug
        .toUpperCase()
        .slice(0, 8)}-${Math.floor(
        100 + Math.random() * 900
      )}`;

    // =====================================================
    // 6. AVAILABILITY
    // =====================================================
    const availability =
      body.availability ||
      "regular";

    // =====================================================
    // 7. LOCAL FALLBACK
    // =====================================================
    if (!isSupabaseConfigured()) {
      const newProduct =
        addLocalProduct({
          name: body.name,

          slug,

          sku,

          price: Number(
            body.price
          ),

          sale_price:
            body.sale_price !==
              undefined &&
            body.sale_price !==
              null &&
            body.sale_price !== ""
              ? Number(
                  body.sale_price
                )
              : null,

          stock: Number(
            body.stock || 0
          ),

          status:
            body.status ||
            "ACTIVE",

          is_featured:
            Boolean(
              body.is_featured
            ),

          image:
            body.image ||
            "/images/editorial-sand.svg",

          description:
            body.description ||
            "",

          material:
            body.material ||
            "",

          // =================================================
          // WAJIB
          // =================================================
          availability,
        });

      // ===================================================
      // AUDIT LOG
      // ===================================================
      await logAuditEvent({
        action:
          "admin.product_created",

        entityType:
          "product",

        entityId:
          newProduct.id,

        metadata: {
          name:
            newProduct.name,

          price:
            newProduct.price,
        },
      });

      return NextResponse.json(
        {
          success: true,

          message:
            "Produk berhasil ditambahkan",

          product:
            newProduct,
        },
        { status: 201 }
      );
    }

    // =====================================================
    // 8. SUPABASE CLIENT
    // =====================================================
    const client =
      createSupabaseServiceClient();

    // =====================================================
    // 9. INSERT PRODUCT
    // =====================================================
    const {
      data: newProduct,
      error: insertError,
    } = await client
      .from("products")
      .insert({
        name: body.name,

        slug,

        sku,

        price: Number(
          body.price
        ),

        sale_price:
          body.sale_price !==
            undefined &&
          body.sale_price !==
            null &&
          body.sale_price !== ""
            ? Number(
                body.sale_price
              )
            : null,

        stock: Number(
          body.stock || 0
        ),

        status:
          body.status ||
          "ACTIVE",

        availability,

        description:
          body.description ||
          null,

        material:
          body.material ||
          null,

        is_featured:
          Boolean(
            body.is_featured
          ),
      })
      .select(
        "id, name, slug, sku, price, sale_price, stock, status, availability, description, material, is_featured, created_at, updated_at"
      )
      .single();

    // =====================================================
    // 10. INSERT ERROR
    // =====================================================
    if (
      insertError ||
      !newProduct
    ) {
      console.error(
        "Supabase insert product error:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            insertError?.message ||
            "Gagal menyimpan produk",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 11. AUDIT LOG
    // =====================================================
    await logAuditEvent({
      action:
        "admin.product_created",

      entityType:
        "product",

      entityId:
        newProduct.id,

      metadata: {
        name:
          newProduct.name,

        sku:
          newProduct.sku,

        price:
          newProduct.price,
      },
    });

    // =====================================================
    // 12. RESPONSE
    // =====================================================
    return NextResponse.json(
      {
        success: true,

        message:
          "Produk berhasil ditambahkan",

        product:
          newProduct,

        productId:
          newProduct.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Admin products POST error:",
      error
    );

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
