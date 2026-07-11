import type { Transition, Variants } from "framer-motion";

/**
 * Premium motion tokens — compositor-friendly only (opacity + transform).
 * No layout, blur, or color changes. Respects reduced-motion via callers.
 */

/** Apple / luxury-site style ease-out */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
/** Slightly softer settle for cards */
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.4,
  base: 0.55,
  slow: 0.7,
  enter: 0.65,
} as const;

/** Shared whileInView viewport — triggers slightly early, once */
export const VIEWPORT_ONCE = {
  once: true,
  margin: "0px 0px 10% 0px",
  amount: 0.04,
} as const;

export const VIEWPORT_EARLY = {
  once: true,
  margin: "0px 0px 10% 0px",
  amount: 0.04,
} as const;

export function tween(
  duration: number = DURATION.base,
  delay: number = 0,
  ease: readonly [number, number, number, number] = EASE_OUT_EXPO,
): Transition {
  return { duration, delay, ease: [...ease] };
}

/** Fade + slight rise — default section / card reveal */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween(DURATION.base),
  },
};

/** Softer rise for dense grids */
export const fadeUpSoft: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween(DURATION.base, 0, EASE_OUT_QUINT),
  },
};

/** Opacity only — safest for text-heavy blocks */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: tween(DURATION.slow),
  },
};

/** Parent for staggered children */
export function staggerContainer(
  stagger = 0.06,
  delayChildren = 0.04,
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
  };
}

/** Hero load entrance (not scroll) — left column / stage */
export const heroEnter: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween(DURATION.enter, 0, EASE_OUT_EXPO),
  },
};

export function heroStagger(stagger = 0.07, delayChildren = 0.06): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}
