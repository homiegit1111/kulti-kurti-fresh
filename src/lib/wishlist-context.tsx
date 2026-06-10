"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { type MockProduct } from "@/lib/medusa";

// ── Types ──
interface WishlistContextType {
  items: MockProduct[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: MockProduct) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

const WISHLIST_STORAGE_KEY = "rangat-pehnawa-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MockProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadStoredWishlist = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
        if (stored) {
          setItems(JSON.parse(stored));
        }
      } catch {
        // ignore parse errors
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(loadStoredWishlist);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const isWishlisted = useCallback(
    (productId: string) => items.some((item) => item.id === productId),
    [items],
  );

  const toggleWishlist = useCallback((product: MockProduct) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }
      return [...prev, product];
    });
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const clearWishlist = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
      count: items.length,
    }),
    [items, isWishlisted, toggleWishlist, removeFromWishlist, clearWishlist],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
