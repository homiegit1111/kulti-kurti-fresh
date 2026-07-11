"use client";

import Link from "next/link";
import { MessageCircle, Table2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { MockProduct } from "@/lib/commerce/catalog";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import {
  MainHeroStage,
  useMainHeroSlides,
} from "@/components/sections/hero-main-stage";

/**
 * Shop entry hero — same premium main-stage slideshow as home,
 * framed for catalog browsing (mobile-first).
 */
export function ShopHero({ products }: { products: MockProduct[] }) {
  const reduceMotion = useReducedMotion();
  const heroProduct = products[0] ?? null;
  const slides = useMainHeroSlides(products, heroProduct);
  const catalogUrl = buildCatalogRequestUrl();

  return (
    <section className="relative w-full">
      {/* Soft wash light only */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.5)_0%,transparent_40%)] dark:hidden" />

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-12">
        {/* Title row */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 flex items-end justify-between gap-4 sm:mb-5 lg:mb-6"
        >
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-[#a68b5f] dark:text-gold">
              <span className="h-px w-5 bg-[#a68b5f] dark:bg-gold" />
              Ready stock
            </p>
            <h1 className="font-serif text-[clamp(1.85rem,7vw,3.25rem)] font-light leading-[1.02] tracking-tight text-charcoal dark:text-white">
              View{" "}
              <span className="italic text-[#a68b5f] dark:text-gold">
                kurtis
              </span>
            </h1>
            <p className="text-caption-sm mt-1.5">
              MOQ {B2B_CONFIG.minimumOrderSets} · {SIZE_RATIO_LABEL}
            </p>
          </div>

          {/* Desktop quick actions */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 border border-charcoal/12 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-[#25D366]/40 hover:text-[#0f5c45] dark:border-white/15 dark:text-white dark:hover:border-[#25D366]/45"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
              WhatsApp
            </a>
            <Link
              href="/bulk-order"
              className="inline-flex h-10 items-center gap-2 bg-charcoal px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#a68b5f] dark:bg-[#ededed] dark:text-[#0a0a0a] dark:hover:bg-gold dark:hover:text-on-gold"
            >
              <Table2 className="h-3.5 w-3.5" />
              Bulk deals
            </Link>
          </div>
        </motion.div>

        {/* Mobile stage — full-width 3:4 like home */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="lg:hidden"
        >
          <div className="relative w-full overflow-hidden rounded-[1.25rem] bg-[#ebe4d8] shadow-[0_28px_70px_-30px_rgba(35,25,20,0.4)] ring-1 ring-black/[0.06] dark:bg-[#141414] dark:shadow-none dark:ring-white/10">
            <div className="relative aspect-[3/4] w-full">
              {slides.length > 0 ? (
                <MainHeroStage slides={slides} variant="mobile" />
              ) : (
                <div className="absolute inset-0 bg-[#ebe4d8] dark:bg-[#141414]" />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-1 ring-inset ring-white/20" />
          </div>

          {/* Compact mobile actions under stage */}
          <div className="mt-4 flex gap-2">
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#25D366]/35 bg-[rgba(37,211,102,0.08)] text-[10px] font-bold uppercase tracking-[0.12em] text-[#0f5c45] active:scale-[0.98] dark:border-[#25D366]/40 dark:bg-[rgba(37,211,102,0.1)] dark:text-[#8ee0b0]"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
              WhatsApp
            </a>
            <Link
              href="/bulk-order"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-charcoal text-[10px] font-bold uppercase tracking-[0.12em] text-white active:scale-[0.98] dark:bg-[#ededed] dark:text-[#0a0a0a]"
            >
              <Table2 className="h-3.5 w-3.5" />
              Bulk deals
            </Link>
          </div>
        </motion.div>

        {/* Desktop stage — wide cinematic */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 hidden lg:block"
        >
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[16px] bg-[#f4efe5] shadow-[0_36px_100px_-36px_rgba(35,25,20,0.28)] ring-1 ring-black/5 dark:bg-[#141414] dark:shadow-none dark:ring-white/10">
            {slides.length > 0 ? (
              <MainHeroStage slides={slides} variant="desktop" />
            ) : null}
            <div className="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/35" />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-px overflow-hidden border border-charcoal/10 bg-charcoal/10 dark:border-white/10 dark:bg-white/10">
            {[
              ["Low–mid", "to high-mid"],
              ["Fresh", "newness first"],
              [`MOQ ${B2B_CONFIG.minimumOrderSets}`, "bulk friendly"],
              ["WhatsApp", "stock help"],
            ].map(([value, label]) => (
              <div
                key={value}
                className="bg-[#faf7f1] px-4 py-3 dark:bg-[#0a0a0a]"
              >
                <p className="font-serif text-lg tracking-tight text-charcoal dark:text-white">
                  {value}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-charcoal/40 dark:text-white/35">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
