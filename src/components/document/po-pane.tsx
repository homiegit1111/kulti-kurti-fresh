"use client";

/**
 * §1.7 — POPane: the purchase order as a typeset document. Renders the exact
 * `buildWholesaleWhatsAppMessage(items, buyer)` string — byte-for-byte, the
 * frozen channel contract (§1.1.4) — as mono 12/18 on a 1px-ruled sheet with a
 * letterhead double rule and the chop. A changed line re-inks (opacity only,
 * 160ms, reduced-motion gated). Below `lg` it renders as a bottom-sheet
 * trigger ("Review your PO") opening above the 76px sticky-CTA clearance.
 */

import { useEffect, useMemo, useState } from "react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { calculateWholesaleTotals } from "@/lib/b2b/pricing";
import {
  buildWholesaleWhatsAppMessage,
  buildWholesaleWhatsAppUrl,
  type WholesaleBuyerInfo,
} from "@/lib/b2b/whatsapp";
import type { CartItem } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import { ChopStamp } from "./chop-stamp";

const EMPTY_BUYER: WholesaleBuyerInfo = {};

/**
 * §1.7 — the PO pane. `sticky` pins the pane at `lg+` (desk rail position).
 * The message region's `innerText` equals the WhatsApp builder output exactly
 * (`white-space: pre-wrap`); the footer button is the `wa.me` URL.
 */
export function POPane({
  items,
  buyer = EMPTY_BUYER,
  sticky = false,
  className,
}: {
  items: CartItem[];
  buyer?: WholesaleBuyerInfo;
  sticky?: boolean;
  className?: string;
}) {
  const message = useMemo(
    () => buildWholesaleWhatsAppMessage(items, buyer),
    [items, buyer],
  );
  const href = useMemo(
    () => buildWholesaleWhatsAppUrl(items, buyer),
    [items, buyer],
  );
  const moqMet = useMemo(
    () =>
      calculateWholesaleTotals(items).totalSets >= B2B_CONFIG.minimumOrderSets,
    [items],
  );
  const lines = useMemo(() => message.split("\n"), [message]);

  // Changed-line detection: a line that differs from the previous render
  // re-inks. First render never animates (entrance policy §1.6). Render-phase
  // previous-value pattern per the React docs ("storing information from
  // previous renders").
  const [prevLines, setPrevLines] = useState<string[] | null>(null);
  const changed = new Set<number>();
  if (prevLines !== null && prevLines !== lines) {
    lines.forEach((line, index) => {
      if (prevLines[index] !== line) changed.add(index);
    });
  }
  if (prevLines !== lines) {
    setPrevLines(lines);
  }

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const pane = (
    <div className="border-x border-b border-line/25 bg-surface">
      {/* Letterhead double rule + the chop (R10). */}
      <header className="entry-rule flex items-center justify-between px-4 pb-3 pt-4">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.22em]">
          Purchase order
        </span>
        <ChopStamp moqMet={moqMet} />
      </header>
      <pre className="ledger whitespace-pre-wrap border-t border-line/25 px-4 py-4 font-mono text-[12px] leading-[18px]">
        {lines.map((line, index) => (
          <span
            key={`${index}:${line}`}
            className={changed.has(index) ? "po-reink" : undefined}
          >
            {index > 0 ? "\n" : null}
            {line}
          </span>
        ))}
      </pre>
      <footer className="border-t border-line/25 p-4">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-full items-center justify-center bg-surface-inverse text-[10px] font-extrabold uppercase tracking-[0.2em] text-content-inverse transition-colors duration-200 hover:text-accent-lime"
        >
          Send order on WhatsApp
        </a>
      </footer>
    </div>
  );

  return (
    <>
      {/* Changed-line re-ink — opacity only, 160ms (§1.6), reduced-motion gated. */}
      <style>{`
@media (prefers-reduced-motion: no-preference) {
  @keyframes po-reink { from { opacity: 0.2; } to { opacity: 1; } }
  .po-reink { animation: po-reink 160ms ease-out 1 both; }
}
      `}</style>

      {/* Desk pane at lg+. */}
      <section
        aria-label="Purchase order"
        className={cn("hidden lg:block", sticky && "lg:sticky lg:top-24", className)}
      >
        {pane}
      </section>

      {/* Below lg: bottom-sheet trigger + sheet above the 76px CTA clearance. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex h-11 w-full items-center justify-center border border-content/35 text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors duration-200 hover:bg-surface-inverse hover:text-accent-lime"
        >
          Review your order
        </button>
        {open && (
          <div
            role="dialog"
            aria-label="Purchase order"
            className="fixed inset-x-0 bottom-[76px] z-40 max-h-[70svh] overflow-y-auto border-t-2 border-content bg-surface"
          >
            <div className="flex items-center justify-end border-b border-line/25 px-4 py-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-content/55 transition-colors duration-200 hover:text-content"
              >
                Close
              </button>
            </div>
            {pane}
          </div>
        )}
      </div>
    </>
  );
}
