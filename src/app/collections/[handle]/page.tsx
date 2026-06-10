"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  MOCK_COLLECTIONS,
  MOCK_PRODUCTS,
  getCollections,
  getProductsByCollection,
  type MockProduct,
} from "@/lib/shopify";
import { useWishlist } from "@/lib/wishlist-context";
import { LivingProductCard } from "@/components/ui/living-product-card";

type Collection = (typeof MOCK_COLLECTIONS)[number];
type CollectionTheme = { bg: string; text: string; accent: string };

const THEMES: Record<string, CollectionTheme> = {
  "summer-edit": {
    bg: "bg-[#FFF9F2]",
    text: "text-[#5C4533]",
    accent: "text-[#D98A5F]",
  },
  "festive-collection": {
    bg: "bg-[#F4F7F5]",
    text: "text-[#2C4A33]",
    accent: "text-[#7A9E7E]",
  },
  "bridal-exclusive": {
    bg: "bg-[#FCF5F5]",
    text: "text-[#5C3333]",
    accent: "text-[#C88A8A]",
  },
};
const DEFAULT_THEME = {
  bg: "bg-[#fcfbf9]",
  text: "text-charcoal",
  accent: "text-gold",
};

const PRODUCT_REEL_VIDEO = "/videos/background.mp4";

const SummerHero = ({
  collection,
  handle,
  theme,
}: {
  collection: Collection;
  handle: string;
  theme: CollectionTheme;
}) => {
  return (
    <div
      className={`relative w-full pt-28 pb-12 lg:pt-36 lg:pb-16 px-6 lg:px-20 overflow-hidden transition-colors duration-1000 ${theme.bg}`}
    >
      {/* Hand-drawn Doodles (Fills empty space) */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none opacity-30 ${theme.accent}`}
      >
        <svg
          className="absolute left-[35%] top-[25%] w-48 h-48 rotate-12"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 100 Q 100 20 180 100"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 8"
          />
          <text
            x="100"
            y="70"
            fontFamily="cursive"
            fontSize="16"
            fill="currentColor"
            textAnchor="middle"
            className="opacity-80 -rotate-6 italic"
          >
            Artisan Made
          </text>
        </svg>
        <svg
          className="absolute left-[48%] top-[65%] w-20 h-20 -rotate-12 animate-pulse"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 10 L55 45 L90 50 L55 55 L50 90 L45 55 L10 50 L45 45 Z"
            fill="currentColor"
            className="opacity-40"
          />
        </svg>
        <svg
          className="absolute left-[20%] bottom-[10%] w-48 h-48 -rotate-6 opacity-30"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="100"
            cy="100"
            r="80"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle
            cx="100"
            cy="100"
            r="60"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        {/* Left: Typography */}
        <div className="flex-[1.2] w-full relative z-20 order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-4 mb-6">
              <div className={`h-[1px] w-8 ${theme.accent} bg-current`} />
              <p
                className={`text-[9px] font-sans uppercase tracking-[0.4em] font-bold ${theme.accent}`}
              >
                Chapter 0
                {MOCK_COLLECTIONS.findIndex((c) => c.handle === handle) + 1}
              </p>
            </div>

            <h1
              className={`font-serif text-5xl md:text-7xl lg:text-[7.5rem] font-light tracking-tighter leading-[0.85] mb-6 -ml-1 ${theme.text}`}
            >
              {collection.title}
            </h1>

            <p
              className={`text-sm leading-relaxed font-serif max-w-sm pl-6 relative ${theme.text} opacity-80`}
            >
              <span
                className={`absolute left-0 top-1.5 h-[80%] w-[1px] ${theme.accent} bg-current opacity-30`}
              />
              {collection.description}
            </p>
          </motion.div>
        </div>

        {/* Right: Feature Image */}
        <div className="flex-[0.8] w-full relative z-10 order-1 lg:order-2 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: [0.25, 1, 0.5, 1] }}
            className="relative w-[90%] md:w-[70%] max-h-[50vh] aspect-[4/5] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
          >
            <Image
              src={collection.image}
              alt={collection.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
            <div
              className={`absolute inset-0 ${theme.text} mix-blend-overlay opacity-10 bg-current`}
            />
          </motion.div>

          {/* Decorative Floating Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="absolute -bottom-8 -left-4 lg:-bottom-12 lg:-left-24 w-28 h-28 lg:w-44 lg:h-44 rounded-full flex items-center justify-center backdrop-blur-md bg-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.05)] z-20"
          >
            <div
              className={`absolute inset-1 rounded-full border border-dashed opacity-30 ${theme.text}`}
            />
            <p
              className={`text-[9px] lg:text-[10px] uppercase tracking-[0.2em] -rotate-12 font-bold text-center leading-[1.4] ${theme.text}`}
            >
              Discover
              <br />
              The
              <br />
              Edit
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const LuxeHero = ({
  collection,
}: {
  collection: Collection;
  handle: string;
}) => {
  return (
    <div className="relative w-full pt-32 pb-20 lg:pt-40 lg:pb-24 px-6 lg:px-20 bg-[#1A1A1A] overflow-hidden border-b border-gold/20">
      {/* Background Ornaments */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 flex justify-center items-center">
        <svg
          className="w-[1200px] h-[1200px] text-gold animate-[spin_60s_linear_infinite]"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="0.1"
            strokeDasharray="1 3"
          />
          <circle
            cx="50"
            cy="50"
            r="35"
            stroke="currentColor"
            strokeWidth="0.1"
          />
        </svg>
      </div>

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10">
        {/* Ornate Image Collage */}
        <div className="flex-1 w-full flex justify-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
            className="relative w-[85%] md:w-[60%] aspect-[3/4] rounded-t-full border border-gold/30 p-2 overflow-hidden shadow-[0_0_50px_rgba(201,169,110,0.15)]"
          >
            <div className="relative w-full h-full rounded-t-full overflow-hidden">
              <Image
                src={collection.image}
                alt={collection.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gold/10 mix-blend-color" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30, y: 30 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="absolute -bottom-10 -left-6 lg:left-0 w-32 h-40 border border-gold/40 rounded-sm overflow-hidden shadow-2xl backdrop-blur-md bg-black/40 p-1"
          >
            <div className="relative w-full h-full border border-gold/20 flex flex-col items-center justify-center text-center p-2">
              <span className="text-gold font-serif italic text-xs mb-2">
                Since
              </span>
              <span className="text-gold font-sans text-xl tracking-widest">
                2026
              </span>
            </div>
          </motion.div>
        </div>

        {/* Elegant Typography */}
        <div className="flex-[1.2] w-full text-center lg:text-left flex flex-col items-center lg:text-left lg:items-start">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="flex items-center gap-4 mb-6 justify-center lg:justify-start">
              <div className="h-[1px] w-12 bg-gradient-to-r from-gold to-transparent" />
              <p className="text-[10px] font-sans uppercase tracking-[0.5em] text-gold">
                Heritage
              </p>
            </div>

            <h1 className="font-serif text-5xl md:text-7xl lg:text-[7.5rem] font-light tracking-tighter leading-[0.9] text-[#F5F5dc] mb-8 drop-shadow-lg">
              {collection.title}
            </h1>

            <div className="relative pl-6 lg:pl-8 border-l border-gold/30 max-w-md mx-auto lg:mx-0">
              <p className="text-sm leading-relaxed font-serif text-[#F5F5dc]/70">
                {collection.description}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const MinimalistHero = ({
  collection,
  handle,
}: {
  collection: Collection;
  handle: string;
}) => {
  return (
    <div className="relative w-full pt-32 pb-16 lg:pt-40 lg:pb-24 px-6 lg:px-20 bg-white flex flex-col justify-center min-h-[60vh] border-b border-charcoal/5 overflow-hidden">
      {/* Abstract Minimal Doodles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        {/* Top left grid */}
        <svg
          className="absolute left-10 top-10 w-40 h-40"
          viewBox="0 0 100 100"
        >
          <pattern
            id="grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#000"
              strokeWidth="0.5"
            />
          </pattern>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>

        {/* Big hollow circle behind text */}
        <svg
          className="absolute left-[30%] top-[40%] w-[500px] h-[500px] -translate-y-1/2"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#000"
            strokeWidth="0.1"
            fill="none"
          />
        </svg>

        {/* Crosshair accents */}
        <div className="absolute right-[15%] top-[20%] w-6 h-6 border-black/40 border-t border-l" />
        <div className="absolute right-[15%] bottom-[20%] w-6 h-6 border-black/40 border-b border-r" />
      </div>

      <div className="relative z-20 max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row items-center lg:items-end justify-between gap-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="flex-[1.2] w-full"
        >
          <div className="flex items-center gap-4 mb-12">
            <span className="w-2 h-2 bg-charcoal rounded-full" />
            <p className="text-[10px] font-sans uppercase tracking-[0.4em] font-medium text-charcoal/50">
              Vol. 0{MOCK_COLLECTIONS.findIndex((c) => c.handle === handle) + 1}
            </p>
          </div>

          <h1 className="font-sans text-5xl md:text-7xl lg:text-[7.5rem] font-bold tracking-tighter leading-[0.85] text-charcoal mb-8 uppercase">
            {collection.title}
          </h1>

          <div className="flex items-start gap-8">
            <div className="w-12 h-[1px] bg-charcoal/20 mt-2" />
            <p className="text-xs md:text-sm font-sans text-charcoal/60 max-w-sm uppercase tracking-widest leading-[1.8]">
              {collection.description}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
          className="flex-[0.8] w-full flex justify-end relative"
        >
          <div className="relative w-full md:w-[85%] aspect-[3/4] bg-gray-100 shadow-2xl p-4 bg-white/50 backdrop-blur-sm border border-charcoal/5">
            <div className="relative w-full h-full overflow-hidden">
              <Image
                src={collection.image}
                alt={collection.title}
                fill
                className="object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                priority
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
            </div>

            {/* Tech-inspired minimal label */}
            <div className="absolute -left-16 bottom-16 -rotate-90 origin-bottom-left text-[9px] font-mono tracking-widest text-charcoal/60 uppercase bg-white px-3 py-1 shadow-sm border border-charcoal/5">
              Fig. 1 — {collection.handle}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default function CollectionPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const [collection, setCollection] = useState<
    (typeof MOCK_COLLECTIONS)[number] | undefined
  >(MOCK_COLLECTIONS.find((c) => c.handle === handle));
  const [products, setProducts] = useState<MockProduct[]>(MOCK_PRODUCTS);
  const { isWishlisted, toggleWishlist } = useWishlist();

  const theme = collection
    ? THEMES[collection.handle] || DEFAULT_THEME
    : DEFAULT_THEME;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const allCollections = await getCollections();
      const found = allCollections.find((c) => c.handle === handle);
      if (mounted && found) {
        setCollection(found);
        const prods = await getProductsByCollection(found.id);
        if (mounted) setProducts(prods);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [handle]);

  if (!collection) {
    return (
      <>
        <Navbar />
        <main className="flex-1 relative z-10 bg-warm-white pt-32 px-6 lg:px-20 text-center min-h-[60vh] flex flex-col items-center justify-center">
          <h1 className="font-serif text-4xl text-charcoal mb-4">
            Collection Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The collection you are looking for does not exist.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-charcoal text-white px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Shop
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const isMinimalist = collection.handle === "the-minimalist";
  const isLuxe = collection.handle === "ethnic-luxe";

  const gridWrapperStyle = isLuxe
    ? "bg-[#1A1A1A] border-t border-gold/20"
    : isMinimalist
      ? "bg-[#fafafa] border-t border-charcoal/10"
      : "bg-warm-white border-t border-charcoal/5";

  const textColorStyle = isLuxe ? "text-gold/60" : "text-charcoal/40";

  // Layout Engine: CSS Grid for structured themes, CSS Columns (Masonry) for organic themes
  // Also ensuring mobile users always see 2 columns.
  const gridStyle = isMinimalist
    ? "grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4"
    : isLuxe
      ? "grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-10"
      : "columns-2 lg:columns-3 xl:columns-4 gap-4 lg:gap-8 space-y-4 lg:space-y-8";

  return (
    <>
      <Navbar />
      <main className="flex-1 relative z-10 bg-warm-white">
        {collection.handle === "the-minimalist" ? (
          <MinimalistHero collection={collection} handle={handle} />
        ) : collection.handle === "ethnic-luxe" ? (
          <LuxeHero collection={collection} handle={handle} />
        ) : (
          <SummerHero collection={collection} handle={handle} theme={theme} />
        )}

        {/* Product Showcase */}
        <div
          className={`px-4 lg:px-20 pt-8 pb-24 ${gridWrapperStyle} transition-colors duration-1000`}
        >
          <div className="flex items-center justify-between mb-8">
            <p
              className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] ${textColorStyle}`}
            >
              {products.length} piece{products.length !== 1 ? "s" : ""}
            </p>
          </div>

          <motion.div layout className={`${gridStyle} pb-24`}>
            <AnimatePresence mode="popLayout">
              {products.map((product, idx) => {
                const hasVideo = idx % 3 === 0 || idx % 4 === 0;
                const videoUrl = hasVideo ? PRODUCT_REEL_VIDEO : undefined;
                const isLiving = idx % 4 === 0;

                // Dynamic proportions based on collection aesthetic
                let heightClass = "";
                if (isMinimalist) {
                  // Brutalist, sharp, square-ish proportions
                  heightClass =
                    "aspect-[4/5] lg:aspect-square h-auto !rounded-none !shadow-none !border !border-charcoal/10 !bg-white";
                } else if (isLuxe) {
                  // Ornate, tall portraits
                  heightClass =
                    "aspect-[3/4] h-auto !rounded-[2rem] lg:!rounded-t-full !shadow-[0_10px_40px_rgba(201,169,110,0.1)] !border !border-gold/10 !bg-black";
                } else {
                  // Organic Masonry heights (shorter for mobile, tall for desktop)
                  const masonryHeights = [
                    "h-[250px] lg:h-[450px]",
                    "h-[300px] lg:h-[550px]",
                    "h-[350px] lg:h-[650px]",
                  ];
                  heightClass = masonryHeights[idx % 3];
                }

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.6, delay: (idx % 10) * 0.05 }}
                    className={
                      isMinimalist || isLuxe ? "w-full" : "break-inside-avoid"
                    }
                  >
                    <LivingProductCard
                      product={product}
                      isWishlisted={isWishlisted(product.id)}
                      onToggleWishlist={() => toggleWishlist(product)}
                      videoUrl={videoUrl}
                      isLiving={isLiving}
                      heightClass={heightClass}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
