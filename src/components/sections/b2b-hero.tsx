"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, MessageCircle } from "lucide-react";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import { useRef, useMemo, useState, useEffect } from "react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getStyleCode } from "@/lib/b2b/style-code";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { formatPrice } from "@/lib/commerce/catalog";
import type { CommerceProduct } from "@/lib/commerce/types";

interface B2BHeroProps {
  products: CommerceProduct[];
  heroProduct: CommerceProduct | null;
  heroStyleCode: string;
  heroSizeRun: string[];
  catalogRequestUrl: string;
}

export function B2BHero({
  products,
  heroProduct,
  heroStyleCode,
  heroSizeRun,
  catalogRequestUrl,
}: B2BHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Foreground plate recedes UP as the hero scrolls away — desktop only.
  const primaryY = useTransform(scrollYProgress, [0, 1], [0, -64]);
  const secondaryY = useTransform(scrollYProgress, [0, 1], [0, 36]);

  // ── Plate advance ──────────────────────────────────────────────────────
  // The plate cycles through the top hero products like flipping printed
  // plates, and the `Plate NN / NN` counter finally means something. Frame 0
  // is always the passed-in heroProduct so the LCP image is deterministic and
  // matches what the server rendered. Motion is gated on: in-view, not paused
  // (hover), not reduced-motion — so nothing animates before load or off-screen.
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const plates = useMemo(() => {
    const seen = new Set<string>();
    const ordered = [heroProduct, ...products].filter(
      (p): p is CommerceProduct => {
        if (!p || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      },
    );
    return ordered.slice(0, 4);
  }, [heroProduct, products]);

  const SLIDE_MS = 5200;
  useEffect(() => {
    if (reduce || paused || !inView || plates.length <= 1) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % plates.length),
      SLIDE_MS,
    );
    return () => clearInterval(id);
  }, [reduce, paused, inView, plates.length]);

  // Current plate drives all the plate chrome (title, code, price, counter).
  const primary = plates[active] ?? heroProduct;
  const secondary = plates[(active + 1) % plates.length] ?? products.find((p) => p.id !== primary?.id);

  const primarySetPrice = primary ? primary.salePrice ?? primary.price : null;
  const primaryPerPiece =
    primarySetPrice !== null ? getPerPiecePrice(primarySetPrice) : null;
  const primaryStyleCode = primary ? getStyleCode(primary) : heroStyleCode;
  const plateLabel = `Plate ${String(active + 1).padStart(2, "0")} / ${String(plates.length).padStart(2, "0")}`;
  const sizeRunLabel = (heroSizeRun.length ? heroSizeRun : [...B2B_CONFIG.sizeRatio]).join(
    " · "
  );

  return (
    <section
      ref={ref}
      className="linebook-hero relative min-h-[100svh] overflow-hidden bg-surface-inverse pt-28 text-content-inverse sm:pt-32 lg:pt-28"
    >
      <div className="linebook-grid absolute inset-0" />

      {/* ─────────────────────────────────────────────────────────────────
          MOBILE LAYOUT  (hidden at lg+)
          Stacked flow: kicker → headline → plate → stats → copy → CTAs
      ───────────────────────────────────────────────────────────────── */}
      <div className="relative mx-auto flex flex-col px-4 pb-8 pt-4 sm:px-6 lg:hidden">
        {/* 1. Kicker */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mb-5 text-[9px] font-semibold uppercase tracking-[0.3em] text-content-inverse/55"
        >
          Wholesale line book · India · 2026
        </motion.p>

        {/* 2. Headline — clamp ensures no overflow at 360 px */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.08, delayChildren: 0.12 },
            },
          }}
          className="mb-5 select-none font-sans font-black uppercase leading-[0.82] tracking-[-0.04em]"
          style={{ fontSize: "clamp(3rem,15vw,5.5rem)" }}
        >
          {(["New", "Indian", "Wholesale"] as const).map((word, index) => (
            <motion.span
              key={word}
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className={`block ${
                index === 1
                  ? "tracking-[0.01em] text-transparent [-webkit-text-stroke:1.5px_#f1eee5]"
                  : ""
              }`}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* 3. Product plate — in-flow block, full width, NO scroll transform */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="hero-plate group relative mb-5 w-full bg-[#292a24] p-2"
        >
          {/* registration crop marks */}
          <span className="hero-plate-mark hero-plate-mark--tl" aria-hidden />
          <span className="hero-plate-mark hero-plate-mark--tr" aria-hidden />
          <span className="hero-plate-mark hero-plate-mark--bl" aria-hidden />
          <span className="hero-plate-mark hero-plate-mark--br" aria-hidden />

          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1c1d18]">
            <PlateStack
              plates={plates}
              active={active}
              eagerAlt={heroProduct?.title ?? "Rangat Pehnawa wholesale collection"}
              sizes="92vw"
            />
            <PlateProgress
              active={active}
              durationMs={SLIDE_MS}
              running={!reduce && !paused && inView && plates.length > 1}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/5" />
            <div className="hero-plate-sheen absolute inset-0" aria-hidden />

            {/* top spec strip */}
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent p-3 pb-10">
              <div className="flex items-center justify-between text-[7px] font-bold uppercase tracking-[0.22em] text-content-inverse/80">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-lime" />
                  In stock
                </span>
                <span className="bg-accent-lime px-2 py-1 text-on-accent">
                  {primaryStyleCode}
                </span>
              </div>
              <div className="mt-2.5 flex items-end justify-between gap-3 border-t border-[#f1eee5]/25 pt-2.5">
                <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-content-inverse">
                  {primary?.title ?? "New arrival"}
                </p>
                <span className="shrink-0 text-[7px] font-semibold uppercase tracking-[0.22em] text-content-inverse/45">
                  {plateLabel}
                </span>
              </div>
            </div>

            {/* price — bottom-right */}
            {primarySetPrice !== null && (
              <div className="absolute bottom-0 right-0 z-10 bg-surface-inverse/70 px-3 py-2 text-right backdrop-blur-sm">
                <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-content-inverse/55">
                  {sizeRunLabel} · set of {B2B_CONFIG.setSize}
                </p>
                <p className="mt-1 text-base font-black tracking-[-0.02em] text-accent-lime">
                  {formatPrice(primarySetPrice)}
                  {primaryPerPiece !== null && (
                    <span className="ml-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-content-inverse/50">
                      · {formatPrice(primaryPerPiece)}/pc
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 4. Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.38 }}
          className="mb-5 grid grid-cols-3 border-t border-[#f1eee5]/25 pt-4 text-[9px] font-semibold uppercase tracking-[0.2em]"
        >
          <div className="pr-3">
            <p className="text-content-inverse/55">MOQ</p>
            <p className="mt-0.5 text-content-inverse">{B2B_CONFIG.minimumOrderSets} sets</p>
          </div>
          <div className="border-x border-[#f1eee5]/15 px-3">
            <p className="text-content-inverse/55">Packs</p>
            <p className="mt-0.5 text-content-inverse">Style specific</p>
          </div>
          <div className="pl-3">
            <p className="text-content-inverse/55">Orders</p>
            <p className="mt-0.5 text-content-inverse">Pan-India</p>
          </div>
        </motion.div>

        {/* 5. Descriptive copy */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.46 }}
          className="mb-6 text-sm leading-6 text-content-inverse/65"
        >
          A working catalogue for boutiques and resellers: actual size
          availability, set pricing and direct ordering without retail noise.
        </motion.p>

        {/* 6. CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.54 }}
          className="flex gap-2"
        >
          <Link
            href="/shop"
            className="group flex min-h-[52px] flex-1 items-center justify-center gap-3 bg-accent-lime px-5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent transition-colors hover:bg-white"
          >
            Open line book
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <a
            href={catalogRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] w-[52px] items-center justify-center border border-[#f1eee5]/30 transition-colors hover:border-accent-lime hover:text-accent-lime"
            aria-label="Request catalogue on WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          DESKTOP LAYOUT  (hidden below lg, identical to the original)
      ───────────────────────────────────────────────────────────────── */}
      <div className="relative mx-auto hidden min-h-[calc(100svh-7rem)] max-w-[1600px] px-4 pb-5 sm:px-6 lg:block lg:px-10">
        {/* kicker — absolute, top of stage */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="absolute left-4 top-1 z-20 text-[9px] font-semibold uppercase tracking-[0.3em] text-content-inverse/55 sm:left-6 lg:left-10"
        >
          Wholesale line book · India · 2026
        </motion.p>

        {/* primary plate — absolutely positioned, parallax scroll */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.15, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{ y: primaryY }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="hero-plate group absolute right-0 top-[8%] z-20 h-[54%] w-[66%] bg-[#292a24] p-2 sm:right-[4%] sm:h-[66%] sm:w-[52%] sm:p-2.5 lg:right-[8%] lg:top-[4%] lg:h-[76%] lg:w-[41%]"
        >
          <span className="hero-plate-mark hero-plate-mark--tl" aria-hidden />
          <span className="hero-plate-mark hero-plate-mark--tr" aria-hidden />
          <span className="hero-plate-mark hero-plate-mark--bl" aria-hidden />
          <span className="hero-plate-mark hero-plate-mark--br" aria-hidden />

          <div className="relative h-full w-full overflow-hidden bg-[#1c1d18]">
            <PlateStack
              plates={plates}
              active={active}
              eagerAlt={heroProduct?.title ?? "Rangat Pehnawa wholesale collection"}
              sizes="(max-width: 640px) 70vw, (max-width: 1024px) 52vw, 41vw"
            />
            <PlateProgress
              active={active}
              durationMs={SLIDE_MS}
              running={!reduce && !paused && inView && plates.length > 1}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/5" />
            <div className="hero-plate-sheen absolute inset-0" aria-hidden />

            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent p-3 pb-10 sm:p-4 sm:pb-12">
              <div className="flex items-center justify-between text-[7px] font-bold uppercase tracking-[0.22em] text-content-inverse/80">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-lime" />
                  In stock
                </span>
                <span className="bg-accent-lime px-2 py-1 text-on-accent">
                  {primaryStyleCode}
                </span>
              </div>
              <div className="mt-2.5 flex items-end justify-between gap-3 border-t border-[#f1eee5]/25 pt-2.5">
                <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-content-inverse sm:text-xs">
                  {primary?.title ?? "New arrival"}
                </p>
                <span className="shrink-0 text-[7px] font-semibold uppercase tracking-[0.22em] text-content-inverse/45">
                  {plateLabel}
                </span>
              </div>
            </div>

            {primarySetPrice !== null && (
              <div className="absolute bottom-0 right-0 z-10 bg-surface-inverse/70 px-3 py-2 text-right backdrop-blur-sm sm:px-4 sm:py-2.5">
                <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-content-inverse/55">
                  {sizeRunLabel} · set of {B2B_CONFIG.setSize}
                </p>
                <p className="mt-1 text-base font-black tracking-[-0.02em] text-accent-lime sm:text-lg">
                  {formatPrice(primarySetPrice)}
                  {primaryPerPiece !== null && (
                    <span className="ml-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-content-inverse/50">
                      · {formatPrice(primaryPerPiece)}/pc
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* secondary thumbnail — desktop only */}
        {secondary && (
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: secondaryY }}
            className="absolute bottom-[13%] left-[5%] z-10 hidden aspect-[3/4] w-[15%] overflow-hidden border-4 border-line bg-[#292a24] lg:block"
          >
            <Image
              src={secondary.image}
              alt={secondary.title}
              fill
              className="object-cover"
              sizes="15vw"
            />
            <span className="absolute bottom-2 left-2 bg-surface-2 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.18em] text-content">
              {getStyleCode(secondary)}
            </span>
          </motion.div>
        )}

        {/* headline + bottom row — same structure as original */}
        <div className="relative flex min-h-[calc(100svh-9rem)] flex-col justify-between pt-12">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.08, delayChildren: 0.14 },
              },
            }}
            className="select-none font-sans text-[clamp(4.2rem,12.7vw,12.5rem)] font-black uppercase leading-[0.72] tracking-[-0.085em]"
          >
            {["New", "Indian", "Wholesale"].map((word, index) => (
              <motion.span
                key={word}
                variants={{
                  hidden: { opacity: 0, y: 70 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.95, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                className={`block ${
                  index === 1
                    ? "relative z-10 ml-[8vw] tracking-[0.02em] text-transparent [-webkit-text-stroke:1.5px_#f1eee5] sm:ml-[13vw] sm:[-webkit-text-stroke:2px_#f1eee5]"
                    : ""
                } ${index === 2 ? "relative z-30" : ""}`}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <div className="relative z-30 grid gap-5 border-t border-[#f1eee5]/25 pt-4 sm:grid-cols-[1fr_auto] sm:items-end lg:grid-cols-[1fr_1fr_auto]">
            <div className="flex gap-8 text-[9px] font-semibold uppercase leading-5 tracking-[0.2em] text-content-inverse/55">
              <p>
                MOQ
                <br />
                <span className="text-content-inverse">{B2B_CONFIG.minimumOrderSets} sets</span>
              </p>
              <p>
                Packs
                <br />
                <span className="text-content-inverse">Style specific</span>
              </p>
              <p className="hidden sm:block">
                Orders
                <br />
                <span className="text-content-inverse">Pan-India</span>
              </p>
            </div>
            <p className="hidden max-w-[33ch] text-sm leading-6 text-content-inverse/65 lg:block">
              A working catalogue for boutiques and resellers: actual size
              availability, set pricing and direct ordering without retail noise.
            </p>
            <div className="flex gap-2">
              <Link
                href="/shop"
                className="group flex h-12 items-center gap-4 bg-accent-lime px-5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent transition-colors hover:bg-white"
              >
                Open line book
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href={catalogRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center border border-[#f1eee5]/30 transition-colors hover:border-accent-lime hover:text-accent-lime"
                aria-label="Request catalogue on WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <a
          href="#buying-index"
          className="absolute bottom-[6.5rem] right-4 z-30 hidden items-center gap-2 text-[8px] font-bold uppercase tracking-[0.24em] text-content-inverse/50 transition-colors hover:text-accent-lime sm:flex lg:bottom-[7.5rem] lg:right-10"
        >
          Buying index <ArrowDownRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}

/**
 * Cross-fading image stack for the hero plate. All plates render into the same
 * box; only the active one is opaque. The first frame (index 0) is the LCP
 * image — eager + high priority — and it's always mounted, so the largest
 * contentful paint is deterministic and unaffected by the rotation. Later
 * frames lazy-load and fade in over a calm 1.4s.
 */
function PlateStack({
  plates,
  active,
  eagerAlt,
  sizes,
}: {
  plates: CommerceProduct[];
  active: number;
  eagerAlt: string;
  sizes: string;
}) {
  return (
    <>
      {plates.map((plate, i) => (
        <motion.div
          key={plate.id}
          aria-hidden={i !== active}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: i === active ? 1 : 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={plate.image}
            alt={i === 0 ? eagerAlt : plate.title}
            fill
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            className="object-cover"
            sizes={sizes}
          />
        </motion.div>
      ))}
    </>
  );
}

/**
 * Thin lime rule that fills across the top of the plate as the slide timer
 * runs — a quiet "time until next plate" cue. Keyed to `active` so it restarts
 * each advance; frozen full when paused or reduced-motion.
 */
function PlateProgress({
  active,
  durationMs,
  running,
}: {
  active: number;
  durationMs: number;
  running: boolean;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 h-[3px] overflow-hidden bg-white/10">
      <motion.div
        key={running ? active : "paused"}
        className="h-full bg-accent-lime"
        initial={{ width: running ? "0%" : "100%" }}
        animate={{ width: "100%" }}
        transition={{ duration: running ? durationMs / 1000 : 0, ease: "linear" }}
      />
    </div>
  );
}
