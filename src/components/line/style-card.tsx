"use client";

/**
 * StyleCard — grid density. 12–18 styles per screen.
 *
 * The mid-funnel renderer: enough image to judge the garment, enough numbers to
 * decide. Tightened from the old living-product-card — 4:5 instead of square,
 * gap-y-6 instead of gap-y-12, per-piece leading instead of set price leading,
 * and a labelled shortlist control instead of a bare heart.
 *
 * Same StyleLine contract and same StyleLineActions as StyleRow and StylePlate,
 * so the density toggle is a pure component swap with no prop rewiring.
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
import { claimPlateMorph, plateProps, plateScopeProps } from "@/lib/line/plate-morph";
import { cn } from "@/lib/utils";
import type { StyleLineActions } from "./actions";
import { PriceBlock } from "./price-block";
import { SetStepper } from "./set-stepper";
import { SizeRun } from "./size-run";
import { CodeChip, SoldOutScrim, stateRule, stateWash } from "./stock-mark";

/** Grid template — 5 up on lg, 6 on xl. Retail caps at 4; wholesale should not. */
export const GRID_COLS =
  "grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6";

export function StyleCard({
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
    <article
      {...plateScopeProps}
      className={cn(
        "group flex h-full flex-col border border-line/15 bg-surface",
        stateRule(line),
        stateWash(line),
      )}
    >
      <div className="relative overflow-hidden bg-surface-hover">
        {/* The name is claimed on click rather than rendered: collection pages
            interleave plates among rows built from the same lines, so a static
            per-product name would collide and the browser would abandon the whole
            transition. See src/lib/line/plate-morph.ts. */}
        <Link
          {...plateProps(product.id)}
          href={`/shop/${product.handle}`}
          onClick={claimPlateMorph}
          className="relative block aspect-[4/5] overflow-hidden"
        >
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
            className="object-cover"
          />
        </Link>
        <SoldOutScrim stock={line.stock} />

        {/* Compare — top right, hairline until active. No heart icons. */}
        <button
          type="button"
          onClick={() => onToggleCompare?.(line)}
          aria-pressed={line.comparing}
          aria-label={line.comparing ? "Remove from compare" : "Add to compare"}
          className={cn(
            "absolute right-0 top-0 z-[3] flex h-8 w-8 items-center justify-center transition-colors duration-200",
            line.comparing
              ? "bg-accent-red text-white"
              : "bg-surface/85 text-content/50 hover:bg-accent-red hover:text-white",
          )}
        >
          <GitCompare className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <CodeChip code={line.code} active={committed} />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-content/40">
            {product.category}
          </span>
        </div>

        <Link
          href={`/shop/${product.handle}`}
          onClick={claimPlateMorph}
          className="group/title mt-2 block"
        >
          <h3 className="line-clamp-2 text-[13px] font-bold leading-tight tracking-[-0.02em] group-hover/title:underline">
            {product.title}
          </h3>
        </Link>

        <SizeRun sizes={line.sizeRun} className="mt-2 text-[10px]" />

        <div className="mt-3 border-t border-line/20 pt-2.5">
          <PriceBlock
            setPrice={line.setPrice}
            perPiece={line.perPiece}
            scale="card"
            struck={soldOut}
          />
        </div>

        {/* Order actions pinned to the bottom so cards align on a ragged grid. */}
        <div className="mt-auto flex items-center gap-1.5 pt-3">
          {soldOut ? (
            <span className="flex h-8 flex-1 items-center justify-center border border-line/20 text-[9px] font-bold uppercase tracking-[0.18em] text-accent-red">
              Sold out
            </span>
          ) : committed ? (
            <SetStepper
              sets={line.sets}
              onChange={(sets) => onSetsChange?.(line, sets)}
              onDemote={() => onDemote?.(line)}
              size="sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => onCommit?.(line)}
              className="flex h-8 flex-1 items-center justify-center border border-content/35 text-[9px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 hover:bg-surface-inverse hover:text-accent-lime"
            >
              Add {COMMIT_DEFAULT_SETS} sets
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleShortlist?.(line)}
            aria-pressed={shortlisted}
            aria-label={shortlisted ? "Remove from saved styles" : "Save style"}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center border transition-colors duration-200",
              shortlisted
                ? "border-accent-lime bg-accent-lime text-on-accent"
                : "border-line/25 text-content/45 hover:border-content",
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}
