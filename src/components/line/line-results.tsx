"use client";

/**
 * Results body — the density switch.
 *
 * One list, three renderers, identical actions. This component holds no filter
 * logic and no state: it receives lines already filtered and sorted by
 * applyLineQuery, so what you see is exactly what the URL describes.
 *
 * No entrance animation at ledger density. Tabular data must be legible on
 * arrival; reveal-on-scroll over a price column is a defect, not polish.
 */

import type { StyleLine } from "@/lib/line/contract";
import type { Density } from "@/lib/line/density";
import { cn } from "@/lib/utils";
import type { StyleLineActions } from "./actions";
import { LedgerHead, StyleRow } from "./style-row";
import { StyleCard } from "./style-card";
import { StylePlate } from "./style-plate";

export function LineResults({
  lines,
  density,
  isShortlisted,
  actions,
}: {
  lines: StyleLine[];
  density: Density;
  isShortlisted: (productId: string) => boolean;
  actions: StyleLineActions;
}) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 border border-line/20 px-6 py-10">
        <span className="bg-accent-red px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
          00
        </span>
        <p className="text-sm text-content/60">
          No styles match those filters. Widen the size run or the per-piece band.
        </p>
      </div>
    );
  }

  if (density === "ledger") {
    return (
      <div>
        <LedgerHead />
        <div>
          {lines.map((line) => (
            <StyleRow
              key={line.product.id}
              line={line}
              shortlisted={isShortlisted(line.product.id)}
              {...actions}
            />
          ))}
        </div>
      </div>
    );
  }

  if (density === "grid") {
    return (
      <div
        className={cn(
          "grid gap-x-4 gap-y-6",
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
        )}
      >
        {lines.map((line) => (
          <StyleCard
            key={line.product.id}
            line={line}
            shortlisted={isShortlisted(line.product.id)}
            {...actions}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {lines.map((line) => (
        <StylePlate
          key={line.product.id}
          line={line}
          shortlisted={isShortlisted(line.product.id)}
          {...actions}
        />
      ))}
    </div>
  );
}
