"use client";

import NextImage from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CommerceProduct } from "@/lib/commerce/types";
import { getStyleCode } from "@/lib/b2b/style-code";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { cn } from "@/lib/utils";

export type MainHeroSlide = {
  id: string;
  kind: "image" | "video" | "offer";
  src: string;
  poster?: string;
  eyebrow: string;
  title: string;
  href: string;
  caption?: string;
};

const IMAGE_MS = 5200;
const VIDEO_MS = 8000;

function skipHeavyMedia(): boolean {
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

/** 5–6 cinematic slides: styles + film + offer */
export function buildMainHeroSlides(
  products: CommerceProduct[],
  heroProduct: CommerceProduct | null,
): MainHeroSlide[] {
  const list = products ?? [];
  const ordered = heroProduct
    ? [heroProduct, ...list.filter((p) => p.id !== heroProduct.id)]
    : list;

  const slides: MainHeroSlide[] = [];

  for (const p of ordered.slice(0, 3)) {
    slides.push({
      id: `style-${p.id}`,
      kind: "image",
      src: p.image || p.images?.[0] || "/images/hero.png",
      eyebrow: getStyleCode(p),
      title: p.title,
      href: `/shop/${p.handle}`,
      caption: "Hand-finished · ratio set",
    });
  }

  slides.push({
    id: "film-craft",
    kind: "image",
    src: "/images/hero.png",
    poster: heroProduct?.image || "/images/hero.png",
    eyebrow: "Atelier film",
    title: "Craft in motion",
    href: "/shop",
    caption: "Weavers · dye · drape",
  });

  slides.push({
    id: "offer-moq",
    kind: "offer",
    src: "/images/collection-fresh-drops.jpg",
    eyebrow: "Buyer offer",
    title: `MOQ ${B2B_CONFIG.minimumOrderSets} sets`,
    href: "/shop?sort=newest",
    caption: "Fresh drops · pan-India",
  });

  slides.push({
    id: "lane-coords",
    kind: "image",
    src: "/images/collection-coords.jpg",
    eyebrow: "Collection",
    title: "Co-ords & matched sets",
    href: "/shop?cat=Co-ords",
    caption: "Boutique-ready pairs",
  });

  if (!slides.some((s) => s.id.startsWith("style-"))) {
    slides.unshift({
      id: "fallback-hero",
      kind: "image",
      src: "/images/hero.png",
      eyebrow: "Rangat",
      title: "Signature wholesale kurtis",
      href: "/shop",
      caption: "Ready stock",
    });
  }

  return slides.slice(0, 6);
}

type Variant = "mobile" | "desktop";

/**
 * Full-bleed hero stage — opacity crossfade, swipe, optional video.
 * Parent must give a real height (aspect box).
 */
export function MainHeroStage({
  slides,
  variant,
  className,
}: {
  slides: MainHeroSlide[];
  variant: Variant;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchX = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [allowVideo, setAllowVideo] = useState(false);

  const count = slides.length;
  const current = slides[index] ?? slides[0];
  const paused = isHoverPaused || isUserPaused;

  const goTo = useCallback(
    (i: number) => {
      if (count < 1) return;
      setIndex(((i % count) + count) % count);
    },
    [count],
  );

  // Functional updates so autoplay interval stays stable
  const goNext = useCallback(() => {
    setIndex((i) => (count < 2 ? i : (i + 1) % count));
  }, [count]);

  const goPrev = useCallback(() => {
    setIndex((i) => (count < 2 ? i : (i - 1 + count) % count));
  }, [count]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAllowVideo(!skipHeavyMedia());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(!!entry?.isIntersecting),
      { threshold: 0.15, rootMargin: "60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion || !inView) return;
    const slide = slides[index];
    const ms =
      slide?.kind === "video" && allowVideo ? VIDEO_MS : IMAGE_MS;
    const id = window.setInterval(goNext, ms);
    return () => window.clearInterval(id);
  }, [count, paused, reduceMotion, inView, index, slides, allowVideo, goNext]);

  // Video control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const active = current?.kind === "video" && allowVideo && !reduceMotion;
    if (active && inView && !paused) {
      if (video.getAttribute("src") !== current.src) {
        video.src = current.src;
      }
      video.play()?.catch(() => {});
    } else {
      video.pause();
    }
  }, [current, allowVideo, inView, paused, reduceMotion]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  if (!current || count === 0) return null;

  const isMobile = variant === "mobile";
  const sizes = isMobile
    ? "(max-width: 768px) 100vw, 600px"
    : "(max-width: 1024px) 100vw, 58vw";

  const showVideoLayer =
    current.kind === "video" && allowVideo && !reduceMotion;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative h-full w-full min-h-0 overflow-hidden bg-[#ebe4d8] dark:bg-[var(--surface-raised)]",
        className,
      )}
      onMouseEnter={() => !isMobile && setIsHoverPaused(true)}
      onMouseLeave={() => !isMobile && setIsHoverPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero showcase"
    >
      {/* ── Stacked slides (always mounted neighbors for smooth fade) ── */}
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={current.id}
          className="absolute inset-0 z-[1]"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <NextImage
            src={current.kind === "video" ? current.poster || current.src : current.src}
            alt={current.title}
            fill
            priority={index === 0}
            fetchPriority={index === 0 ? "high" : "auto"}
            decoding="async"
            className="object-cover object-[center_18%]"
            sizes={sizes}
            quality={82}
          />
          {current.kind === "video" && allowVideo && !reduceMotion && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover object-center"
              muted
              playsInline
              loop
              autoPlay
              preload="metadata"
              poster={current.poster}
              aria-hidden
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Soft vignette — not crushing the product */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[2]",
          isMobile
            ? "bg-gradient-to-t from-black/80 via-black/15 to-transparent"
            : "bg-gradient-to-t from-[#1c1915]/92 via-[#1c1915]/35 to-transparent dark:from-black/90 dark:via-black/30",
        )}
      />

      {/* Eyebrow chip */}
      <div className="absolute top-3.5 left-3.5 z-[3] sm:top-5 sm:left-5">
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]",
            current.kind === "offer"
              ? "bg-madder font-mono text-white"
              : "border border-white/35 bg-surface-inverse text-white",
          )}
        >
          {current.kind === "offer"
            ? "Offer"
            : current.kind === "video"
              ? "Film"
              : current.eyebrow}
        </span>
      </div>

      {/* Desktop arrows */}
      {!isMobile && count > 1 && (
        <div className="absolute top-1/2 right-4 z-[3] hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={goPrev}
            className="flex h-10 w-10 items-center justify-center border border-white/25 bg-surface-inverse/85 text-white transition-colors hover:bg-white hover:text-charcoal"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={goNext}
            className="flex h-10 w-10 items-center justify-center border border-white/25 bg-surface-inverse/85 text-white transition-colors hover:bg-white hover:text-charcoal"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {count > 1 && !reduceMotion && (
        <button
          type="button"
          aria-label={
            isUserPaused
              ? "Resume automatic slides"
              : "Pause automatic slides"
          }
          aria-pressed={isUserPaused}
          onClick={() => setIsUserPaused((value) => !value)}
          className="absolute top-3 right-3 z-[3] flex h-9 w-9 items-center justify-center border border-white/25 bg-surface-inverse/85 text-white transition-colors hover:bg-white hover:text-charcoal sm:top-5 sm:right-5"
        >
          {isUserPaused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Bottom copy */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-[3] text-white",
          isMobile ? "p-4 pb-3.5" : "p-5 sm:p-6 lg:p-8",
        )}
      >
        <Link href={current.href} className="group block min-w-0">
          <motion.div
            key={current.id + "-copy"}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className={cn(
                "font-black uppercase leading-[0.95] tracking-[-0.045em] text-white drop-shadow-sm",
                isMobile
                  ? "text-[1.45rem] max-w-[18ch]"
                  : "text-[24px] sm:text-[28px] lg:text-[34px] max-w-[20ch]",
              )}
            >
              {current.title}
            </p>
            {current.caption && (
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/65">
                {current.caption}
              </p>
            )}
            <span className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
              Explore
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-active:translate-x-0.5" />
            </span>
          </motion.div>
        </Link>

        {/* Dots only — clean */}
        {count > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === index
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40 active:bg-white/70",
                  )}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold tabular-nums tracking-[0.14em] text-white/55">
              {String(index + 1).padStart(2, "0")}
              <span className="text-white/30"> / </span>
              {String(count).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {/* Hide unused showVideoLayer lint - used conceptually via video mount */}
      <span className="sr-only">{showVideoLayer ? "Playing film" : ""}</span>
    </div>
  );
}

export function useMainHeroSlides(
  products: CommerceProduct[],
  heroProduct: CommerceProduct | null,
) {
  return useMemo(
    () => buildMainHeroSlides(products, heroProduct),
    [products, heroProduct],
  );
}
