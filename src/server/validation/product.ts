import "server-only";
import { z } from "zod";

// Product validation schemas
export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),

  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),

  description: z.string().optional(),

  sku: z.string().min(1).max(50),

  material: z.string().optional(),

  size_description: z.string().optional(),

  care_instructions: z.string().optional(),

  price: z.number().positive(),

  sale_price: z.number().positive().optional(),

  stock: z.number().int().min(0).optional(),

  category_id: z.string().uuid().optional().nullable(),

  weight_grams: z.number().int().positive().optional(),

  badge: z.string().optional(),

  is_featured: z.boolean().optional(),

  is_new_arrival: z.boolean().optional(),

  is_best_seller: z.boolean().optional(),

  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const priceUpdateSchema = z.object({
  price: z.number().positive().optional(),
  sale_price: z.number().positive().optional().nullable(),
});

export const stockUpdateSchema = z.object({
  stock: z.number().int().min(0),
});

export const variantSchema = z.object({
  name: z.string().min(1).max(100),

  sku: z.string().min(1).max(50),

  image_path: z.string().optional(),

  price: z.number().positive().optional().nullable(),

  stock: z.number().int().min(0).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(200),

  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),

  description: z.string().optional(),

  image_path: z.string().optional(),

  position: z.number().int().min(0).optional(),
});

/**
 * Collection validation schema
 *
 * cover_image_path dan banner_image_path dibuat
 * optional + nullable karena Admin saat ini
 * mengirimkan nilai null jika belum ada gambar.
 */
export const collectionSchema = z.object({
  name: z.string().min(1).max(200),

  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),

  description: z.string().optional(),

  cover_image_path: z.string().optional().nullable(),

  banner_image_path: z.string().optional().nullable(),

  position: z.number().int().min(0).optional(),
});

// Image upload validation
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ALLOWED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
];

// Image dimension constraints
export const MIN_IMAGE_WIDTH = 100;
export const MIN_IMAGE_HEIGHT = 100;
export const MAX_IMAGE_WIDTH = 8000;
export const MAX_IMAGE_HEIGHT = 8000;

// Types
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export type PriceUpdateInput = z.infer<typeof priceUpdateSchema>;

export type StockUpdateInput = z.infer<typeof stockUpdateSchema>;

export type VariantInput = z.infer<typeof variantSchema>;

export type CategoryInput = z.infer<typeof categorySchema>;

export type CollectionInput = z.infer<typeof collectionSchema>;
