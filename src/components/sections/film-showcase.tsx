"use client";

import Link from "next/link";
import { useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Play } from "lucide-react";
import {
  DURATION,
  EASE_OUT_EXPO,
  VIEWPORT_EARLY,
  tween,
  fadeUp,
  staggerContainer,
} from "@/lib/motion";
import type { Variants } from "framer-motion";

// ─── motion variants ─────────────────────────────────────────────────────────

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween(DURATION.enter, 0, EASE_OUT_EXPO),
  },
};

const plateReveal: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: tween(DURATION.slow + 0.1, 0.06, EASE_OUT_EXPO),
  },
};

const captionStagger = staggerContainer(0.07, 0.14);

const captionItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween(DURATION.base, 0, EASE_OUT_EXPO),
  },
};

// ─── component ───────────────────────────────────────────────────────────────

export function FilmShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReduced = useReducedMotion();

  const handlePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const p = el.play();
    if (p !== undefined) {
      p.catch(() => {
        // autoplay blocked — poster stays, no throw
      });
    }
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || prefersReduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            handlePlay();
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced, handlePlay]);

  return (
    <section
      aria-label="Rangat Pehnawa — collection film"
      className="relative overflow-hidden bg-surface-inverse py-10 text-content-inverse md:py-14"
    >
      {/* catalogue grid overlay */}
      <div className="linebook-grid absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">

        {/* ═══════════════════════════════════════════════════════════════
            MOBILE LAYOUT  — hidden at lg+
            Stack: kicker row → framed clip (16/9) → one-line caption + CTA
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden">
          {/* kicker row */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_EARLY}
            variants={sectionReveal}
            className="mb-3 flex items-center justify-between"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/55">
              Motion study · 03
            </p>
            <span className="bg-accent-lime px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-on-accent">
              Film
            </span>
          </motion.div>

          {/* plate — 16/9 on mobile, neat and framed */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_EARLY}
            variants={plateReveal}
            className="hero-plate relative bg-[#292a24] p-1.5"
          >
            <span className="hero-plate-mark hero-plate-mark--tl" aria-hidden />
            <span className="hero-plate-mark hero-plate-mark--tr" aria-hidden />
            <span className="hero-plate-mark hero-plate-mark--bl" aria-hidden />
            <span className="hero-plate-mark hero-plate-mark--br" aria-hidden />

            <div className="relative aspect-video w-full overflow-hidden bg-[#1c1d18]">
              <video
                ref={videoRef}
                src="/videos/background.mp4"
                poster="/images/hero.png"
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* reduced-motion play affordance */}
              {prefersReduced && (
                <button
                  type="button"
                  onClick={handlePlay}
                  aria-label="Play collection film"
                  className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/20"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#f1eee5]/40 bg-surface-inverse/60 backdrop-blur-sm">
                    <Play className="h-4 w-4 fill-content-inverse text-content-inverse" />
                  </span>
                </button>
              )}

              <div className="hero-plate-sheen absolute inset-0" aria-hidden />
              <div
                className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent"
                aria-hidden
              />

              {/* REC dot */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5" aria-hidden>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-lime" />
                <span className="text-[7px] font-bold uppercase tracking-[0.22em] text-content-inverse/70">
                  Now playing
                </span>
              </div>
            </div>
          </motion.div>

          {/* caption + CTA below the frame */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_EARLY}
            variants={captionStagger}
            className="mt-3 flex items-center justify-between gap-3"
          >
            <motion.div variants={captionItem} className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/40">
                Rangat Pehnawa · Spring 2026
              </p>
              <p className="mt-0.5 text-[11px] font-black uppercase leading-tight tracking-[-0.02em] text-content-inverse">
                The cloth in motion.
              </p>
            </motion.div>
            <motion.div variants={captionItem} className="shrink-0">
              <Link
                href="/shop"
                className="group flex h-9 items-center gap-2 bg-accent-lime px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent transition-colors hover:bg-white"
              >
                See the line
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            DESKTOP LAYOUT  — hidden below lg
            Split band: video (≈62%) left | caption column (≈38%) right
            Total section height stays well under 460px (py-14 + plate)
        ════════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:block">
          {/* section kicker */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_EARLY}
            variants={sectionReveal}
            className="mb-4 flex items-center justify-between"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/55">
              Motion study · 03
            </p>
            <span className="bg-accent-lime px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-on-accent">
              Film
            </span>
          </motion.div>

          {/* split row */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_EARLY}
            variants={plateReveal}
            className="hero-plate flex bg-[#292a24] p-2"
          >
            <span className="hero-plate-mark hero-plate-mark--tl" aria-hidden />
            <span className="hero-plate-mark hero-plate-mark--tr" aria-hidden />
            <span className="hero-plate-mark hero-plate-mark--bl" aria-hidden />
            <span className="hero-plate-mark hero-plate-mark--br" aria-hidden />

            {/* left — video well, letterbox 21/9, max 420px tall */}
            <div className="relative w-[62%] shrink-0 overflow-hidden bg-[#1c1d18]" style={{ aspectRatio: "21/9", maxHeight: "420px" }}>
              <video
                ref={videoRef}
                src="/videos/background.mp4"
                poster="/images/hero.png"
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* reduced-motion play affordance — desktop */}
              {prefersReduced && (
                <button
                  type="button"
                  onClick={handlePlay}
                  aria-label="Play collection film"
                  className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/20"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#f1eee5]/40 bg-surface-inverse/60 backdrop-blur-sm">
                    <Play className="h-5 w-5 fill-content-inverse text-content-inverse" />
                  </span>
                </button>
              )}

              <div className="hero-plate-sheen absolute inset-0" aria-hidden />
              <div
                className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 via-black/15 to-transparent"
                aria-hidden
              />

              {/* REC dot */}
              <div className="absolute left-4 top-4 flex items-center gap-1.5" aria-hidden>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-lime" />
                <span className="text-[7px] font-bold uppercase tracking-[0.22em] text-content-inverse/70">
                  Now playing
                </span>
              </div>

              {/* timecode chip */}
              <div className="absolute right-4 top-4 bg-surface-inverse/55 px-2 py-1 backdrop-blur-sm" aria-hidden>
                <span className="font-mono text-[7px] font-bold tracking-[0.14em] text-content-inverse/45">
                  00:00:00:00
                </span>
              </div>
            </div>

            {/* right — caption column */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_EARLY}
              variants={captionStagger}
              className="flex min-w-0 flex-1 flex-col justify-between bg-[#1c1d18] px-7 py-6"
            >
              {/* top: collection label */}
              <motion.div variants={captionItem}>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/40">
                  Collection film
                </p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/55">
                  Rangat Pehnawa · Spring 2026
                </p>
              </motion.div>

              {/* middle: headline */}
              <motion.h2
                variants={captionItem}
                className="select-none font-sans text-2xl font-black uppercase leading-[0.88] tracking-[-0.04em] text-content-inverse xl:text-3xl"
              >
                The cloth
                <br />
                in motion.
              </motion.h2>

              {/* bottom: copy + CTA */}
              <motion.div variants={fadeUp} className="space-y-4">
                <p className="text-[11px] leading-5 text-content-inverse/55">
                  Each cloth filmed in-studio. What you see is what ships — no
                  retouching, just the weave.
                </p>
                <Link
                  href="/shop"
                  className="group flex h-10 w-full items-center justify-center gap-2.5 bg-accent-lime px-5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent transition-colors hover:bg-white"
                >
                  See the line
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
