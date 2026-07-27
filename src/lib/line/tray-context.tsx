"use client";

/**
 * The tray — one surface for shortlist + order.
 *
 * MODEL: the shortlist shape wins. Each entry keeps the FULL product object and
 * carries `sets: number` as the only state separating the two bands:
 *
 *   sets === 0  → shortlisted (saved, not in the order)
 *   sets  >  0  → committed   (counts toward MOQ)
 *   absent      → not in the tray at all
 *
 * That is why a shortlisted row can render size run, colours, category and rate
 * with no refetch — the old CartItem flattening (size/color/price only) is what
 * made wishlist and cart feel like two unrelated features.
 *
 * STORAGE: localStorage is an external system, so it is read through
 * useSyncExternalStore rather than a setState-in-effect. A module-level store
 * holds the snapshot; getServerSnapshot returns empty so SSR and first client
 * render agree and hydration cannot mismatch.
 *
 * SCOPE: presentational state only. This context does NOT touch cart-context,
 * Shopify, checkout or any commerce handler. Flattening to the wire shape
 * (CommerceCartLine) happens later, at the checkout-draft boundary, and is
 * deliberately out of scope for the frontend rebuild.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import type { MockProduct } from "@/lib/commerce/catalog";
import {
  COMMIT_DEFAULT_SETS,
  COMPARE_MAX,
  toStyleLine,
  type StyleLine,
} from "./contract";

const TRAY_KEY = "rangat-pehnawa-tray";
/** Legacy keys, read once for migration so nobody loses a saved list. */
const LEGACY_WISHLIST_KEY = "rangat-pehnawa-wishlist";
const LEGACY_CART_KEY = "rangat-pehnawa-cart";

/** Stored shape: intact product + set count. Nothing else is persisted. */
interface TrayEntry {
  product: MockProduct;
  sets: number;
}

export interface TrayTotals {
  styleCount: number;
  committedCount: number;
  shortlistedCount: number;
  totalSets: number;
  totalPieces: number;
  /** Sum of set rate × sets across committed lines. */
  subtotal: number;
  /** subtotal / totalPieces — what a buyer reports to their partner. */
  blendedPerPiece: number;
  moqTarget: number;
  moqMet: boolean;
  setsToMoq: number;
}

interface TrayContextValue {
  lines: StyleLine[];
  committed: StyleLine[];
  shortlisted: StyleLine[];
  totals: TrayTotals;
  compareIds: string[];
  hydrated: boolean;
  /** In the tray in either band. */
  has: (productId: string) => boolean;
  isShortlisted: (productId: string) => boolean;
  isCommitted: (productId: string) => boolean;
  isComparing: (productId: string) => boolean;
  /** Add at sets=0, or remove entirely if already shortlisted. */
  toggleShortlist: (product: MockProduct) => void;
  /** Put in the order at COMMIT_DEFAULT_SETS — MOQ satisfied in one action. */
  commit: (product: MockProduct, sets?: number) => void;
  setSets: (productId: string, sets: number) => void;
  /** sets → 0. Non-destructive: the style stays saved. */
  demote: (productId: string) => void;
  remove: (productId: string) => void;
  commitAllShortlisted: () => void;
  clearTray: () => void;
  toggleCompare: (product: MockProduct) => void;
  clearCompare: () => void;
}

const TrayContext = createContext<TrayContextValue | undefined>(undefined);

// ── Module store ──────────────────────────────────────────────────────────────
// Stable empty array: getSnapshot MUST return a cached reference or React loops.

const EMPTY: TrayEntry[] = [];

/**
 * Pre-hydration sentinel — same shape as EMPTY, distinct identity. The snapshot
 * starts here on both server and first client render; the first subscribe swaps
 * it for the storage read. Because the reference ALWAYS changes at that swap
 * (EMPTY !== UNHYDRATED even when storage is empty), React re-renders and
 * `hydrated` flips — an empty tray must not look like an unhydrated one.
 */
const UNHYDRATED: TrayEntry[] = [];

let snapshot: TrayEntry[] = UNHYDRATED;
let didHydrate = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readFromStorage(): TrayEntry[] {
  if (typeof window === "undefined") return EMPTY;

  try {
    const stored = window.localStorage.getItem(TRAY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as TrayEntry[];
      if (Array.isArray(parsed)) {
        return parsed.filter((e) => e?.product?.id);
      }
    }
  } catch {
    /* fall through to migration */
  }

  // ── One-time migration: legacy wishlist + cart → tray ──
  const migrated = new Map<string, TrayEntry>();

  try {
    const wishlist = window.localStorage.getItem(LEGACY_WISHLIST_KEY);
    if (wishlist) {
      const products = JSON.parse(wishlist) as MockProduct[];
      for (const product of products) {
        if (product?.id) migrated.set(product.id, { product, sets: 0 });
      }
    }
  } catch {
    /* ignore malformed legacy data */
  }

  try {
    const cart = window.localStorage.getItem(LEGACY_CART_KEY);
    if (cart) {
      // Legacy CartItem is flattened and has no product object, so it can only
      // contribute a set count to a style the wishlist already carries in full.
      // Cart-only styles are intentionally not resurrected as half-products.
      const items = JSON.parse(cart) as {
        productId?: string;
        quantity?: number;
      }[];
      for (const item of items) {
        if (!item?.productId) continue;
        const existing = migrated.get(item.productId);
        if (existing) {
          existing.sets = Math.max(existing.sets, Math.floor(item.quantity ?? 0));
        }
      }
    }
  } catch {
    /* ignore malformed legacy data */
  }

  return migrated.size > 0 ? [...migrated.values()] : EMPTY;
}

function persist(entries: TrayEntry[]) {
  try {
    window.localStorage.setItem(TRAY_KEY, JSON.stringify(entries));
  } catch {
    /* quota or private mode — the tray still works for this session */
  }
}

/** Replace the snapshot, write through to storage, notify subscribers. */
function write(next: TrayEntry[]) {
  snapshot = next;
  persist(next);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // First subscriber triggers the storage read. React re-reads getSnapshot after
  // subscribing, so the hydrated value is picked up without an effect.
  if (!didHydrate) {
    didHydrate = true;
    snapshot = readFromStorage();
    // Reference changed (UNHYDRATED → EMPTY or data): wake every subscriber so
    // components that rendered pre-hydration re-read and flip `hydrated`.
    emit();
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;
/** SSR and the first client render must agree — always the sentinel. */
const getServerSnapshot = () => UNHYDRATED;

// ── Provider ──────────────────────────────────────────────────────────────────

export function TrayProvider({ children }: { children: ReactNode }) {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Compare is session-only by design: a shortlist survives a reload, a
  // comparison does not.
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const hydrated = entries !== UNHYDRATED;

  const upsert = useCallback((product: MockProduct, sets: number) => {
    const prev = snapshot;
    const index = prev.findIndex((e) => e.product.id === product.id);
    if (index === -1) {
      write([...prev, { product, sets }]);
      return;
    }
    const next = [...prev];
    // Refresh the stored product too: rate and stock may have moved since it was
    // saved, and the tray must never quote a stale rate.
    next[index] = { product, sets };
    write(next);
  }, []);

  const toggleShortlist = useCallback((product: MockProduct) => {
    const prev = snapshot;
    const existing = prev.find((e) => e.product.id === product.id);
    if (existing && existing.sets === 0) {
      write(prev.filter((e) => e.product.id !== product.id));
      return;
    }
    if (existing) {
      // Committed → demote rather than delete. A shortlist tap must never
      // destroy a set count.
      write(
        prev.map((e) => (e.product.id === product.id ? { product, sets: 0 } : e)),
      );
      return;
    }
    write([...prev, { product, sets: 0 }]);
  }, []);

  const commit = useCallback(
    (product: MockProduct, sets = COMMIT_DEFAULT_SETS) => {
      upsert(product, Math.max(B2B_CONFIG.minimumStyleSets, Math.floor(sets)));
    },
    [upsert],
  );

  const setSets = useCallback((productId: string, sets: number) => {
    write(
      snapshot.map((e) =>
        e.product.id === productId
          ? { ...e, sets: Math.max(0, Math.floor(sets)) }
          : e,
      ),
    );
  }, []);

  const demote = useCallback(
    (productId: string) => setSets(productId, 0),
    [setSets],
  );

  const remove = useCallback((productId: string) => {
    write(snapshot.filter((e) => e.product.id !== productId));
    setCompareIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const commitAllShortlisted = useCallback(() => {
    write(
      snapshot.map((e) =>
        e.sets === 0 && e.product.availableForSale !== false
          ? { ...e, sets: COMMIT_DEFAULT_SETS }
          : e,
      ),
    );
  }, []);

  const clearTray = useCallback(() => {
    write([]);
    setCompareIds([]);
  }, []);

  const toggleCompare = useCallback((product: MockProduct) => {
    setCompareIds((prev) => {
      if (prev.includes(product.id)) {
        return prev.filter((id) => id !== product.id);
      }
      if (prev.length >= COMPARE_MAX) return prev;
      return [...prev, product.id];
    });
  }, []);

  const clearCompare = useCallback(() => setCompareIds([]), []);

  /**
   * Sold-out committed lines are force-demoted on read, not deleted: the buyer
   * keeps the style, but it stops blocking checkout and stops counting to MOQ.
   */
  const lines = useMemo<StyleLine[]>(
    () =>
      entries.map((entry) => {
        const soldOut = entry.product.availableForSale === false;
        return toStyleLine(
          entry.product,
          soldOut ? 0 : entry.sets,
          compareIds.includes(entry.product.id),
        );
      }),
    [entries, compareIds],
  );

  const committed = useMemo(() => lines.filter((l) => l.sets > 0), [lines]);
  const shortlisted = useMemo(() => lines.filter((l) => l.sets === 0), [lines]);

  const totals = useMemo<TrayTotals>(() => {
    const totalSets = committed.reduce((sum, l) => sum + l.sets, 0);
    const totalPieces = totalSets * B2B_CONFIG.setSize;
    const subtotal = committed.reduce((sum, l) => sum + l.setPrice * l.sets, 0);
    const moqTarget = B2B_CONFIG.minimumOrderSets;
    return {
      styleCount: lines.length,
      committedCount: committed.length,
      shortlistedCount: shortlisted.length,
      totalSets,
      totalPieces,
      subtotal,
      blendedPerPiece: totalPieces > 0 ? Math.round(subtotal / totalPieces) : 0,
      moqTarget,
      moqMet: totalSets >= moqTarget,
      setsToMoq: Math.max(0, moqTarget - totalSets),
    };
  }, [lines, committed, shortlisted]);

  const value = useMemo<TrayContextValue>(
    () => ({
      lines,
      committed,
      shortlisted,
      totals,
      compareIds,
      hydrated,
      has: (id) => entries.some((e) => e.product.id === id),
      isShortlisted: (id) =>
        entries.some((e) => e.product.id === id && e.sets === 0),
      isCommitted: (id) =>
        entries.some((e) => e.product.id === id && e.sets > 0),
      isComparing: (id) => compareIds.includes(id),
      toggleShortlist,
      commit,
      setSets,
      demote,
      remove,
      commitAllShortlisted,
      clearTray,
      toggleCompare,
      clearCompare,
    }),
    [
      lines,
      committed,
      shortlisted,
      totals,
      compareIds,
      hydrated,
      entries,
      toggleShortlist,
      commit,
      setSets,
      demote,
      remove,
      commitAllShortlisted,
      clearTray,
      toggleCompare,
      clearCompare,
    ],
  );

  return <TrayContext.Provider value={value}>{children}</TrayContext.Provider>;
}

export function useTray(): TrayContextValue {
  const ctx = useContext(TrayContext);
  if (!ctx) throw new Error("useTray must be used within a TrayProvider");
  return ctx;
}
