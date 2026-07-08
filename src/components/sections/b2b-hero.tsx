"use client";

import NextImage from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getStyleCode } from "@/lib/b2b/style-code";
import type { CommerceProduct } from "@/lib/commerce/types";

const heroTextStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.12 },
  },
};

const heroTextItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
};

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
  const secondary = products[1] ?? products[2] ?? null;

  const mainImage = heroProduct?.image ?? "/images/hero.png";
  const mainTitle = heroProduct?.title ?? "Signature Chanderi Set";
  const mainStyle = heroStyleCode;

  const [previewProduct, setPreviewProduct] = useState(secondary);

  // Preload all images for instant smooth switches (no white flash)
  useEffect(() => {
    if (products?.length) {
      products.forEach((p) => {
        const img = new window.Image();
        img.src = p.image;
      });
    }
  }, [products]);

  useEffect(() => {
    if (!products || products.length < 2) return;
    const interval = setInterval(() => {
      let next;
      const mainId = heroProduct?.id;
      do {
        next = products[Math.floor(Math.random() * products.length)];
      } while (
        (previewProduct && next.id === previewProduct.id) ||
        (mainId && next.id === mainId)
      );
      setPreviewProduct(next);
    }, 4800); // smooth premium auto-change every ~5s
    return () => clearInterval(interval);
  }, [products, previewProduct, heroProduct]);

  const displayProduct = previewProduct || secondary;

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden pt-20 lg:pt-16 xl:pt-20">
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 lg:px-12 pt-4 lg:pt-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-start">
          {/* Left: editorial voice — aligned with the crafted material on the right.
              Clean, quiet luxury. Refined typography, subtle gold accents, generous breathing. */}
          <motion.div
            className="lg:col-span-5 xl:col-span-5 pt-5 lg:pt-3 pb-10"
            variants={heroTextStagger}
            initial="hidden"
            animate="visible"
          >
            {/* Kicker — matches the quiet badge language on the image */}
            <motion.div variants={heroTextItem} className="mb-8">
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-8 bg-[#a68b5f]/55" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#a68b5f]">
                  2026 Wholesale Collection
                </span>
              </div>
            </motion.div>

            {/* Headline — powerful, modern, perfectly balanced with the hero visual */}
            <motion.h1
              variants={heroTextItem}
              className="font-serif text-[58px] sm:text-[64px] lg:text-[70px] xl:text-[78px] leading-[0.88] tracking-[-3.2px] text-charcoal"
            >
              Made by hand.<br />
              <span className="block mt-1 font-normal text-[0.54em] tracking-[-1.4px] text-charcoal/60">
                Priced for business.
              </span>
            </motion.h1>

            {/* Caption — elegant, concise, material-matched tone */}
            <motion.p
              variants={heroTextItem}
              className="mt-7 max-w-[37ch] text-[14.5px] leading-[1.65] text-charcoal/65"
            >
              Small-batch, hand-finished kurti sets for boutiques and resellers 
              who value lasting craft and clients who return.
            </motion.p>

            {/* Elegant specs — luxury vertical-divider layout */}
            <motion.div
              variants={heroTextItem}
              className="mt-8 flex flex-wrap items-center gap-y-4 gap-x-8 border-b border-charcoal/10 pb-6 max-w-lg"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] uppercase tracking-[0.25em] text-charcoal/40 font-bold">Min Order</span>
                <span className="text-[13px] font-semibold text-charcoal/80 uppercase tracking-wider">{B2B_CONFIG.minimumOrderSets} Sets / MOQ</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-charcoal/15" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] uppercase tracking-[0.25em] text-charcoal/40 font-bold">Size Run</span>
                <span className="text-[13px] font-semibold text-charcoal/80 uppercase tracking-wider">{heroSizeRun.join(" - ")}</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-charcoal/15" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] uppercase tracking-[0.25em] text-charcoal/40 font-bold">Dispatch</span>
                <span className="text-[13px] font-semibold text-charcoal/80 uppercase tracking-wider">Pan-India</span>
              </div>
            </motion.div>

            {/* Premium CTAs — modern, sharp geometric design with refined hover transitions */}
            <motion.div
              variants={heroTextItem}
              className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              {/* Explore the Edit — refined luxury button with clean hover lift */}
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.8 }}
                className="inline-block"
              >
                <Link
                  href="/shop"
                  className="group inline-flex h-12 items-center justify-center gap-3 bg-charcoal hover:bg-charcoal/90 px-9 text-[10px] font-bold uppercase tracking-[0.28em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.22)] rounded-sm border border-charcoal transition-all duration-300"
                >
                  Explore the edit
                  <motion.span
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 380, damping: 16, mass: 0.5 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                </Link>
              </motion.div>

              {/* Request full catalog — clean border action button */}
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.8 }}
                className="inline-block"
              >
                <a
                  href={catalogRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-12 items-center justify-center gap-3 border border-charcoal/15 hover:border-charcoal bg-transparent hover:bg-charcoal/5 px-8 text-[10px] font-bold uppercase tracking-[0.28em] text-charcoal transition-all duration-300 rounded-sm"
                >
                  Request full catalog
                  <motion.span
                    whileHover={{ scale: 1.15, x: 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14, mass: 0.55 }}
                    className="inline-flex"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-charcoal/70 group-hover:text-[#25D366] transition-colors duration-300"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 1 4.3L2 22l5.8-1.5c1.2.6 2.6.9 4 .9 5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.3 0-2.6-.3-3.7-.9l-.3-.2-3.5.9.9-3.4-.2-.3A7.96 7.96 0 014 12a8 8 0 1116 0 8 8 0 01-8 8zm4.2-5.9c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.12-.52.12-.15.23-.6.75-.74.9-.14.15-.27.17-.5.06-.23-.12-.97-.36-1.85-1.14-.68-.61-1.14-1.36-1.27-1.59-.13-.23 0-.35.1-.46.1-.1.23-.26.34-.4.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.4-.06-.11-.52-1.25-.71-1.71-.19-.46-.38-.4-.52-.4-.13 0-.28 0-.43.01-.15.01-.39.06-.6.3-.21.23-.81.79-.81 1.93 0 1.14.83 2.24.95 2.4.11.15 1.63 2.5 3.95 3.5 2.32 1 2.32 .67 2.74.63.45-.04 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.17-.06-.1-.21-.16-.44-.28z" />
                    </svg>
                  </motion.span>
                </a>
              </motion.div>
            </motion.div>

            {/* Quiet trust benefits — elegant gold bullet points */}
            <motion.div
              variants={heroTextItem}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-[0.24em] text-charcoal/45"
            >
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a68b5f]" />
                Direct from weavers
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a68b5f]" />
                Verified quality
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a68b5f]" />
                Built for repeat
              </span>
            </motion.div>
          </motion.div>

          {/* Right: Elevated hero visual — signature crafted object */}
          <div className="lg:col-span-7 relative pt-2">
            <motion.div
              whileHover={{ 
                y: -6, 
                scale: 1.006 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 140, 
                damping: 22, 
                mass: 0.65 
              }}
              className="group relative overflow-hidden rounded-[22px] bg-[#f4efe5] shadow-[0_48px_140px_-28px_rgb(0,0,0,0.26)] ring-1 ring-black/5 aspect-[16/10] lg:aspect-[16/9.8] xl:aspect-[16/9.2] transform-gpu"
            >
              <NextImage
                src={mainImage}
                alt={mainTitle}
                fill
                priority
                className="object-cover transition-[transform,filter] duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:brightness-[1.01] transform-gpu"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />

              {/* Deliberate material texture — feels like fine handloom under light */}
              <div className="absolute inset-0 bg-[radial-gradient(#00000006_0.5px,transparent_1px)] bg-[length:2.2px_2.2px] mix-blend-multiply pointer-events-none" />

              {/* Very subtle directional light (atelier window) that shifts on hover */}
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%,rgba(120,95,70,0.04)_85%)] opacity-70 group-hover:opacity-95 transition-opacity duration-[1300ms] pointer-events-none" />

              {/* Signature: refined style code badge — quiet luxury treatment */}
              <div className="absolute left-6 top-6 z-10 inline-flex items-center bg-white/90 px-4 py-1.5 text-[10px] font-bold tracking-[0.28em] text-charcoal border border-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm">
                {mainStyle}
              </div>

              {/* Sophisticated bottom panel with premium depth */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1c1915]/96 via-[#1c1915]/82 to-transparent p-6 lg:p-8 text-white">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <div className="font-serif text-[27px] lg:text-[33px] leading-none tracking-[-0.7px]">
                      {mainTitle}
                    </div>
                    <div className="mt-2 text-[11px] tracking-[0.17em] text-white/60">
                      Hand-finished • Limited seasonal quantities
                    </div>
                  </div>

                  <Link
                    href={heroProduct ? `/shop/${heroProduct.handle}` : "/shop"}
                    className="hidden sm:inline-flex h-11 items-center gap-2 rounded-full border border-white/30 bg-white/8 px-6 text-[10px] font-semibold tracking-[0.22em] text-white/90 backdrop-blur-lg transition-all hover:bg-white hover:text-charcoal hover:border-white/60 active:scale-[0.985]"
                  >
                    VIEW DETAILS <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Premium object framing — delicate inner highlight + subtle edge */}
              <div className="absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/50 pointer-events-none" />
              <div className="absolute inset-[1px] rounded-[21px] ring-1 ring-inset ring-black/5 pointer-events-none" />
            </motion.div>

            {/* Floating secondary preview — premium material swatch.
               Elevated box design to match the main hero: layered clay material, refined framing,
               directional light, and handloom texture. Feels like a physical sample card. */}
            {displayProduct && (
              <motion.div
                whileHover={{ 
                  y: -7, 
                  scale: 1.007 
                }}
                transition={{ type: "spring", stiffness: 160, damping: 24, mass: 0.6 }}
                className="absolute -bottom-8 -right-1 z-20 hidden lg:block transform-gpu"
              >
                <Link
                  href={`/shop/${displayProduct.handle}`}
                  className="group relative block w-[312px] overflow-hidden rounded-[18px] border border-white/10 bg-[#f4efe5] px-5 py-4 shadow-[0_30px_95px_-18px_rgb(0,0,0,0.23),0_5px_14px_-2px_rgb(0,0,0,0.08)] ring-1 ring-inset ring-white/15"
                >
                  {/* Layered material background — matches main hero depth and tactility */}
                  <div className="absolute inset-0 bg-[radial-gradient(#00000003_0.5px,transparent_1px)] bg-[length:2.3px_2.3px] mix-blend-multiply pointer-events-none" />
                  <div className="absolute inset-0 bg-[linear-gradient(138deg,rgba(255,255,255,0.065)_0%,transparent_48%,rgba(120,95,70,0.022)_85%)] pointer-events-none" />

                  <div className="grid grid-cols-[154px_minmax(0,1fr)] items-center gap-5 relative z-10">
                    {/* Image sample — deeper framed swatch with richer passepartout */}
                    <div className="relative h-[154px] w-[154px] flex-shrink-0 overflow-hidden rounded-[14px] bg-[#f4efe5] ring-1 ring-inset ring-white/25">
                      {/* Photo + texture settle */}
                      <motion.div
                        key={displayProduct.id + '-photo'}
                        initial={{ opacity: 0.2, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0"
                      >
                        <NextImage
                          src={displayProduct.image}
                          alt={displayProduct.title}
                          fill
                          priority
                          unoptimized
                          className="object-cover transition-[transform,filter] duration-[1250ms] ease-[cubic-bezier(0.24,1,0.32,1)] group-hover:brightness-[1.007] transform-gpu"
                          sizes="158px"
                        />

                        {/* Clay texture */}
                        <div className="absolute inset-0 bg-[radial-gradient(#00000003_0.5px,transparent_1px)] bg-[length:2.4px_2.4px] mix-blend-multiply" />
                      </motion.div>

                      {/* Multi-layer passepartout — elevated framing like the large hero */}
                      <div className="absolute inset-[2px] rounded-[12px] ring-1 ring-inset ring-white/45" />
                      <div className="absolute inset-[7px] rounded-[9px] border border-white/70" />
                      <div className="absolute inset-[12px] rounded-[6px] border border-white/15" />



                      {/* Settling light bloom */}
                      <motion.div
                        key={displayProduct.id + '-bloom'}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at 32% 18%, rgba(255,255,255,0.08) 0%, transparent 60%)'
                        }}
                        initial={{ opacity: 0.65 }}
                        animate={{ opacity: 0.28 }}
                        transition={{ duration: 1.2, ease: [0.24, 1, 0.32, 1], delay: 0.12 }}
                      />
                    </div>

                    {/* Text column — refined airy typography */}
                    <motion.div
                      key={displayProduct.id + '-text'}
                      initial={{ opacity: 0.3, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="min-w-0 pr-1"
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-[0.34em] text-[#a68b5f]">
                        {getStyleCode(displayProduct)}
                      </div>
                      <div className="mt-1.5 font-serif text-[15px] leading-[1.05] tracking-[-0.16px] text-charcoal line-clamp-2">
                        {displayProduct.title}
                      </div>

                      {/* Modern elegant CTA — properly integrated with the premium box */}
                      <div className="mt-4">
                        {/* Delicate gold thread accent (echoes the shuttle animation & handloom craft) */}
                        <div className="mb-1.5 h-px w-5 bg-[#a68b5f]/30 group-hover:w-9 group-hover:bg-[#a68b5f]/60 transition-all duration-300" />

                        <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.26em] text-charcoal/45 group-hover:text-[#a68b5f] transition-colors">
                          SEE THIS KURTI
                          <ArrowUpRight className="h-3.5 w-3.5 -ml-0.5 transition-transform group-hover:translate-x-[5px]" />
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Multi-ring framing for object-like depth (cohesive with main hero) */}
                  <div className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-white/35" />
                  <div className="pointer-events-none absolute inset-[1px] rounded-[17px] ring-1 ring-inset ring-black/6" />


                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom trust bar — quiet, specific, crafted */}
        <div className="mt-14 lg:mt-16 border-t border-charcoal/10 pt-4">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] font-medium tracking-[0.28em] text-charcoal/50">
            <span>100% hand-finished</span>
            <span className="text-charcoal/20 hidden sm:inline">·</span>
            <span>Chanderi • Handloom • Mulberry silk</span>
            <span className="text-charcoal/20 hidden sm:inline">·</span>
            <span>MOQ 4 sets • Reliable restock</span>
          </div>
        </div>
      </div>

      {/* Very subtle decorative line (premium detail) */}
      <div aria-hidden className="pointer-events-none absolute right-14 top-[38%] hidden xl:block h-px w-20 bg-charcoal/8" />
    </section>
  );
}
