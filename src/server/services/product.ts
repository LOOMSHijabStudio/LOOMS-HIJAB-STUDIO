import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/server/auth/audit";
import type { PriceUpdateInput } from "@/server/validation/product";

/**
 * Update product price with server-side validation
 * CRITICAL: Never trust client-provided prices
 */
export async function updateProductPrice(
  productId: string,
  priceData: PriceUpdateInput
): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = createSupabaseServiceClient();

  // Validate price values
  if (priceData.price !== undefined) {
    if (typeof priceData.price !== "number" || priceData.price <= 0) {
      return {
        success: false,
        error: "Price must be a positive number",
      };
    }

    // Prevent unreasonable prices (security check)
    if (priceData.price > 999999.99) {
      return {
        success: false,
        error: "Price exceeds maximum allowed value",
      };
    }
  }

  // Validate sale price
  if (priceData.sale_price !== undefined && priceData.sale_price !== null) {
    if (typeof priceData.sale_price !== "number" || priceData.sale_price <= 0) {
      return {
        success: false,
        error: "Sale price must be a positive number",
      };
    }

    if (priceData.sale_price > 999999.99) {
      return {
        success: false,
        error: "Sale price exceeds maximum allowed value",
      };
    }

    // If both prices provided, sale price should be less than regular price
    if (
      priceData.price &&
      priceData.sale_price >= priceData.price
    ) {
      return {
        success: false,
        error: "Sale price must be less than regular price",
      };
    }
  }

  try {
    // Fetch current product to log the change
    const { data: currentProduct, error: fetchError } = await client
      .from("products")
      .select("price, sale_price")
      .eq("id", productId)
      .single();

    if (fetchError || !currentProduct) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Update the product
    const { error: updateError } = await client
      .from("products")
      .update({
        price: priceData.price ?? currentProduct.price,
        sale_price: priceData.sale_price !== undefined ? priceData.sale_price : currentProduct.sale_price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Price update error:", updateError);
      return {
        success: false,
        error: "Failed to update price",
      };
    }

    // Log the price change
    await logAuditEvent({
      action: "admin.price_changed",
      entityType: "product",
      entityId: productId,
      metadata: {
        old_price: currentProduct.price,
        new_price: priceData.price,
        old_sale_price: currentProduct.sale_price,
        new_sale_price: priceData.sale_price,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Price update exception:", error);
    return {
      success: false,
      error: "Failed to update price",
    };
  }
}

/**
 * Update product stock with validation
 */
export async function updateProductStock(
  productId: string,
  quantity: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = createSupabaseServiceClient();

  // Validate stock value
  if (typeof quantity !== "number" || quantity < 0 || !Number.isInteger(quantity)) {
    return {
      success: false,
      error: "Stock must be a non-negative integer",
    };
  }

  // Prevent unreasonable stock values
  if (quantity > 999999) {
    return {
      success: false,
      error: "Stock quantity exceeds maximum allowed value",
    };
  }

  try {
    const { data: currentProduct, error: fetchError } = await client
      .from("products")
      .select("stock")
      .eq("id", productId)
      .single();

    if (fetchError || !currentProduct) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    const { error: updateError } = await client
      .from("products")
      .update({
        stock: quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Stock update error:", updateError);
      return {
        success: false,
        error: "Failed to update stock",
      };
    }

    // Log the stock change
    await logAuditEvent({
      action: "admin.stock_changed",
      entityType: "product",
      entityId: productId,
      metadata: {
        old_stock: currentProduct.stock,
        new_stock: quantity,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Stock update exception:", error);
    return {
      success: false,
      error: "Failed to update stock",
    };
  }
}

/**
 * Get product for editing (ensures user sees server-side data)
 */
export async function getProductForEditing(
  productId: string
): Promise<Record<string, unknown> | null> {
  const client = createSupabaseServiceClient();

  const { data: product, error } = await client
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,
      sku,
      material,
      size_description,
      care_instructions,
      price,
      sale_price,
      stock,
      weight_grams,
      badge,
      is_featured,
      is_new_arrival,
      is_best_seller,
      status,
      category_id,
      created_at,
      updated_at,
      product_images (
        id,
        storage_path,
        alt_text,
        position,
        is_primary
      ),
      product_variants (
        id,
        name,
        sku,
        image_path,
        price,
        stock
      )
    `
    )
    .eq("id", productId)
    .single();

  if (error || !product) {
    return null;
  }

  return product;
}
