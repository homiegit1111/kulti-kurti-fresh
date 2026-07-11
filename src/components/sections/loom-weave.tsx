"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Signature — a loom being threaded on page load. Warp (vertical) threads
 * drop first, then the weft (horizontal) shuttle passes across. Compositor
 * only: scaleY/scaleX from an anchored origin, no layout or color animation.
 *
 * Plain threads use --foreground so they flip indigo (light) → raw-silk
 * (dark) automatically; a sparse few carry a dye accent as a deliberate slub.
 * This is the ONE bold motion moment — everything else on the page stays still.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const WARP = 15;
const WEFT = 11;

const warpAccent = (i: number): string | null =>
  i === 4 ? "var(--madder)" : i === 10 ? "var(--sage)" : null;
const weftAccent = (i: number): string | null =>
  i === 3 ? "var(--turmeric)" : null;

export function LoomWeave({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      style={{
        WebkitMaskImage:
          "radial-gradient(120% 100% at 50% 0%, #000 40%, transparent 100%)",
        maskImage:
          "radial-gradient(120% 100% at 50% 0%, #000 40%, transparent 100%)",
      }}
    >
      {Array.from({ length: WARP }).map((_, i) => {
        const accent = warpAccent(i);
        return (
          <motion.span
            key={`warp-${i}`}
            className="absolute top-0 h-full w-px origin-top transform-gpu"
            style={{
              left: `${(i / (WARP - 1)) * 100}%`,
              backgroundColor: accent ?? "hsl(var(--foreground))",
              opacity: accent ? 0.5 : 0.13,
            }}
            initial={reduce ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.7, delay: reduce ? 0 : i * 0.03, ease: EASE }}
          />
        );
      })}

      {Array.from({ length: WEFT }).map((_, i) => {
        const accent = weftAccent(i);
        return (
          <motion.span
            key={`weft-${i}`}
            className="absolute left-0 h-px w-full origin-left transform-gpu"
            style={{
              top: `${(i / (WEFT - 1)) * 100}%`,
              backgroundColor: accent ?? "hsl(var(--foreground))",
              opacity: accent ? 0.5 : 0.12,
            }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: 0.85,
              delay: reduce ? 0 : 0.45 + i * 0.04,
              ease: EASE,
            }}
          />
        );
      })}
    </div>
  );
}
