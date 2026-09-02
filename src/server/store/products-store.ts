import "server-only";
import { demoProducts } from "@/features/catalog/demo-data";

export interface ManagedProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  is_featured: boolean;
  image: string;
  description: string;
  material?: string;
  created_at: string;
  updated_at: string;
}

// In-memory products store for local development & immediate testing
export const localProducts: ManagedProduct[] = demoProducts.map((p, i) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  sku: `LMS-${p.slug.toUpperCase().slice(0, 8)}-00${i + 1}`,
  price: p.price,
  sale_price: p.salePrice || null,
  stock: p.stock,
  status: "ACTIVE",
  is_featured: Boolean(p.isBestSeller || p.isNew),
  image: p.image,
  description: p.description,
  material: p.material,
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
}));

export function getLocalProducts(): ManagedProduct[] {
  return localProducts;
}

export function addLocalProduct(product: Omit<ManagedProduct, "id" | "created_at" | "updated_at">): ManagedProduct {
  const newProd: ManagedProduct = {
    ...product,
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localProducts.unshift(newProd);
  return newProd;
}

export function updateLocalProduct(id: string, updates: Partial<ManagedProduct>): ManagedProduct | null {
  const index = localProducts.findIndex((p) => p.id === id);
  if (index === -1) return null;
  localProducts[index] = {
    ...localProducts[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  return localProducts[index];
}

export function deleteLocalProduct(id: string): boolean {
  const index = localProducts.findIndex((p) => p.id === id);
  if (index === -1) return false;
  localProducts.splice(index, 1);
  return true;
}
