import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/auth/session";
import { isAdmin } from "@/server/authorization/permissions";
import { getLocalProducts, addLocalProduct } from "@/server/store/products-store";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

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

export async function GET(
  request: NextRequest
): Promise<NextResponse<ProductListResponse>> {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<ProductListResponse>;
    }

    const hasPermission = await isAdmin();
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (!isSupabaseConfigured()) {
      const local = getLocalProducts();
      return NextResponse.json({
        success: true,
        products: local,
        total: local.length,
      });
    }

    const client = createSupabaseServiceClient();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * pageSize;

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

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sku.ilike.%${search}%`
      );
    }

    const { data: products, error, count } = await query
      .order("created_at", { ascending: false })
      .range(skip, skip + pageSize - 1);

    if (error) {
      console.error("Products list error:", error);
      const local = getLocalProducts();
      return NextResponse.json({
        success: true,
        products: local,
        total: local.length,
      });
    }

    const formatted = (products || []).map((p) => {
      const images = (p.product_images || []) as Array<{ storage_path: string; is_primary: boolean }>;
      const primaryImagePath =
        images.find((img) => img.is_primary)?.storage_path ||
        images[0]?.storage_path;
      const primaryImg = primaryImagePath
        ? client.storage.from("product-images").getPublicUrl(primaryImagePath).data.publicUrl
        : "/images/editorial-mocha.svg";
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: Number(p.price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        stock: Number(p.stock),
        status: p.status,
        description: p.description || "",
        material: p.material || "",
        is_featured: Boolean(p.is_featured),
        image: primaryImg,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      products: formatted,
      total: count || formatted.length,
    });
  } catch (error) {
    console.error("Products endpoint error:", error);
    const local = getLocalProducts();
    return NextResponse.json({
      success: true,
      products: local,
      total: local.length,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response;
    }

    const hasPermission = await isAdmin();
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.price) {
      return NextResponse.json(
        { success: false, error: "Nama produk dan harga harus diisi" },
        { status: 400 }
      );
    }

    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const sku = body.sku || `LMS-${slug.toUpperCase().slice(0, 8)}-${Math.floor(100 + Math.random() * 900)}`;

    if (!isSupabaseConfigured()) {
      const newProduct = addLocalProduct({
        name: body.name,
        slug,
        sku,
        price: Number(body.price),
        sale_price: body.sale_price ? Number(body.sale_price) : null,
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
        metadata: { name: newProduct.name, price: newProduct.price },
      });

      return NextResponse.json({
        success: true,
        message: "Produk berhasil ditambahkan",
        product: newProduct,
      }, { status: 201 });
    }

    const client = createSupabaseServiceClient();

    const { data: newProd, error: insertError } = await client
      .from("products")
      .insert({
        name: body.name,
        slug,
        sku,
        price: Number(body.price),
        sale_price: body.sale_price ? Number(body.sale_price) : null,
        stock: Number(body.stock || 0),
        status: body.status || "ACTIVE",
        description: body.description || null,
        material: body.material || null,
        is_featured: Boolean(body.is_featured),
      })
      .select("id")
      .single();

    if (insertError || !newProd) {
      console.error("Supabase insert product error:", insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || "Gagal menyimpan produk" },
        { status: 500 }
      );
    }

    await logAuditEvent({
      action: "admin.product_created",
      entityType: "product",
      entityId: newProd.id,
      metadata: { name: body.name, price: body.price },
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil ditambahkan",
      productId: newProd.id,
    }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
