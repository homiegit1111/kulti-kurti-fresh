"use client";

/**
 * Stock marks — the honest treatment.
 *
 * The schema gives us `availableForSale?: boolean`, which is three-valued in
 * practice (true | false | undefined). We can prove a style is FLAGGED sold out.
 * We can never prove one is in stock, because `undefined` is the default.
 *
 * Therefore: `sold_out` renders a mark. `unflagged` renders NOTHING. There is no
 * positive affirmation anywhere in this system — no green dot, no "Ready", no
 * "In stock", no pulsing indicator (also forbidden by design contract §4).
 * Silence is the only true statement we can make.
 */

import type { StockState } from "@/lib/line/contract";
import { cn } from "@/lib/utils";

/** Ledger stock cell. Renders an em-rule for unflagged so the column stays aligned. */
export function StockCell({ stock }: { stock: StockState }) {
  if (stock !== "sold_out") {
    return (
      <span aria-hidden className="text-[10px] font-bold text-content/20">
        —
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold uppercase leading-tight tracking-[0.14em] text-accent-red">
      Sold
      <br />
      out
    </span>
  );
}

/**
 * Plate/card scrim. Covers the image only — the style stays clickable, because a
 * buyer needs to know the style exists and is out, not have it vanish.
 */
export function SoldOutScrim({ stock }: { stock: StockState }) {
  if (stock !== "sold_out") return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-surface-inverse/85"
      aria-hidden
    >
      <span className="border border-content-inverse/30 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.3em] text-content-inverse">
        Sold out
      </span>
    </div>
  );
}

/**
 * Left state rule, shared by all three densities. One accent per line, max.
 * Compare (red) outranks tray state (lime) while active — the buyer is mid-
 * decision, and that is the state they are acting on.
 */
export function stateRule({
  sets,
  comparing,
}: {
  sets: number;
  comparing: boolean;
}): string {
  if (comparing) return "border-l-2 border-accent-red";
  if (sets > 0) return "border-l-2 border-accent-lime";
  return "border-l-2 border-transparent";
}

/** Committed lines carry a lime wash so a scanned ledger shows the order shape. */
export function stateWash({ sets }: { sets: number }): string {
  return sets > 0 ? "bg-accent-lime/8" : "";
}

/** Style code chip. Lime once the line is in the tray, hairline otherwise. */
export function CodeChip({
  code,
  active = false,
  className,
}: {
  code: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
        active
          ? "bg-accent-lime text-on-accent"
          : "border border-line/25 text-content/55",
        className,
      )}
    >
      {code}
    </span>
  );
}
