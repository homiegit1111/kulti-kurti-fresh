"use client";

/**
 * §1.7 — SetBlocks: the site's ONLY MOQ meter (replaces moq-progress.tsx
 * everywhere). Four discrete square blocks fed exclusively by `useTray()`
 * totals. Never vermilion in any non-error state; fill is a 150ms
 * background/opacity swap — discrete units don't slide (§1.6).
 */

import { useTray } from "@/lib/line/tray-context";
import { cn } from "@/lib/utils";

/**
 * §1.7 — discrete MOQ gauge. `md` = console meter with the tabular caption
 * `"{totalSets} of {moqTarget} sets · cart-wide"`; `sm` = 4×6px nav
 * mini-gauge (caption goes screen-reader-only). Must render inside
 * `TrayProvider`.
 */
export function SetBlocks({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const { totals } = useTray();
  const { totalSets, moqMet, setsToMoq, moqTarget } = totals;
  const filled = Math.min(totalSets, moqTarget);
  const caption = `${totalSets} of ${moqTarget} sets · across your order`;

  return (
    <div className={cn("inline-flex flex-col", size === "md" && "gap-1.5", className)}>
      <div
        role="img"
        aria-label={
          moqMet
            ? `Minimum met — ${caption}`
            : `${caption} — ${setsToMoq} ${setsToMoq === 1 ? "set" : "sets"} to minimum`
        }
        className={cn("flex items-center", size === "sm" ? "gap-0.5" : "gap-1")}
      >
        {Array.from({ length: moqTarget }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              size === "sm" ? "h-1.5 w-1.5" : "h-4 w-4",
              "motion-safe:transition-[background-color,border-color,opacity] motion-safe:duration-150",
              index < filled
                ? "bg-accent-lime"
                : "border border-line bg-transparent",
            )}
          />
        ))}
      </div>
      {size === "md" && (
        <p className="ledger text-[9px] font-bold uppercase tracking-[0.16em] text-content/55">
          {caption}
        </p>
      )}
    </div>
  );
}
