"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useRef } from "react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getStyleCode } from "@/lib/b2b/style-code";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { formatPrice } from "@/lib/commerce/catalog";
import type { CommerceProduct } from "@/lib/commerce/types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface HeroCinematicProps {
  products: CommerceProduct[];
  heroProduct: CommerceProduct | null;
  catalogRequestUrl: string;
}

/**
 * HERO — full-bleed motion stage.
 *
 * No text-left/image-right split: the collection film fills the viewport and
 * the type is printed over it. Headline lines rise out of overflow masks,
 * serif italic cuts against black sans, one product plate floats over the
 * footage with its own parallax lane. A wholesale buyer still gets every
 * fact in the first viewport — the facts rail runs along the base.
 */
export function HeroCinematic({
  products,
  heroProduct,
  catalogRequestUrl,
}: HeroCinematicProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const typeY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const plateY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -180]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const featured = heroProduct ?? products[0] ?? null;
  const setPrice = featured ? featured.salePrice ?? featured.price : null;
  const perPiece = setPrice !== null ? getPerPiecePrice(setPrice) : null;
  const styleCode = featured ? getStyleCode(featured) : "RP-NEW";

  const maskVariants: Variants = {
    hidden: { y: reduce ? "0%" : "115%" },
    visible: (i: number) => ({
      y: "0%",
      transition: {
        duration: reduce ? 0.4 : 1.0,
        delay: reduce ? 0 : 0.25 + i * 0.11,
        ease: EASE,
      },
    }),
  };

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] overflow-hidden bg-surface-inverse text-content-inverse"
    >
      {/* ── Footage ── */}
      {reduce ? (
        <Image
          src="/images/hero.png"
          alt="Rangat Pehnawa wholesale collection"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/hero.png"
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>
      )}

      {/* legibility grade */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-surface-inverse/75 via-surface-inverse/30 to-surface-inverse/90"
      />

      {/* ── Stage ── */}
      <motion.div
        style={{ opacity: fade }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1700px] flex-col justify-between px-5 pb-0 pt-28 sm:px-8 lg:px-12 lg:pt-36"
      >
        {/* eyebrow row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.32em] text-content-inverse/60"
        >
          <span className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 bg-accent-lime" aria-hidden />
            Rangat Pehnawa — Wholesale Kurti Studio
          </span>
          <span className="hidden sm:inline">Bengaluru · India</span>
        </motion.div>

        {/* headline — masked line reveals, serif cuts sans */}
        <motion.div style={{ y: typeY }} className="max-w-full">
          <h1 className="select-none">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span
                custom={0}
                variants={maskVariants}
                initial="hidden"
                animate="visible"
                className="block font-sans text-[clamp(3.4rem,11vw,10.5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em]"
              >
                Colour,
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.08em]">
              <motion.span
                custom={1}
                variants={maskVariants}
                initial="hidden"
                animate="visible"
                className="block font-serif text-[clamp(3.2rem,10vw,9.5rem)] italic leading-[0.95] tracking-[-0.02em] text-accent-lime"
              >
                cut for
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span
                custom={2}
                variants={maskVariants}
                initial="hidden"
                animate="visible"
                className="block font-sans text-[clamp(3.4rem,11vw,10.5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em]"
              >
                the trade.
              </motion.span>
            </span>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 0.7, ease: EASE }}
            className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <p className="max-w-[40ch] text-[13px] leading-6 text-content-inverse/70">
              Wholesale kurtis, co-ords and dupatta sets at maker-direct rates.
              Size-complete packs, GST invoice, dispatch across India — and the
              whole catalogue one WhatsApp message away.
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
                className="flex h-12 items-center gap-2.5 border border-content-inverse/35 px-6 text-[10px] font-black uppercase tracking-[0.22em] text-content-inverse transition-colors hover:border-accent-lime hover:text-accent-lime"
              >
                <MessageCircle className="h-4 w-4" />
                Catalogue
              </a>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Floating product plate (desktop) ── */}
        {featured && setPrice !== null && (
          <motion.div
            style={{ y: plateY }}
            initial={{ opacity: 0, y: reduce ? 0 : 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: reduce ? 0 : 0.9, ease: EASE }}
            className="absolute bottom-28 right-12 z-20 hidden w-[240px] xl:block"
          >
            <Link
              href={`/shop/${featured.handle}`}
              className="group block border border-content-inverse/25 bg-surface-inverse/80 p-2 backdrop-blur-sm transition-colors hover:border-accent-lime"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="240px"
                />
                <span className="absolute left-2 top-2 bg-accent-lime px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-on-accent">
                  {styleCode}
                </span>
              </div>
              <div className="flex items-end justify-between px-1.5 pb-1 pt-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.06em]">
                    {featured.title}
                  </p>
                  {perPiece !== null && (
                    <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-content-inverse/50">
                      {formatPrice(perPiece)}/pc · set of {B2B_CONFIG.setSize}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-black text-accent-lime">
                  {formatPrice(setPrice)}
                </p>
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── Facts rail — the trade terms pinned to the base ── */}
        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 1.05 }}
          className="-mx-5 grid grid-cols-2 border-t border-content-inverse/20 sm:-mx-8 sm:grid-cols-4 lg:-mx-12"
        >
          {[
            { k: "Minimum order", v: `${B2B_CONFIG.minimumOrderSets} sets` },
            { k: "One set", v: `${B2B_CONFIG.setSize} pieces` },
            { k: "Size run", v: B2B_CONFIG.sizeRatio.join(" · ") },
            { k: "Rate", v: "Maker-direct" },
          ].map((f, i) => (
            <div
              key={f.k}
              className={`px-5 py-4 sm:px-8 lg:px-12 ${
                i > 0 ? "border-l border-content-inverse/15" : ""
              } ${i >= 2 ? "max-sm:border-t max-sm:border-content-inverse/15" : ""} ${
                i === 2 ? "max-sm:border-l-0" : ""
              }`}
            >
              <dt className="text-[8px] font-bold uppercase tracking-[0.3em] text-content-inverse/45">
                {f.k}
              </dt>
              <dd className="mt-1 text-[13px] font-black uppercase tracking-[-0.01em] tabular-nums">
                {f.v}
              </dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
