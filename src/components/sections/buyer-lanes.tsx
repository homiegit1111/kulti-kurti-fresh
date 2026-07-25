"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { LanePreview, type Lane } from "@/components/sections/lane-preview";
import { LaneMobilePreview } from "@/components/sections/lane-mobile-preview";

const EASE = [0.16, 1, 0.3, 1] as const;

interface BuyerLanesProps {
  lanes: Lane[];
}

export default function BuyerLanes({ lanes }: BuyerLanesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = lanes[activeIndex];
  const reduceMotion = useReducedMotion();

  const headerVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  };

  const panelVariants = {
    hidden: { opacity: 0, scale: reduceMotion ? 1 : 1.04 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
  };

  if (!active) return null;

  return (
    <section id="buying-index" className="bg-surface text-content">
      {/* MOBILE (below lg): a thumb-first snap carousel of the top lines + a
          full-width "open inventory" CTA. Hover-driven index doesn't work on
          touch, so mobile gets its own fast-preview experience. */}
      <div className="lg:hidden">
        <LaneMobilePreview lanes={lanes} inventoryHref="/shop" />
      </div>

      {/* DESKTOP (lg and up): the editorial index list drives the large
          catalogue-plate preview on the right via hover/focus. */}
      <div className="mx-auto hidden max-w-[1600px] lg:grid lg:min-h-[760px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-r border-line/20 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-15%" }}
            className="mb-12 flex items-start justify-between border-b border-line pb-4"
          >
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.28em]">Buying index / 01</p>
              <h2 className="mt-4 max-w-[12ch] text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-6xl">
                Start with the product, not the mood.
              </h2>
            </div>
            <p className="hidden max-w-[24ch] text-right text-xs leading-5 text-content/55 sm:block">
              Hover or tap a line to inspect the actual style attached to it.
            </p>
          </motion.div>

          <motion.div
            variants={listVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-15%" }}
          >
            {lanes.map((lane, index) => (
              <motion.div key={lane.code} variants={rowVariants}>
                <Link
                  href={lane.href}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  // Preview-then-navigate used to be gated on `activeIndex !== index`,
                  // which swallowed the first click. With a mouse that branch is
                  // unreachable (hover already set the index), but a touchscreen
                  // laptop at lg width fires no hover, so every row needed two
                  // taps. Gate on the pointer type instead: a coarse pointer with
                  // no preview yet gets one tap to inspect and a second to open;
                  // a mouse always navigates immediately.
                  onClick={(event) => {
                    const coarse =
                      event.nativeEvent instanceof PointerEvent &&
                      event.nativeEvent.pointerType !== "mouse";
                    if (coarse && activeIndex !== index) {
                      event.preventDefault();
                      setActiveIndex(index);
                    }
                  }}
                  className="group relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-line/20 py-5 sm:grid-cols-[4rem_1fr_auto] sm:py-6"
                >
                  {activeIndex === index && (
                    <motion.span
                      layoutId="buyer-lane-indicator"
                      className="absolute left-[-1px] top-2 bottom-2 w-[3px] bg-accent-red"
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  )}
                  <span className={`text-[10px] font-bold tracking-[0.18em] transition-colors ${activeIndex === index ? "text-accent-red" : "text-content/35"}`}>
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className={`text-xl font-bold leading-tight tracking-[-0.025em] transition-transform duration-300 sm:text-3xl ${activeIndex === index ? "translate-x-2" : "group-hover:translate-x-2"}`}>
                      {lane.title}
                    </h3>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-content/45">
                      {lane.copy} · {lane.detail}
                    </p>
                  </div>
                  <ArrowUpRight className={`h-5 w-5 transition-all ${activeIndex === index ? "rotate-0 text-accent-red" : "rotate-45 text-content/25"}`} />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-8 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
            <span>Pack sizes vary by style</span>
            <Link href="/shop" className="text-content underline decoration-accent-red decoration-2 underline-offset-4">
              View all inventory
            </Link>
          </div>
        </div>

        <motion.div
          variants={panelVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-15%" }}
          className="relative bg-surface-inverse"
        >
          <LanePreview active={active} total={lanes.length} />
        </motion.div>
      </div>
    </section>
  );
}
