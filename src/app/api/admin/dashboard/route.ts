import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/authorization/permissions";

export const dynamic = "force-dynamic";

interface DashboardStats {
  total_products: number;
  active_products: number;
  low_stock_products: number;
  featured_products: number;
  categories_count: number;
  collections_count: number;
  total_stock_value: number;
  archived_products: number;
  draft_products: number;
}

interface DashboardResponse {
  success: boolean;
  stats?: DashboardStats;
  low_stock_items?: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
  }>;
  recent_products?: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
  }>;
  error?: string;
}

export async function GET(
  _request: NextRequest
): Promise<NextResponse<DashboardResponse>> {
  void _request;

  try {
    const verification = await verifyAdminRequest();
    if (!verification.success) {
      return verification.response as NextResponse<DashboardResponse>;
    }

    // Check authorization
    const hasPermission = await isAdmin();
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const client = createSupabaseServiceClient();

    // Get product statistics
    const { data: productsData, error: productsError } = await client
      .from("products")
      .select("id, name, sku, stock, price, sale_price, status, is_featured, created_at");

    if (productsError) {
      console.error("Products fetch error:", productsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch product data" },
        { status: 500 }
      );
    }

    const products = (productsData as Array<{
      id: string;
      name: string;
      sku: string;
      stock: number;
      price: number;
      sale_price: number | null;
      status: string;
      is_featured: boolean;
      created_at: string;
    }>) || [];

    // Calculate stats
    const stats: DashboardStats = {
      total_products: products.length,
      active_products: products.filter((p) => p.status === "ACTIVE").length,
      archived_products: products.filter((p) => p.status === "ARCHIVED").length,
      draft_products: products.filter((p) => p.status === "DRAFT").length,
      low_stock_products: products.filter((p) => p.stock < 10).length,
      featured_products: products.filter((p) => p.is_featured).length,
      total_stock_value: products.reduce((sum, p) => {
        return sum + (p.price * p.stock);
      }, 0),
      categories_count: 0,
      collections_count: 0,
    };

    // Get categories count
    const { count: categoriesCount } = await client
      .from("categories")
      .select("id", { count: "exact" });

    stats.categories_count = categoriesCount || 0;

    // Get collections count
    const { count: collectionsCount } = await client
      .from("collections")
      .select("id", { count: "exact" });

    stats.collections_count = collectionsCount || 0;

    // Get low stock items
    const lowStockItems = products
      .filter((p) => p.stock < 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
      }))
      .slice(0, 10);

    // Get recent products
    const recentProducts = products
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        created_at: p.created_at,
      }))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      stats,
      low_stock_items: lowStockItems,
      recent_products: recentProducts,
    });
  } catch (error) {
    console.error("Dashboard endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
