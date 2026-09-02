"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { DemoProduct } from "@/features/catalog/demo-data";

export type CartItem = { product: DemoProduct; productId: string; variantId: string; variant: string; quantity: number };
type CartContextValue = { items: CartItem[]; isOpen: boolean; addItem: (product: DemoProduct, productIdOrVariant: string, variantIdOrQuantity?: string | number, variantOrQuantity?: string | number, quantity?: number) => void; updateQuantity: (productId: string, variantId: string, quantity: number) => void; removeItem: (productId: string, variantId: string) => void; clearCart: () => void; setOpen: (open: boolean) => void; itemCount: number; subtotal: number };
const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "looms-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]); const [isOpen, setOpen] = useState(false); const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { try { const stored = window.localStorage.getItem(storageKey); if (stored) setItems(JSON.parse(stored) as CartItem[]); } catch { window.localStorage.removeItem(storageKey); } finally { setIsHydrated(true); } }, []);
  useEffect(() => { if (isHydrated) window.localStorage.setItem(storageKey, JSON.stringify(items)); }, [items, isHydrated]);
  const value = useMemo<CartContextValue>(() => ({ items, isOpen, setOpen, itemCount: items.reduce((total, item) => total + item.quantity, 0), subtotal: items.reduce((total, item) => total + (item.product.salePrice ?? item.product.price) * item.quantity, 0), addItem(product, productIdOrVariant, variantIdOrQuantity, variantOrQuantity, explicitQuantity = 1) { const legacyCall = typeof variantIdOrQuantity === "number" || variantIdOrQuantity === undefined; const productId = legacyCall ? product.id : productIdOrVariant; const variant = legacyCall ? productIdOrVariant : String(variantOrQuantity); const variantId = legacyCall ? product.variantIds[variant] : String(variantIdOrQuantity); const quantity = legacyCall && typeof variantIdOrQuantity === "number" ? variantIdOrQuantity : explicitQuantity; if (!variantId) return; setItems((current) => { const present = current.find((item) => item.productId === productId && item.variantId === variantId); return present ? current.map((item) => item === present ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item) : [...current, { product, productId, variantId, variant, quantity: Math.min(99, Math.max(1, quantity)) }]; }); setOpen(true); }, updateQuantity(productId, variantId, quantity) { setItems((current) => quantity < 1 ? current.filter((item) => item.productId !== productId || item.variantId !== variantId) : current.map((item) => item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.min(99, quantity) } : item)); }, removeItem(productId, variantId) { setItems((current) => current.filter((item) => item.productId !== productId || item.variantId !== variantId)); }, clearCart() { setItems([]); } }), [items, isOpen]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error("useCart must be used within CartProvider"); return context; }
