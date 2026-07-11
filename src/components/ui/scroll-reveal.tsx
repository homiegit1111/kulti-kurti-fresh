"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";
import {
  DURATION,
  EASE_OUT_EXPO,
  VIEWPORT_ONCE,
  fadeUp,
  staggerContainer,
  tween,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay in seconds */
  delay?: number;
  /** y offset when hidden — keep small for premium restraint */
  y?: number;
  /** once: true by default via VIEWPORT_ONCE */
  amount?: number;
  as?: "div" | "header" | "section" | "li" | "article" | "ul";
} & Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "variants">;

/**
 * Lightweight scroll-in reveal. Opacity + translateY only.
 * No blur, no scale, no layout shift after settle.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 16,
  amount,
  as = "div",
  ...rest
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] as typeof motion.div;

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: tween(DURATION.base, delay, EASE_OUT_EXPO),
    },
  };

  return (
    <Component
      className={cn("transform-gpu", className)}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={
        amount != null
          ? { ...VIEWPORT_ONCE, amount }
          : VIEWPORT_ONCE
      }
      {...rest}
    >
      {children}
    </Component>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  as?: "div" | "ul" | "ol";
};

/** Parent that staggers ScrollReveal children (or motion children with variants) */
export function ScrollStagger({
  children,
  className,
  stagger = 0.06,
  delayChildren = 0.04,
  as = "div",
}: StaggerProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] as typeof motion.div;

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Component
      className={cn("transform-gpu", className)}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
    >
      {children}
    </Component>
  );
}

/** Child item for ScrollStagger — use inside ScrollStagger */
export function ScrollStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={cn("transform-gpu", className)}
      variants={fadeUp}
    >
      {children}
    </motion.div>
  );
}
