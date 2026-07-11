"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Extra delay before the reveal starts, in seconds. */
  delay?: number;
  /** Distance in px the element rises from. */
  y?: number;
  className?: string;
  /** When true, children are staggered (each direct Reveal.Item child animates in sequence). */
  as?: "div" | "section" | "li" | "span";
}

/**
 * Scroll-triggered reveal that works in every browser.
 *
 * The page's original scroll reveals relied on CSS `animation-timeline: view()`,
 * which only animates in Chromium — Firefox/Safari rendered the lower page flat.
 * This uses framer-motion's `whileInView` so the reveal is universal, and it
 * degrades to opacity-only when the user prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 40,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 1.15, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * Staggered container: direct children wrapped in <RevealItem> animate in
 * sequence as the group scrolls into view.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  delayChildren = 0.05,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  as?: "div" | "section" | "ul";
}) {
  const Tag = motion[as];
  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
  },
};

const itemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag variants={reduce ? itemVariantsReduced : itemVariants} className={className}>
      {children}
    </Tag>
  );
}
