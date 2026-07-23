"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** The line-book standard ease (expo-out) — per the design contract. */
export const LB_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Scroll-reveal leaf for the server-rendered lookbook routes.
 *
 * The lookbook index and editorial detail stay RSCs (Sanity fetch + portable
 * text render on the server); this tiny client component wraps sections so
 * they still get the contract entrance — fade + rise on [0.16,1,0.3,1],
 * `whileInView` with `once`, degrading to fade-only under reduced motion.
 */
export function LbReveal({
  children,
  className,
  delay = 0,
  y = 24,
  duration = 0.65,
  scaleFrom,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  /** Optional zoom-settle for imagery (contract: scale 1.035 → 1). */
  scaleFrom?: number;
}) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y, ...(scaleFrom ? { scale: scaleFrom } : {}) };
  const visible = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, ...(scaleFrom ? { scale: 1 } : {}) };

  return (
    <motion.div
      initial={hidden}
      whileInView={visible}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: LB_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
