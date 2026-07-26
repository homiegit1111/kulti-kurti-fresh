"use client";

/**
 * PriceBlock — per-piece leads, set price follows.
 *
 * The inversion is deliberate: per-piece is the number a wholesale buyer
 * converts to MRP, so it gets the largest numeric slot on every density. Set
 * price is an artifact of B2B_CONFIG.setSize and sits behind it.
 *
 * Tabular digits everywhere so columns align down a ledger.
 */

import { formatPrice } from "@/lib/commerce/catalog";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { cn } from "@/lib/utils";

type Scale = "plate" | "card" | "row";

const PER_PIECE: Record<Scale, string> = {
  plate: "text-2xl",
  card: "text-base",
  row: "text-sm",
};

const SET: Record<Scale, string> = {
  plate: "text-sm",
  card: "text-xs",
  row: "text-xs",
};

export function PriceBlock({
  setPrice,
  perPiece,
  scale = "row",
  align = "left",
  struck = false,
  className,
}: {
  setPrice: number;
  perPiece: number;
  scale?: Scale;
  align?: "left" | "right";
  /** Sold-out styles keep their price visible but struck. */
  struck?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        align === "right" ? "items-end text-right" : "items-start",
        className,
      )}
    >
      <p
        className={cn(
          PER_PIECE[scale],
          "font-black leading-none tabular-nums tracking-[-0.035em] text-content",
          struck && "line-through decoration-1 opacity-45",
        )}
      >
        {formatPrice(perPiece)}
        <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.18em] text-content/45">
          /pc
        </span>
      </p>
      <p
        className={cn(
          SET[scale],
          "mt-1 font-semibold leading-none tabular-nums text-content/55",
          struck && "line-through decoration-1 opacity-45",
        )}
      >
        {formatPrice(setPrice)}
        <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.16em] text-content/35">
          / set of {B2B_CONFIG.setSize}
        </span>
      </p>
    </div>
  );
}
