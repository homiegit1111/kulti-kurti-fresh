"use client";

/**
 * The single tray entry point in global nav.
 *
 * This replaces the old pair — a "Wishlist" text link and a cart drawer — that
 * split one intent across two surfaces. A wholesale buyer does not think in
 * "saved" vs "in cart"; they think in "styles I'm working on", some of which
 * carry a set count and some of which don't. So one control, one destination,
 * and a readout that names whichever state is actually load-bearing.
 *
 * Three states, because there are exactly three facts to tell:
 *   committed > 0   → "N sets" (+ saved count behind a rule). Ink treatment.
 *   saved only      → "N saved". Quiet treatment: nothing is on order yet, so
 *                     shouting would misreport the tray.
 *   empty           → label only.
 *
 * Renders a hairline placeholder until the store has read localStorage: printing
 * "0" before the read is a claim that then flickers. tabular-nums + min-w hold
 * the width so the nav never reflows when the real number lands.
 */

import Link from "next/link";
import { useTray } from "@/lib/line/tray-context";
import { cn } from "@/lib/utils";

export function TrayButton({
  className,
  /** Mobile nav: drop the word, keep the numbers. */
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { totals, hydrated } = useTray();
  const { committedCount, shortlistedCount, totalSets, moqMet } = totals;

  const onOrder = committedCount > 0;
  const savedOnly = !onOrder && shortlistedCount > 0;
  const empty = !onOrder && !savedOnly;

  return (
    <Link
      href="/tray"
      aria-label={
        empty
          ? "Open your order — empty"
          : onOrder
            ? `Open your order — ${totalSets} ${totalSets === 1 ? "set" : "sets"} on order across ${committedCount} ${committedCount === 1 ? "style" : "styles"}${
                shortlistedCount > 0 ? `, ${shortlistedCount} saved` : ""
              }`
            : `Open your order — ${shortlistedCount} ${shortlistedCount === 1 ? "style" : "styles"} saved, none on order`
      }
      className={cn(
        "group relative flex h-9 items-center border transition-colors duration-300",
        // Only a real order earns the ink fill. A shortlist is not an order.
        onOrder
          ? "border-line bg-surface-inverse text-content-inverse hover:border-accent-red hover:bg-accent-red"
          : "border-line/20 text-content hover:border-line/45",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime",
        className,
      )}
    >
      {!compact && (
        <span
          className={cn(
            "px-3 text-[10px] font-bold uppercase tracking-[0.18em]",
            !onOrder && "text-content/60 group-hover:text-content/85",
          )}
        >
          Your order
        </span>
      )}

      <span
        className={cn(
          "flex h-full items-center gap-1.5 px-2.5 tabular-nums",
          !compact && "border-l",
          !compact && (onOrder ? "border-white/20" : "border-line/20"),
        )}
      >
        {!hydrated ? (
          <span className="block h-[2px] w-5 bg-current opacity-25" aria-hidden />
        ) : empty ? (
          <span className="text-[11px] font-bold leading-none text-content/25">
            —
          </span>
        ) : onOrder ? (
          <>
            <span className="min-w-[1.1em] text-center text-[11px] font-bold leading-none text-accent-lime">
              {totalSets}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-content-inverse/45">
              sets
            </span>
            {shortlistedCount > 0 && (
              <>
                <span className="ml-0.5 h-3 w-px bg-white/20" aria-hidden />
                <span className="text-[11px] font-bold leading-none text-content-inverse/60">
                  {shortlistedCount}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="min-w-[1.1em] text-center text-[11px] font-bold leading-none text-content">
              {shortlistedCount}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-content/40">
              saved
            </span>
          </>
        )}
      </span>

      {/* MOQ tell: a 2px rule at the edge, solid lime only once the order can
          actually be placed. No badge, no pill — read at a glance. */}
      {hydrated && onOrder && (
        <span
          className={cn(
            "absolute inset-x-0 -bottom-px h-[2px]",
            moqMet ? "bg-accent-lime" : "bg-accent-lime/30",
          )}
          aria-hidden
        />
      )}
    </Link>
  );
}
