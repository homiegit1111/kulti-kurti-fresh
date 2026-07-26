"use client";

/**
 * StyleRow — ledger density. 12–14 styles per screen.
 *
 * Built on `.inventory-row` (design contract §5): the lime fill-on-hover is the
 * house signature and it already rebinds --content to on-accent ink so text
 * stays readable in both themes.
 *
 * STRUCTURAL NOTE: unlike the old homepage inventory row, this is NOT a <Link>
 * wrapper. A stepper and a commit button inside an anchor is invalid HTML and
 * breaks keyboard operation. The link scopes to thumb + title only; the rest of
 * the row holds real controls.
 *
 * No entrance animation. Ledger rows must be legible on arrival — reveal-on-
 * scroll over tabular data is a defect, not polish.
 */

import Image from "next/image";
import Link from "next/link";
import { Check, GitCompare } from "lucide-react";
import {
  COMMIT_DEFAULT_SETS,
  isCommitted,
  isSoldOut,
  type StyleLine,
} from "@/lib/line/contract";
import { formatPrice } from "@/lib/commerce/catalog";
import { cn } from "@/lib/utils";
import type { StyleLineActions } from "./actions";
import { PriceBlock } from "./price-block";
import { SetStepper } from "./set-stepper";
import { SizeRun } from "./size-run";
import { CodeChip, StockCell, stateRule, stateWash } from "./stock-mark";

/** Ledger column template. Code runs to 13 chars ("RP-COTTON-482") — 7rem holds it. */
export const LEDGER_COLS =
  "md:grid-cols-[3.5rem_minmax(0,1fr)_7rem_7.5rem_3rem_10rem]";

export function LedgerHead() {
  return (
    <div
      className={cn(
        "hidden gap-4 border-b border-line/25 py-3 pl-3",
        "text-[8px] font-bold uppercase tracking-[0.22em] text-content/40",
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
  onToggleCompare,
}: {
  line: StyleLine;
  shortlisted?: boolean;
} & StyleLineActions) {
  const { product } = line;
  const committed = isCommitted(line);
  const soldOut = isSoldOut(line);

  return (
    <div
      className={cn(
        "inventory-row grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-line/20 py-3 pl-3",
        LEDGER_COLS,
        stateRule(line),
        stateWash(line),
        soldOut && "opacity-60",
      )}
    >
      {/* Thumb — 4:5, not square. Kurtis are vertical garments. */}
      <Link
        href={`/shop/${product.handle}`}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-hover"
      >
        <Image
          src={product.image}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
        />
      </Link>

      {/* Code + title */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <CodeChip code={line.code} active={committed} />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-content/40">
            {product.category}
          </span>
        </div>
        <Link href={`/shop/${product.handle}`} className="group/title block">
          <h3 className="mt-1.5 truncate text-sm font-bold leading-tight tracking-[-0.02em] group-hover/title:underline sm:text-base">
            {product.title}
          </h3>
        </Link>
        {/* Mobile-only condensed facts — one renderer, responsive. */}
        <div className="mt-1.5 flex items-center gap-3 md:hidden">
          <SizeRun sizes={line.sizeRun} className="text-[10px]" />
          <span className="text-[11px] font-black tabular-nums tracking-[-0.02em]">
            {formatPrice(line.perPiece)}
            <span className="ml-0.5 text-[8px] font-bold tracking-[0.14em] text-content/45">
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
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.16em] text-content/50 lg:inline">
              sets
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onCommit?.(line)}
            className="flex h-7 items-center gap-1.5 border border-content/35 px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 hover:bg-surface-inverse hover:text-accent-lime"
          >
            Commit {COMMIT_DEFAULT_SETS}
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleCompare?.(line)}
          aria-pressed={line.comparing}
          aria-label={line.comparing ? "Remove from compare" : "Add to compare"}
          className={cn(
            "flex h-7 w-7 items-center justify-center border transition-colors duration-200",
            line.comparing
              ? "border-accent-red bg-accent-red text-white"
              : "border-line/25 text-content/45 hover:border-accent-red hover:text-accent-red",
          )}
        >
          <GitCompare className="h-3 w-3" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => onToggleShortlist?.(line)}
          aria-pressed={shortlisted}
          aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
          className={cn(
            "flex h-7 w-7 items-center justify-center border transition-colors duration-200",
            shortlisted
              ? "border-accent-lime bg-accent-lime text-on-accent"
              : "border-line/25 text-content/45 hover:border-content",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
