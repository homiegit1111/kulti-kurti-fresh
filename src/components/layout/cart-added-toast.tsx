"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { MOCK_PRODUCTS, formatPrice } from "@/lib/commerce/catalog";
import { getStyleCode } from "@/lib/b2b/style-code";

const AUTO_DISMISS_MS = 4200;

/**
 * "Added to order" confirmation (Chapter 4) — a small order-slip row on role
 * tokens: mono style code, sets added, set rate, "View order". No entrance
 * animation (motion doctrine §1.6); it appears, reports, and dismisses.
 */
export function CartAddedToast() {
  const { addedNotice, dismissAddedNotice, itemCount } = useCart();

  useEffect(() => {
    if (!addedNotice) return;
    const t = window.setTimeout(() => dismissAddedNotice(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [addedNotice, dismissAddedNotice]);

  if (!addedNotice) return null;

  const product = MOCK_PRODUCTS.find((p) => p.handle === addedNotice.handle);
  const setPrice = product ? (product.salePrice ?? product.price) : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[max(5.5rem,calc(4.75rem+env(safe-area-inset-bottom)))] left-1/2 z-[60] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 sm:bottom-8 sm:left-auto sm:right-6 sm:translate-x-0 lg:bottom-14"
    >
      <div className="ledger border border-line/25 bg-surface text-content">
        <div className="flex items-baseline justify-between gap-3 border-b border-line/15 px-3.5 py-2">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-content/55">
            {addedNotice.setsAdded === 1
              ? "1 set added"
              : `${addedNotice.setsAdded} sets added`}
          </p>
          <button
            type="button"
            onClick={dismissAddedNotice}
            className="-mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center self-center text-content/40 transition-colors hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex items-baseline gap-3 px-3.5 py-3">
          {product && (
            <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-content/55">
              {getStyleCode(product)}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
            {addedNotice.title}
          </span>
          {setPrice !== null && (
            <span className="shrink-0 text-[12px] font-bold tabular-nums">
              {formatPrice(setPrice)}
              <span className="font-semibold text-content/50"> / set</span>
            </span>
          )}
        </div>

        <div className="flex border-t border-line/15">
          <Link
            href="/cart"
            onClick={dismissAddedNotice}
            className="flex h-10 flex-1 items-center justify-center text-[12px] font-semibold text-content transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
          >
            View order · {itemCount} {itemCount === 1 ? "set" : "sets"}
          </Link>
          <div className="w-px bg-line/15" />
          <button
            type="button"
            onClick={dismissAddedNotice}
            className="flex h-10 flex-1 items-center justify-center text-[12px] font-medium text-content/55 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
