"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, MoveRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface Lane {
  title: string;    // "Sage Chanderi Kurti"
  copy: string;     // category, "Kurtis"
  detail: string;   // "XS/S/M/L/XL pack"
  code: string;     // "RP-042"
  href: string;     // product link
  image: string;    // product image src
  price: string;    // pre-formatted set price "₹3,499"
  perPiece: string; // pre-formatted per-piece "₹875"
  index: number;
}

export function LaneMobilePreview({
  lanes,
  inventoryHref,
}: {
  lanes: Lane[];
  inventoryHref: string;
}) {
  const reduceMotion = useReducedMotion();

  // ── Carousel position ──────────────────────────────────────────────────────
  // The dots previously hardcoded `i === 0`, so the first one stayed lit no
  // matter where the rail was scrolled — decoration that actively misreported
  // position. Deriving the index from real scroll offset makes them an
  // instrument. Measured off the first card's actual offsetWidth + the computed
  // flex gap rather than a hardcoded card width, so it survives a change to
  // `w-[78%]` or `gap-4`. rAF-throttled: scroll fires far more often than the
  // dots can meaningfully change.
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef(0);

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const first = rail.firstElementChild as HTMLElement | null;
    if (!first) return;
    const gap = parseFloat(getComputedStyle(rail).columnGap || "0") || 0;
    const stride = first.offsetWidth + gap;
    if (stride <= 0) return;
    const raw = Math.round(rail.scrollLeft / stride);
    setActiveIndex(Math.max(0, Math.min(lanes.length - 1, raw)));
  }, [lanes.length]);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (!lanes.length) return null;

  return (
    <section
      className="bg-surface text-content pb-10 pt-8"
      aria-label="Buying index — top collections"
    >
      {/* ── Section header ── */}
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12%" }}
        transition={{ duration: 0.6, ease: EASE }}
        className="px-4 mb-6"
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
          Buying index / 01
        </p>
        <h2 className="mt-2 text-[2rem] font-black uppercase leading-[0.88] tracking-[-0.04em]">
          Swipe the<br />top five.
        </h2>
        {/* drag hint */}
        <p className="mt-2.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
          <MoveRight className="h-3 w-3" aria-hidden />
          Drag to explore
        </p>
      </motion.div>

      {/* ── Snap carousel ── */}
      <div
        ref={railRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4"
        role="list"
        aria-label="Collection cards"
      >
        {lanes.map((lane, i) => (
          <motion.div
            key={lane.code}
            role="listitem"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-12%" }}
            transition={{
              duration: 0.55,
              ease: EASE,
              delay: reduceMotion ? 0 : i * 0.07,
            }}
            className="snap-start shrink-0 w-[78%] max-w-[300px]"
          >
            <Link
              href={lane.href}
              className="group block bg-[#292a24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lime"
              aria-label={`${lane.title} — ${lane.price} set, ${lane.perPiece}/pc`}
            >
              {/* ── Image well ── */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1c1d18]">
                <Image
                  src={lane.image}
                  alt={lane.title}
                  fill
                  sizes="78vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-focus-within:scale-[1.04] group-active:scale-[1.04]"
                />

                {/* bottom gradient for legibility */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-white/5"
                  aria-hidden
                />

                {/* ── top row: plate index + code chip ── */}
                <div
                  className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/65 via-black/20 to-transparent px-3 pt-3 pb-8"
                  aria-hidden
                >
                  {/* plate counter — only on first card for context */}
                  <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-content-inverse/55">
                    {String(i + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(lanes.length).padStart(2, "0")}
                  </span>

                  {/* lime style-code chip */}
                  <span className="bg-accent-lime px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-on-accent">
                    {lane.code}
                  </span>
                </div>

                {/* ── bottom: price anchored in the image ── */}
                <div className="absolute bottom-0 right-0 bg-surface-inverse px-3 py-2 text-right">
                  <p className="text-base font-black leading-none tracking-[-0.02em] text-accent-lime">
                    {lane.price}
                  </p>
                  <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-content-inverse/50">
                    {lane.perPiece}&thinsp;/pc
                  </p>
                </div>
              </div>

              {/* ── Card body ── */}
              <div className="flex items-start justify-between gap-2 px-3 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black uppercase leading-[0.9] tracking-[-0.03em] text-content-inverse">
                    {lane.title}
                  </h3>
                  <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-content-inverse/40">
                    {lane.copy}&thinsp;·&thinsp;{lane.detail}
                  </p>
                </div>

                {/* affordance arrow */}
                <ArrowUpRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent-lime/60 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </div>
            </Link>
          </motion.div>
        ))}

        {/* ── Trailing spacer so last card doesn't hug the edge ── */}
        <div className="shrink-0 w-4" aria-hidden />
      </div>

      {/* ── Progress dots ── */}
      <div
        className="mt-4 flex justify-center gap-1.5 px-4"
        aria-hidden
      >
        {lanes.map((lane, i) => (
          <span
            key={lane.code}
            className={`block h-[3px] rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-5 bg-accent-red"
                : "w-1.5 bg-line/20"
            }`}
          />
        ))}
      </div>

      {/* ── Primary CTA: full-width inventory button ── */}
      <div className="mt-7 px-4">
        <Link
          href={inventoryHref}
          className="group flex min-h-[52px] w-full items-center justify-between bg-accent-lime px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-on-accent transition-colors active:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line"
        >
          <span>Open full inventory</span>
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </Link>

        {/* footnote */}
        <p className="mt-3 text-[8px] font-bold uppercase tracking-[0.2em] text-content/35">
          Pack sizes vary by style
        </p>
      </div>
    </section>
  );
}
