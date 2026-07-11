"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DURATION,
  EASE_OUT_EXPO,
  VIEWPORT_ONCE,
  staggerContainer,
  tween,
} from "@/lib/motion";
import { BlockMotif } from "@/components/sections/block-motifs";

const TRUST = [
  "Hand-finished batches",
  "Chanderi and handloom",
  "MOQ 4 with restock",
] as const;

const VIDEO_SRC = "/videos/background.mp4";

function shouldSkipVideo(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (connection?.saveData) return true;
  if (/(^2g$|^slow-2g$)/.test(connection?.effectiveType ?? "")) return true;
  return false;
}

/**
 * Thin landscape film between hero and catalog.
 * Autoplay muted video when in view — works on mobile + desktop.
 * Trust labels fade in gently on scroll (no layout/visual redesign).
 */
export function HeroFilmRibbon() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;

    if (shouldSkipVideo()) {
      video.removeAttribute("src");
      video.load();
      return;
    }

    const tryPlay = () => {
      if (shouldSkipVideo()) {
        video.pause();
        return;
      }
      // Ensure source is set (React may have hydrated with it already)
      if (!video.getAttribute("src") && !video.currentSrc) {
        video.src = VIDEO_SRC;
      }
      const play = video.play();
      if (play && typeof play.catch === "function") {
        play.catch(() => {
          // Retry once after metadata (iOS quirks)
          const onReady = () => {
            video.play().catch(() => {});
            video.removeEventListener("loadeddata", onReady);
          };
          video.addEventListener("loadeddata", onReady);
        });
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          tryPlay();
        } else {
          video.pause();
        }
      },
      { threshold: 0.08, rootMargin: "120px 0px" },
    );

    io.observe(root);

    return () => {
      io.disconnect();
      video.pause();
    };
  }, []);

  const listVariants = reduceMotion
    ? undefined
    : staggerContainer(0.09, 0.08);
  const itemVariants = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: tween(DURATION.base, 0, EASE_OUT_EXPO),
        },
      };

  return (
    <section
      ref={rootRef}
      aria-label="Craft and quality"
      className="relative w-full overflow-hidden bg-[hsl(var(--brand-indigo))] dark:bg-[var(--surface-void)]"
    >
      <div className="relative h-[120px] w-full sm:h-[148px] md:h-[168px] lg:h-[188px]">
        <Image
          src="/images/hero.png"
          alt=""
          fill
          sizes="100vw"
          quality={75}
          className="object-cover object-center"
          aria-hidden
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(27,44,75,0.6)_0%,rgba(27,44,75,0.26)_40%,rgba(27,44,75,0.26)_60%,rgba(27,44,75,0.55)_100%),linear-gradient(180deg,rgba(27,44,75,0.28)_0%,transparent_35%,rgba(27,44,75,0.58)_100%)] dark:bg-[linear-gradient(90deg,rgba(13,18,32,0.66)_0%,rgba(13,18,32,0.32)_40%,rgba(13,18,32,0.32)_60%,rgba(13,18,32,0.6)_100%),linear-gradient(180deg,rgba(13,18,32,0.34)_0%,transparent_35%,rgba(13,18,32,0.6)_100%)]"
        />

        <div className="absolute inset-0 z-10 flex items-center">
          <motion.ul
            className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 sm:justify-between sm:gap-x-4 sm:px-8 lg:px-12"
            variants={listVariants}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
          >
            {TRUST.map((label) => (
              <motion.li
                key={label}
                variants={itemVariants}
                className="flex items-center gap-2 text-white/90 sm:gap-3 transform-gpu"
              >
                <BlockMotif className="h-3 w-3 text-white/55 sm:h-3.5 sm:w-3.5" />
                <span className="font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-white/85 sm:text-[10px] sm:tracking-[0.2em]">
                  {label}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--brand-madder))] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
        />
      </div>
    </section>
  );
}
