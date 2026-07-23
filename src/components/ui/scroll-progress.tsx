"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";

/**
 * Reading-position hairline — a 2px lime rail pinned to the very top of the
 * viewport that fills as you scroll. Quiet on arrival (scaleX 0), pure GPU
 * transform, and absent entirely under reduced motion. Complements the
 * theme-switch rail (theme-progress-bar), which only appears during theme
 * transitions.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    restDelta: 0.001,
  });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-accent-lime"
      style={{ scaleX }}
    />
  );
}
