"use client";

/**
 * StyleRow — ledger density. 12–14 styles per screen.
 *
 * Built on `.inventory-row`: hovering washes the row in saffron. That wash used
 * to be opaque, which turned a whole row marigold and shouted over the prices;
 * it is now a tint (see globals.css), so the row still answers the pointer
 * without taking over the page.
 *
 * STRUCTURAL NOTE: unlike the old homepage inventory row, this is NOT a <Link>
 * wrapper. A stepper and a commit button inside an anchor is invalid HTML and
 * breaks keyboard operation. The link scopes to thumb + title only; the rest of
 * the row holds real controls.
 *
 * No entrance animation. Ledger rows must be legible on arrival — reveal-on-
 * scroll over tabular data is a defect, not polish.
 *
 * MUTED LABELS ARE ALL text-content/70, and that is a floor, not a taste. The
 * row previously graded its supporting labels 40 / 45 / 50 / 55 — four steps
 * that were visually one, and every one of them failed AA on paper (2.49 /
 * 2.84 / 3.13 / 3.82 : 1 computed against the cream ground this row sits on
 * at home). They now share one value that clears 4.5:1 on every ground it can
 * land on in either theme: 6.10 on the cover ground and 6.52 on the app
 * surface by day, 7.79 and 8.04 at night.
 */

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  COMMIT_DEFAULT_SETS,
  isCommitted,
  isSoldOut,
  type StyleLine,
} from "@/lib/line/contract";
import { formatPrice } from "@/lib/commerce/catalog";
import {
  claimPlateMorph,
  plateProps,
  plateScopeProps,
} from "@/lib/line/plate-morph";
import { cn } from "@/lib/utils";
import type { StyleLineActions } from "./actions";
import { PriceBlock } from "./price-block";
import { SetStepper } from "./set-stepper";
import { SizeRun } from "./size-run";
import { CodeChip, StockCell, stateRule, stateWash } from "./stock-mark";

/** Ledger column template. Code runs to 13 chars ("RP-COTTON-482") — 7rem holds it.
    The thumb track is 4.5rem, not 3.5: buyers shop by eye first, and at 56px a
    kurti print was unreadable. Mirrored by --ledger-cols in globals.css. */
export const LEDGER_COLS =
  "md:grid-cols-[4.5rem_minmax(0,1fr)_7rem_7.5rem_3rem_10rem]";

export function LedgerHead() {
  return (
    <div
      className={cn(
        "hidden gap-4 border-b border-line/25 py-3 pl-3",
        "text-[8px] font-bold uppercase tracking-[0.22em] text-content/70",
        "md:grid",
        LEDGER_COLS,
      )}
    >
      <span />
      <span>Style</span>
      <span>Size run</span>
      <span>Rate</span>
      <span>Stock</span>
      <span className="text-right">Order</span>
    </div>
  );
}

export function StyleRow({
  line,
  shortlisted = false,
  onCommit,
  onSetsChange,
  onDemote,
  onToggleShortlist,
}: {
  line: StyleLine;
  shortlisted?: boolean;
} & StyleLineActions) {
  const { product } = line;
  const committed = isCommitted(line);
  const soldOut = isSoldOut(line);

  return (
    <div
      {...plateScopeProps}
      className={cn(
        "inventory-row grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-line/20 py-3 pl-3",
        LEDGER_COLS,
        stateRule(line),
        stateWash(line),
        soldOut && "opacity-60",
      )}
    >
      {/* Thumb — 4:5, not square. Kurtis are vertical garments. */}
      <Link
        {...plateProps(product.id)}
        href={`/shop/${product.handle}`}
        onClick={claimPlateMorph}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-hover"
      >
        <Image
          src={product.image}
          alt=""
          fill
          sizes="72px"
          className="object-cover"
        />
      </Link>

      {/* Code + title */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <CodeChip code={line.code} active={committed} />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-content/70">
            {product.category}
          </span>
        </div>
        {/* The morph starts from the thumbnail whichever link was used: the
            buyer's eye is on the cloth, not the words. */}
        <Link
          href={`/shop/${product.handle}`}
          onClick={claimPlateMorph}
          className="group/title block"
        >
          <h3 className="mt-1.5 truncate text-sm font-bold leading-tight tracking-[-0.02em] group-hover/title:underline sm:text-base">
            {product.title}
          </h3>
        </Link>
        {/* Mobile-only condensed facts — one renderer, responsive. */}
        <div className="mt-1.5 flex items-center gap-3 md:hidden">
          <SizeRun sizes={line.sizeRun} className="text-[10px]" />
          <span className="text-[11px] font-black tabular-nums tracking-[-0.02em]">
            {formatPrice(line.perPiece)}
            <span className="ml-0.5 text-[8px] font-bold tracking-[0.14em] text-content/70">
              /PC
            </span>
          </span>
        </div>
      </div>

      <SizeRun sizes={line.sizeRun} className="hidden md:block" />

      <PriceBlock
        setPrice={line.setPrice}
        perPiece={line.perPiece}
        scale="row"
        struck={soldOut}
        className="hidden md:flex"
      />

      <span className="hidden md:block">
        <StockCell stock={line.stock} />
      </span>

      {/* Order controls — the point of the row */}
      <div className="flex items-center justify-end gap-2">
        {soldOut ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-red">
            Sold out
          </span>
        ) : committed ? (
          <>
            <SetStepper
              sets={line.sets}
              onChange={(sets) => onSetsChange?.(line, sets)}
              onDemote={() => onDemote?.(line)}
              size="sm"
            />
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.16em] text-content/70 lg:inline">
              sets
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onCommit?.(line)}
            className="flex h-11 items-center gap-1.5 border border-content/35 px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 hover:bg-surface-inverse hover:text-accent-lime md:h-7 md:px-2.5 md:text-[9px]"
          >
            Add {COMMIT_DEFAULT_SETS} sets
          </button>
        )}

        {/**
         * ONE secondary action, and it says what it does.
         *
         * This slot used to hold two unlabelled icon buttons: a compare glyph
         * and a check mark. Neither read as anything to a boutique owner, and
         * the check was actively misleading — a tick means "done", not "save".
         * Compare is a power-user feature that does not belong in the buying
         * row (it still lives on the style plates and cards), so the row is now
         * one primary action plus one worded Save.
         */}
        <button
          type="button"
          onClick={() => onToggleShortlist?.(line)}
          aria-pressed={shortlisted}
          className={cn(
            "flex h-11 items-center gap-1.5 border px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 md:h-7 md:px-2.5 md:text-[9px]",
            shortlisted
              ? "border-content bg-content text-surface"
              : "border-line/25 text-content/70 hover:border-content hover:text-content",
          )}
        >
          {shortlisted && <Check className="h-3 w-3" strokeWidth={2.5} />}
          {shortlisted ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
