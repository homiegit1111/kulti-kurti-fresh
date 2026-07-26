"use client";

/**
 * Size run — the literal pack a set ships.
 *
 * Read from product.sizes, never from B2B_CONFIG.sizeRatio: the homepage copy
 * already promises "pack availability is taken from each style, not a universal
 * ratio", so rendering the global ratio here would contradict it.
 *
 * Two forms: chips (plate) and inline (card/row/ledger column).
 */

import { cn } from "@/lib/utils";

export function SizeRun({
  sizes,
  form = "inline",
  className,
}: {
  sizes: string[];
  form?: "inline" | "chips";
  className?: string;
}) {
  if (!sizes.length) return null;

  if (form === "chips") {
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        {sizes.map((size) => (
          <span
            key={size}
            className="border border-line/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-content/70"
          >
            {size}
          </span>
        ))}
      </div>
    );
  }

  return (
    <p
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.12em] text-content/60",
        className,
      )}
    >
      {sizes.join(" / ")}
    </p>
  );
}
