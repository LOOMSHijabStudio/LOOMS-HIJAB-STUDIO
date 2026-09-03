"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type WishlistContextValue = {
  wishlist: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
};

const WishlistContext =
  createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = "looms-wishlist-v1";

export function WishlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setWishlist(
            parsed.filter(
              (item): item is string =>
                typeof item === "string",
            ),
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to load wishlist:",
        error,
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(wishlist),
      );
    } catch (error) {
      console.error(
        "Failed to save wishlist:",
        error,
      );
    }
  }, [wishlist, hydrated]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlist,

      isWishlisted: (productId: string) =>
        wishlist.includes(productId),

      toggleWishlist: (productId: string) => {
        setWishlist((current) => {
          if (current.includes(productId)) {
            return current.filter(
              (id) => id !== productId,
            );
          }

          return [...current, productId];
        });
      },

      removeFromWishlist: (productId: string) => {
        setWishlist((current) =>
          current.filter(
            (id) => id !== productId,
          ),
        );
      },

      clearWishlist: () => {
        setWishlist([]);
      },
    }),
    [wishlist],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context =
    useContext(WishlistContext);

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider",
    );
  }

  return context;
}
