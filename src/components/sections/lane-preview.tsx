"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ─── shared constants ────────────────────────────────────────────────────────

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── types ───────────────────────────────────────────────────────────────────

export interface Lane {
  title: string;   // e.g. "Sage Chanderi Kurti"
  copy: string;    // category, e.g. "Kurtis"
  detail: string;  // e.g. "XS/S/M/L/XL pack"
  code: string;    // style code, e.g. "RP-042"
  href: string;    // product link
  image: string;   // product image src (next/image fill)
  price: string;   // pre-formatted set price, e.g. "₹3,499"
  perPiece: string; // pre-formatted per-piece, e.g. "₹875"
  index: number;
}

// ─── component ───────────────────────────────────────────────────────────────

export function LanePreview({ active, total }: { active: Lane; total: number }) {
  const reduced = useReducedMotion();

  // Plate index stamp: "01 / 05"
  const plateLabel = `${String(active.index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  return (
    // Root: fills the parent column (parent is responsible for lg:block visibility)
    <div className="relative h-full w-full min-h-[620px] bg-surface-inverse overflow-hidden">

      {/* ── Linebook grid backdrop — same catalogue identity as the hero ── */}
      <div className="linebook-grid absolute inset-0" aria-hidden />

      {/* ── Outer frame: the "printing paper" margin around the plate ── */}
      <div className="relative z-10 h-full w-full flex flex-col p-6 lg:p-8 gap-6">

        {/* ── Top label row ── */}
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/55">
            Buying index · Preview
          </p>
          {/* Red plate-number stamp — catalogue identity marker.
              Square, not a circle: the contract allows no rounded corners. */}
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 bg-accent-red"
              aria-hidden
            />
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-accent-red">
              Plate {plateLabel}
            </span>
          </span>
        </div>

        {/* ── AnimatePresence keyed on active.code: crossfade the whole plate ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.code}
            initial={{ opacity: 0, ...(reduced ? {} : { scale: 1.04 }) }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, ...(reduced ? {} : { scale: 0.97 }) }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex flex-col flex-1 gap-5"
          >

            {/* ── Image plate: framed, crop-marked, with inner vignette + sheen ── */}
            <div
              // Plate surface — same treatment as hero-plate but fills the column
              className="hero-plate group relative flex-1 bg-surface-2 p-2 cursor-pointer"
              style={{ minHeight: 0 }}
            >
              {/* Registration crop marks (reuse global CSS classes) */}
              <span className="hero-plate-mark hero-plate-mark--tl" aria-hidden />
              <span className="hero-plate-mark hero-plate-mark--tr" aria-hidden />
              <span className="hero-plate-mark hero-plate-mark--bl" aria-hidden />
              <span className="hero-plate-mark hero-plate-mark--br" aria-hidden />

              {/* Image well */}
              <div className="relative h-full w-full overflow-hidden bg-surface-hover">
                <Image
                  src={active.image}
                  alt={active.title}
                  fill
                  sizes="(max-width: 1024px) 90vw, 44vw"
                  className={[
                    "object-cover object-top",
                    // Slow scale on hover — disabled when reduced motion is on
                    reduced
                      ? ""
                      : "transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]",
                  ].join(" ")}
                />

                {/* Vignette: darkens edges so type overlays stay legible */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20"
                  aria-hidden
                />

                {/* Slow sheen sweep (reuses global keyframe animation) */}
                <div className="hero-plate-sheen absolute inset-0" aria-hidden />

                {/* ── Style code chip: lime chip at top-left ── */}
                <motion.div
                  initial={{ opacity: 0, x: reduced ? 0 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
                  className="absolute top-3 left-3 z-10 flex items-center gap-2"
                >
                  <span className="bg-accent-lime px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-on-accent">
                    {active.code}
                  </span>
                  {/*
                    The pulse dot that used to sit here claimed "live / in
                    stock". The catalog cannot support that: availableForSale is
                    absent on every mock product, so only sold-out is ever
                    provable. It also used rounded-full, which the contract
                    forbids. The pack contents are a fact we do hold, so the
                    chip states that instead of animating an assertion.
                  */}
                  <span className="border border-content-inverse/25 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-content-inverse/70">
                    {active.detail}
                  </span>
                </motion.div>

                {/* ── Thin lime rule at the base of the image ── */}
                <motion.div
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-lime/60 z-10"
                  aria-hidden
                  style={{ transformOrigin: "left" }}
                />
              </div>
            </div>

            {/* ── Caption block: museum placard ── */}
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
              className="flex flex-col gap-4"
            >
              {/* Top row: category + pack detail micro-labels */}
              <div className="flex items-center gap-4 border-t border-content-inverse/15 pt-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/55">
                  {active.copy}
                </p>
                <span className="w-px h-3 bg-content-inverse/20" aria-hidden />
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/55">
                  {active.detail}
                </p>
              </div>

              {/* Title: big, confident, editorial — the collection name */}
              <h2 className="font-sans font-black uppercase leading-[0.9] tracking-[-0.04em] text-content-inverse text-[clamp(1.6rem,3.2vw,2.5rem)]">
                {active.title}
              </h2>

              {/* Price row + CTA on the same baseline */}
              <div className="flex items-end justify-between gap-4">

                {/* Price block */}
                <div className="flex flex-col gap-0.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/45">
                    Set price
                  </p>
                  <p className="font-sans font-black text-content-inverse text-[clamp(1.4rem,2.8vw,2rem)] leading-none tracking-[-0.03em]">
                    {active.price}
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-inverse/45">
                      {active.perPiece}/pc
                    </span>
                  </p>
                </div>

                {/* CTA button: lime fill, ink text — matches hero button style */}
                <Link
                  href={active.href}
                  className="group flex h-11 shrink-0 items-center gap-3 bg-accent-lime px-5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent transition-colors hover:bg-white"
                >
                  Inspect style
                  <ArrowUpRight
                    className={[
                      "h-3.5 w-3.5",
                      reduced ? "" : "transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
                    ].join(" ")}
                    aria-hidden
                  />
                </Link>
              </div>
            </motion.div>

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
