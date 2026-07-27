"use client";

/**
 * Reseller margin estimator — ruled ledger rows on cream paper, no icon box,
 * no decoration. Every figure derives from the wholesale per-piece rate and the
 * buyer's own resale input; nothing is asserted the math cannot compute, and
 * the resale multiple it opens on is an assumption about the buyer's shop, so
 * the panel says "estimate" in plain words.
 *
 * PDP-only surface: it speaks the cover's palette (cream paper, brown-black
 * ink, one vermilion) so it reads as part of the same printed sheet.
 */

import { useMemo, useState } from "react";
import { B2B_CONFIG, TYPICAL_RESALE_MULTIPLIER } from "@/lib/b2b/config";
import { formatPrice } from "@/lib/commerce/catalog";

export function ResellerMarginEstimator({
  wholesalePerPiece,
  defaultResalePrice,
}: {
  wholesalePerPiece: number;
  defaultResalePrice?: number;
}) {
  const [resalePrice, setResalePrice] = useState(
    defaultResalePrice ??
      Math.round(wholesalePerPiece * TYPICAL_RESALE_MULTIPLIER),
  );

  const margin = useMemo(() => {
    const perPiece = Math.max(0, resalePrice - wholesalePerPiece);
    return {
      perPiece,
      perSet: perPiece * B2B_CONFIG.setSize,
      percent: resalePrice > 0 ? Math.round((perPiece / resalePrice) * 100) : 0,
    };
  }, [resalePrice, wholesalePerPiece]);

  return (
    <div className="mt-4 border border-home-rule bg-home-ground">
      <div className="border-b border-home-rule px-4 py-3.5">
        <label
          className="font-trade text-[10px] tracking-[0.16em] text-home-ink-mute"
          htmlFor="resale-price"
        >
          Your resale price a piece
        </label>
        <input
          id="resale-price"
          type="number"
          min={0}
          inputMode="numeric"
          value={resalePrice}
          onChange={(event) => setResalePrice(Number(event.target.value) || 0)}
          className="mt-1 h-11 w-full border-0 border-b border-home-rule bg-transparent px-0 text-[18px] font-semibold tabular-nums text-home-ink outline-none transition-colors duration-200 focus:border-home-ink"
        />
      </div>
      <EstimatorRow
        label="You pay a piece"
        value={formatPrice(wholesalePerPiece)}
      />
      <EstimatorRow label="You keep a piece" value={formatPrice(margin.perPiece)} accent />
      <EstimatorRow
        label={`You keep on a set of ${B2B_CONFIG.setSize}`}
        value={formatPrice(margin.perSet)}
      />
      <EstimatorRow
        label="Share of your resale price"
        value={`${margin.percent}%`}
        muted
      />
      <p className="px-4 py-3 text-[11px] leading-[1.6] text-home-ink-mute">
        An estimate — your own market sets the final resale price.
      </p>
    </div>
  );
}

function EstimatorRow({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-home-rule px-4 py-3">
      <span className="font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
        {label}
      </span>
      <span
        className={
          accent
            ? "text-[15px] font-semibold tabular-nums text-home-vermilion"
            : muted
              ? "text-[15px] font-semibold tabular-nums text-home-ink-soft"
              : "text-[15px] font-semibold tabular-nums text-home-ink"
        }
      >
        {value}
      </span>
    </div>
  );
}
