"use client";

/**
 * StylePlate — discovery density. 2–4 styles per screen.
 *
 * The only renderer where imagery leads, and it earns that by carrying the full
 * decision set alongside: size run as chips, per-piece at plate scale, GST
 * bracket, and a full stepper. A buyer who arrives from Instagram can decide
 * here without ever switching density.
 *
 * Imagery is 4:5, never square: kurtis are vertical garments and a square crop
 * cuts the drape. Same rule at every density, only the size changes.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, GitCompare } from "lucide-react";
import {
  COMMIT_DEFAULT_SETS,
  isCommitted,
  isSoldOut,
  type StyleLine,
} from "@/lib/line/contract";
import { GST_CONFIG } from "@/lib/b2b/config";
import { claimPlateMorph, plateProps, plateScopeProps } from "@/lib/line/plate-morph";
import { cn } from "@/lib/utils";
import type { StyleLineActions } from "./actions";
import { PriceBlock } from "./price-block";
import { SetStepper } from "./set-stepper";
import { SizeRun } from "./size-run";
import { CodeChip, SoldOutScrim, stateRule, stateWash } from "./stock-mark";

export function StylePlate({
  line,
  shortlisted = false,
  priority = false,
  onCommit,
  onSetsChange,
  onDemote,
  onToggleShortlist,
  onToggleCompare,
}: {
  line: StyleLine;
  shortlisted?: boolean;
  priority?: boolean;
} & StyleLineActions) {
  const { product } = line;
  const committed = isCommitted(line);
  const soldOut = isSoldOut(line);

  return (
    <article
      {...plateScopeProps}
      className={cn(
        "group flex flex-col border border-line/15 bg-surface sm:flex-row",
        stateRule(line),
        stateWash(line),
      )}
    >
      {/* Plate */}
      <Link
        {...plateProps(product.id)}
        href={`/shop/${product.handle}`}
        onClick={claimPlateMorph}
        className="relative block aspect-[4/5] w-full shrink-0 overflow-hidden bg-surface-hover sm:w-[46%]"
      >
        <Image
          src={product.image}
          alt={product.title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 46vw, 30vw"
          className="object-cover"
        />
        <SoldOutScrim stock={line.stock} />
      </Link>

      {/* Decision column */}
      <div className="flex min-w-0 flex-1 flex-col p-5 lg:p-6">
        <div className="flex items-center gap-2">
          <CodeChip code={line.code} active={committed} />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-content/40">
            {product.category}
          </span>
        </div>

        <Link href={`/shop/${product.handle}`} className="group/title mt-3 block">
          <h3 className="text-xl font-black uppercase leading-[0.95] tracking-[-0.04em] group-hover/title:underline lg:text-2xl">
            {product.title}
          </h3>
        </Link>

        <div className="mt-5 border-t border-line/20 pt-4">
          <PriceBlock
            setPrice={line.setPrice}
            perPiece={line.perPiece}
            scale="plate"
            struck={soldOut}
          />
        </div>

        <div className="mt-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content/40">
            Size run
          </p>
          <SizeRun sizes={line.sizeRun} form="chips" className="mt-2" />
        </div>

        <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-content/35">
          {GST_CONFIG.label} {line.gstRate}% · invoice at dispatch
        </p>

        {/* Order block */}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
          {soldOut ? (
            <span className="flex h-10 flex-1 items-center justify-center border border-line/20 text-[9px] font-bold uppercase tracking-[0.2em] text-accent-red">
              Sold out
            </span>
          ) : committed ? (
            <div className="flex flex-1 items-center gap-3">
              <SetStepper
                sets={line.sets}
                onChange={(sets) => onSetsChange?.(line, sets)}
                onDemote={() => onDemote?.(line)}
                size="md"
              />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-lime">
                On order
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onCommit?.(line)}
              className="flex h-10 flex-1 items-center justify-center gap-2 bg-surface-inverse px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-content-inverse transition-colors duration-200 hover:text-accent-lime"
            >
              Add {COMMIT_DEFAULT_SETS} sets
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleCompare?.(line)}
            aria-pressed={line.comparing}
            aria-label={line.comparing ? "Remove from compare" : "Add to compare"}
            className={cn(
              "flex h-10 w-10 items-center justify-center border transition-colors duration-200",
              line.comparing
                ? "border-accent-red bg-accent-red text-white"
                : "border-line/25 text-content/45 hover:border-accent-red hover:text-accent-red",
            )}
          >
            <GitCompare className="h-3.5 w-3.5" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => onToggleShortlist?.(line)}
            aria-pressed={shortlisted}
            aria-label={shortlisted ? "Remove from saved styles" : "Save style"}
            className={cn(
              "flex h-10 w-10 items-center justify-center border transition-colors duration-200",
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
