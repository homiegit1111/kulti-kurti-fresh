"use client";

/**
 * Density persistence.
 *
 * Plate is the default for a NEW session — a data table would read as cold to a
 * first-time or Instagram-led visitor. Ledger becomes sticky only after the
 * buyer's first commit, which is the moment they've identified themselves as a
 * trade buyer. That is how returning buyers get faster without taxing discovery,
 * and it needs no account, no cookie, no server.
 *
 * localStorage is an external store, so it is read through useSyncExternalStore
 * rather than setState-in-an-effect. That gives us the SSR snapshot for free and
 * keeps every open tab in sync via the `storage` event.
 */

import { useCallback, useSyncExternalStore } from "react";

export type Density = "plate" | "grid" | "ledger";

export const DENSITIES: { value: Density; label: string; hint: string }[] = [
  { value: "plate", label: "Plate", hint: "Large plates — 2 per row" },
  { value: "grid", label: "Grid", hint: "Compact grid — up to 6 per row" },
  { value: "ledger", label: "Ledger", hint: "Table rows — 12+ per screen" },
];

/** Namespaced to match the existing rangat-pehnawa-* keys. */
const DENSITY_KEY = "rangat-pehnawa-density";
/** Set once the buyer commits their first line. Promotes Ledger to default. */
const TRADE_KEY = "rangat-pehnawa-trade-buyer";
/** Fired locally because `storage` only reaches OTHER tabs. */
const CHANGE_EVENT = "rangat-density-change";

function isDensity(value: string | null): value is Density {
  return value === "plate" || value === "grid" || value === "ledger";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Returns a primitive, so React's snapshot identity check is stable and this
 * cannot loop. Encodes both signals in one string: "<density>|<trade>".
 */
function getSnapshot(): string {
  try {
    const stored = localStorage.getItem(DENSITY_KEY) ?? "";
    const trade = localStorage.getItem(TRADE_KEY) === "1" ? "1" : "0";
    return `${stored}|${trade}`;
  } catch {
    /* private mode */
    return "|0";
  }
}

/** Server and first client render agree, so hydration cannot mismatch. */
function getServerSnapshot(): string {
  return "|0";
}

export function useDensity(urlDensity?: Density | null) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [storedRaw, trade] = snapshot.split("|");
  const stored = isDensity(storedRaw ?? null) ? (storedRaw as Density) : null;

  // Precedence: explicit ?d= link → stored pick → trade-buyer promotion → plate.
  const density: Density =
    urlDensity ?? stored ?? (trade === "1" ? "ledger" : "plate");

  const choose = useCallback((next: Density) => {
    try {
      localStorage.setItem(DENSITY_KEY, next);
    } catch {
      /* non-fatal */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { density, choose };
}

/** Call on first commit. Only promotes the default; never overrides an explicit pick. */
export function markTradeBuyer() {
  try {
    if (localStorage.getItem(TRADE_KEY) === "1") return;
    localStorage.setItem(TRADE_KEY, "1");
  } catch {
    /* non-fatal */
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
