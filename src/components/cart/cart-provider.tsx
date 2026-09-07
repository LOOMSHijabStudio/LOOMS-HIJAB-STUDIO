"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { DemoProduct } from "@/features/catalog/demo-data";

export type CartItem = {
  product: DemoProduct;
  productId: string;
  variantId?: string;
  variant: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;

  addItem: (
    product: DemoProduct,
    productId?: string,
    variantId?: string,
    variant?: string,
    quantity?: number
  ) => void;

  updateQuantity: (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => void;

  removeItem: (
    productId: string,
    variantId?: string
  ) => void;

  clearCart: () => void;
  setOpen: (open: boolean) => void;

  itemCount: number;
  subtotal: number;
};

const CartContext =
  createContext<CartContextValue | null>(null);

const storageKey = "looms-cart-v1";

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] =
    useState<CartItem[]>([]);

  const [isOpen, setOpen] =
    useState(false);

  const [isHydrated, setIsHydrated] =
    useState(false);

  /*
   * ==========================================
   * LOAD CART
   * ==========================================
   */

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          storageKey
        );

      if (stored) {
        const parsed =
          JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setItems(
            parsed.map((item) => ({
              ...item,

              /*
               * Produk tanpa variant menggunakan
               * label Default.
               */
              variant:
                item.variant ||
                "Default",

              /*
               * Variant sekarang OPTIONAL.
               */
              variantId:
                item.variantId ||
                undefined,
            }))
          );
        }
      }
    } catch {
      window.localStorage.removeItem(
        storageKey
      );
    } finally {
      setIsHydrated(true);
    }
  }, []);

  /*
   * ==========================================
   * SAVE CART
   * ==========================================
   */

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(items)
    );
  }, [items, isHydrated]);

  /*
   * ==========================================
   * CART ACTIONS
   * ==========================================
   */

  const value = useMemo<CartContextValue>(
    () => ({
      items,

      isOpen,

      setOpen,

      itemCount: items.reduce(
        (total, item) =>
          total + item.quantity,
        0
      ),

      subtotal: items.reduce(
        (total, item) =>
          total +
          (item.product.salePrice ??
            item.product.price) *
            item.quantity,
        0
      ),

      /*
       * ======================================
       * ADD ITEM
       * ======================================
       */

      addItem(
        product,
        productId,
        variantId,
        variant,
        quantity = 1
      ) {
        const actualProductId =
          productId || product.id;

        /*
         * Kalau produk mempunyai variant,
         * gunakan variant tersebut.
         *
         * Kalau tidak mempunyai variant,
         * variantId = undefined.
         */

        const hasVariants =
          Array.isArray(
            product.variants
          ) &&
          product.variants.length > 0;

        const actualVariantId =
          hasVariants
            ? variantId
            : undefined;

        const actualVariant =
          hasVariants
            ? variant ||
              product.variants[0] ||
              "Default"
            : "Default";

        setItems((current) => {
          const present =
            current.find(
              (item) =>
                item.productId ===
                  actualProductId &&
                item.variantId ===
                  actualVariantId
            );

          if (present) {
            return current.map(
              (item) =>
                item === present
                  ? {
                      ...item,
                      quantity: Math.min(
                        99,
                        item.quantity +
                          quantity
                      ),
                    }
                  : item
            );
          }

          return [
            ...current,
            {
              product,

              productId:
                actualProductId,

              variantId:
                actualVariantId,

              variant:
                actualVariant,

              quantity: Math.min(
                99,
                Math.max(
                  1,
                  quantity
                )
              ),
            },
          ];
        });

        setOpen(true);
      },

      /*
       * ======================================
       * UPDATE QUANTITY
       * ======================================
       */

      updateQuantity(
        productId,
        variantId,
        quantity
      ) {
        setItems((current) =>
          quantity < 1
            ? current.filter(
                (item) =>
                  !(
                    item.productId ===
                      productId &&
                    item.variantId ===
                      variantId
                  )
              )
            : current.map(
                (item) =>
                  item.productId ===
                    productId &&
                  item.variantId ===
                    variantId
                    ? {
                        ...item,
                        quantity:
                          Math.min(
                            99,
                            quantity
                          ),
                      }
                    : item
              )
        );
      },

      /*
       * ======================================
       * REMOVE ITEM
       * ======================================
       */

      removeItem(
        productId,
        variantId
      ) {
        setItems((current) =>
          current.filter(
            (item) =>
              !(
                item.productId ===
                  productId &&
                item.variantId ===
                  variantId
              )
          )
        );
      },

      /*
       * ======================================
       * CLEAR CART
       * ======================================
       */

      clearCart() {
        setItems([]);
      },
    }),
    [items, isOpen]
  );

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used within CartProvider"
    );
  }

  return context;
}
