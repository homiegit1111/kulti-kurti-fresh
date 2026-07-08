"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/client";
import { type MockProduct } from "@/lib/commerce/catalog";

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

/**
 * Wishlist state with optional cross-device persistence.
 *
 * • Guests: localStorage only (instant, no account needed).
 * • Signed-in (Clerk): Supabase is the source of truth via /api/wishlist
 *   (RLS-scoped). On first sign-in we MERGE any local guest items up to the
 *   server, then load the server list. Mutations update local state
 *   optimistically and fire best-effort server sync.
 *
 * localStorage is always kept as a render cache so the UI is instant on reload.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [items, setItems] = useState<MockProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Refs mirror latest state so callbacks stay stable and read fresh values.
  const itemsRef = useRef<MockProduct[]>([]);
  const signedInRef = useRef(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    signedInRef.current = Boolean(isSignedIn);
  }, [isSignedIn]);

  // 1) Load localStorage cache on mount (instant render for everyone).
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored));
      } catch {
        // ignore parse errors
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  // 2) Persist to localStorage whenever items change (cache).
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  // 3) On sign-in: merge local guest items → server, then load server truth.
  useEffect(() => {
    if (!isLoaded || !hydrated) return;

    if (!isSignedIn) {
      // Allow re-sync if they sign in again later.
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) return;
    syncedRef.current = true;

    (async () => {
      try {
        const local = itemsRef.current;

        const res = await fetch("/api/wishlist", { cache: "no-store" });
        if (!res.ok) return; // keep local cache on failure
        const data = (await res.json()) as { items?: MockProduct[] };
        const serverItems = data.items ?? [];
        const serverIds = new Set(serverItems.map((p) => p.id));

        // Push guest items the server doesn't have yet (first-time migration).
        const toPush = local.filter((p) => !serverIds.has(p.id));
        await Promise.all(
          toPush.map((p) =>
            fetch("/api/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product_id: p.id,
                product_handle: p.handle,
              }),
            }).catch(() => {}),
          ),
        );

        // Merge (server truth + freshly pushed locals), de-dupe by id.
        const byId = new Map<string, MockProduct>();
        for (const p of [...serverItems, ...toPush]) byId.set(p.id, p);
        setItems(Array.from(byId.values()));
      } catch {
        // Network/parse error → keep the local cache.
      }
    })();
  }, [isLoaded, isSignedIn, hydrated]);

  const isWishlisted = useCallback(
    (productId: string) => items.some((item) => item.id === productId),
    [items],
  );

  const toggleWishlist = useCallback((product: MockProduct) => {
    const exists = itemsRef.current.some((item) => item.id === product.id);
    setItems((prev) =>
      exists
        ? prev.filter((item) => item.id !== product.id)
        : [...prev, product],
    );

    if (!signedInRef.current) return;
    if (exists) {
      fetch(`/api/wishlist?product_id=${encodeURIComponent(product.id)}`, {
        method: "DELETE",
      }).catch(() => {});
    } else {
      fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          product_handle: product.handle,
        }),
      }).catch(() => {});
    }
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
    if (signedInRef.current) {
      fetch(`/api/wishlist?product_id=${encodeURIComponent(productId)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  }, []);

  const clearWishlist = useCallback(() => {
    setItems([]);
    if (signedInRef.current) {
      fetch("/api/wishlist", { method: "DELETE" }).catch(() => {});
    }
  }, []);

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
