"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MessageCircle } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { useRef, useMemo, useState, useEffect } from "react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getStyleCode } from "@/lib/b2b/style-code";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { formatPrice } from "@/lib/commerce/catalog";
import type { CommerceProduct } from "@/lib/commerce/types";

/** House ease — expo out. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Static film-grain tile, inlined so the hero is self-contained. */
const GRAIN_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E")`;

interface B2BHeroProps {
  products: CommerceProduct[];
  heroProduct: CommerceProduct | null;
  heroStyleCode: string;
  heroSizeRun: string[];
  catalogRequestUrl: string;
}

/**
 * HERO — rebuilt from scratch.
 *
 * The old hero stacked three words ("NEW / INDIAN / WHOLESALE") behind a
 * plate carousel. It read as a template. This one is a single editorial
 * stage:
 *
 *   LEFT  — a running index column (season, count, origin) + the headline.
 *           The headline is the brand claim, set in serif italic against
 *           black sans. One saffron underline, no outlines, no strokes.
 *   RIGHT — one product plate. Not a carousel: a curated still, with the
 *           style's facts printed on its frame like a museum placard.
 *           Crossfades between four styles on a slow timer.
 *   BASE  — a facts rail: MOQ, set, size run, rate. One hairline strip.
 *
 * Everything a first-time wholesale buyer needs to trust the site is in the
 * first viewport: what it is, what it costs, how to act.
 */
export function B2BHero({
  products,
  heroProduct,
  heroStyleCode,
  heroSizeRun,
  catalogRequestUrl,
}: B2BHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const plateY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -48]);
  const indexY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 24]);

  const plates = useMemo(() => {
    const seen = new Set<string>();
    return [heroProduct, ...products]
      .filter((p): p is CommerceProduct => {
        if (!p || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .slice(0, 4);
  }, [heroProduct, products]);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const SLIDE_MS = 6000;

  useEffect(() => {
    if (reduce || paused || plates.length <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % plates.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [reduce, paused, plates.length]);

  const current = plates[active] ?? heroProduct;
  const setPrice = current ? current.salePrice ?? current.price : null;
  const perPiece = setPrice !== null ? getPerPiecePrice(setPrice) : null;
  const styleCode = current ? getStyleCode(current) : heroStyleCode;
  const sizeRun = (heroSizeRun.length ? heroSizeRun : [...B2B_CONFIG.sizeRatio]).join(" · ");

  const enter = (delay: number) =>
    reduce
      ? { duration: 0.4, delay: 0 }
      : { duration: 0.9, delay, ease: EASE };

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] overflow-hidden bg-surface-inverse text-content-inverse"
    >
      {/* grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40 opacity-[0.04]"
        style={{ backgroundImage: GRAIN_URI, backgroundSize: "180px 180px" }}
      />

      {/* giant ghost glyph, behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[6vw] left-0 z-0 select-none font-serif text-[38vw] italic leading-[0.7] text-content-inverse/[0.035]"
      >
        R
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-[1700px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── LEFT: index + headline ─────────────────────────────────── */}
        <motion.div
          style={{ y: indexY }}
          className="flex flex-col justify-between px-5 pb-10 pt-28 sm:px-8 lg:px-12 lg:pt-32 xl:px-16"
        >
          {/* index row */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={enter(0.05)}
            className="flex items-center justify-between border-b border-content-inverse/15 pb-4 text-[9px] font-bold uppercase tracking-[0.3em] text-content-inverse/50"
          >
            <span>Wholesale Line Book</span>
            <span className="hidden sm:inline">Vol. 04 — India</span>
            <span className="text-accent-lime">2026</span>
          </motion.div>

          {/* headline */}
          <div className="py-10 lg:py-0">
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: reduce
                    ? { staggerChildren: 0 }
                    : { staggerChildren: 0.12, delayChildren: 0.15 },
                },
              }}
              className="select-none"
            >
              <motion.span
                variants={{
                  hidden: { opacity: 0, y: reduce ? 0 : 40 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
                }}
                className="block font-sans text-[clamp(2.6rem,6vw,5.2rem)] font-black uppercase leading-[0.88] tracking-[-0.05em]"
              >
                Kurtis for
              </motion.span>
              <motion.span
                variants={{
                  hidden: { opacity: 0, y: reduce ? 0 : 40 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
                }}
                className="block font-serif text-[clamp(3rem,7.5vw,6.8rem)] italic leading-[0.92] tracking-[-0.02em] text-accent-lime"
              >
                the trade,
              </motion.span>
              <motion.span
                variants={{
                  hidden: { opacity: 0, y: reduce ? 0 : 40 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
                }}
                className="block font-sans text-[clamp(2.6rem,6vw,5.2rem)] font-black uppercase leading-[0.88] tracking-[-0.05em]"
              >
                priced to move.
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enter(0.55)}
              className="mt-7 max-w-[38ch] text-[13px] leading-6 text-content-inverse/60"
            >
              A working wholesale catalogue for boutiques, resellers and online
              sellers. Actual size availability, maker-direct set pricing, and
              WhatsApp-first ordering. No retail noise.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enter(0.68)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/line"
                className="group flex h-12 items-center gap-3 bg-accent-lime px-6 text-[10px] font-black uppercase tracking-[0.22em] text-on-accent transition-colors hover:bg-white"
              >
                Open the line
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href={catalogRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-12 items-center gap-3 border border-content-inverse/30 px-6 text-[10px] font-black uppercase tracking-[0.22em] text-content-inverse transition-colors hover:border-accent-lime hover:text-accent-lime"
              >
                <MessageCircle className="h-4 w-4" />
                Catalogue on WhatsApp
              </a>
            </motion.div>
          </div>

          {/* facts rail */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={enter(0.85)}
            className="grid grid-cols-2 gap-px border border-content-inverse/15 bg-content-inverse/15 sm:grid-cols-4"
          >
            {[
              { k: "Minimum", v: `${B2B_CONFIG.minimumOrderSets} sets` },
              { k: "One set", v: `${B2B_CONFIG.setSize} pieces` },
              { k: "Size run", v: sizeRun },
              { k: "Rate", v: "Maker-direct" },
            ].map((f) => (
              <div key={f.k} className="bg-surface-inverse px-4 py-3.5">
                <dt className="text-[8px] font-bold uppercase tracking-[0.28em] text-content-inverse/40">
                  {f.k}
                </dt>
                <dd className="mt-1 text-[13px] font-black uppercase tracking-[-0.01em] tabular-nums">
                  {f.v}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* ── RIGHT: product plate ───────────────────────────────────── */}
        <motion.div
          style={{ y: plateY }}
          className="relative flex items-center px-5 pb-14 sm:px-8 lg:px-10 lg:pb-0 xl:px-14"
        >
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={enter(0.3)}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative w-full"
          >
            {/* frame */}
            <div className="hero-plate relative border border-content-inverse/20 bg-surface-2 p-2.5">
              <span className="hero-plate-mark hero-plate-mark--tl" aria-hidden />
              <span className="hero-plate-mark hero-plate-mark--tr" aria-hidden />
              <span className="hero-plate-mark hero-plate-mark--bl" aria-hidden />
              <span className="hero-plate-mark hero-plate-mark--br" aria-hidden />

              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-hover">
                {/* crossfading stack — first is LCP */}
                <AnimatePresence mode="sync">
                  {plates.map((p, i) =>
                    i === active ? (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: reduce ? 1 : 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduce ? 0.3 : 1.2, ease: EASE }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={p.image}
                          alt={i === 0 ? (heroProduct?.title ?? "Rangat Pehnawa collection") : p.title}
                          fill
                          priority={i === 0}
                          fetchPriority={i === 0 ? "high" : "auto"}
                          className="object-cover"
                          sizes="(max-width: 1024px) 90vw, 44vw"
                        />
                      </motion.div>
                    ) : null,
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                <div className="hero-plate-sheen absolute inset-0" aria-hidden />

                {/* progress rule */}
                <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-white/10">
                  <motion.div
                    key={paused || reduce ? "p" : active}
                    className="h-full bg-accent-lime"
                    initial={{ width: paused || reduce ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: paused || reduce ? 0 : SLIDE_MS / 1000,
                      ease: "linear",
                    }}
                  />
                </div>

                {/* style code chip */}
                <div className="absolute left-3.5 top-3.5 z-10 flex items-center gap-2">
                  <span className="bg-accent-lime px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-on-accent">
                    {styleCode}
                  </span>
                  <span className="border border-content-inverse/25 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-content-inverse/75">
                    Set of {B2B_CONFIG.setSize}
                  </span>
                </div>

                {/* plate counter */}
                <span className="absolute right-3.5 top-3.5 z-10 text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/50">
                  {String(active + 1).padStart(2, "0")} / {String(plates.length).padStart(2, "0")}
                </span>

                {/* placard */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current?.id ?? "none"}
                    initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-4 sm:p-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold uppercase tracking-[0.26em] text-content-inverse/50">
                        {current?.category ?? "New arrival"}
                      </p>
                      <h2 className="mt-1 truncate text-lg font-black uppercase leading-none tracking-[-0.02em] text-content-inverse sm:text-xl">
                        {current?.title ?? "New arrival"}
                      </h2>
                    </div>
                    {setPrice !== null && (
                      <div className="shrink-0 bg-surface-inverse px-3 py-2 text-right ring-1 ring-content-inverse/20">
                        <p className="text-lg font-black leading-none tracking-[-0.02em] text-accent-lime">
                          {formatPrice(setPrice)}
                        </p>
                        {perPiece !== null && (
                          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-content-inverse/50">
                            {formatPrice(perPiece)}/pc
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* under-frame link */}
            {current && (
              <Link
                href={`/shop/${current.handle}`}
                className="group mt-3 flex items-center justify-between border-b border-content-inverse/15 pb-3 text-[9px] font-bold uppercase tracking-[0.26em] text-content-inverse/55 transition-colors hover:text-accent-lime"
              >
                <span>Inspect this style</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* scroll cue */}
      <motion.a
        href="#the-line"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={enter(1.1)}
        className="absolute bottom-6 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 text-[8px] font-bold uppercase tracking-[0.3em] text-content-inverse/40 transition-colors hover:text-accent-lime lg:flex"
      >
        The line <ArrowDown className="h-3 w-3" />
      </motion.a>
    </section>
  );
}
