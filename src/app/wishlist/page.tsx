"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/shopify";

// A playful handwritten font style
const doodleFont = {
  fontFamily: '"Kalam", "Caveat", "Comic Sans MS", cursive',
};

export default function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addItem } = useCart();

  // ── EMPTY CANVAS STATE ──
  if (items.length === 0) {
    return (
      <div className="bg-[#fcfbf9] min-h-screen text-charcoal flex flex-col font-sans selection:bg-gold selection:text-white">
        <Navbar />
        <main className="flex-1 relative flex flex-col items-center justify-center pt-32 pb-24 px-6 overflow-hidden">
          {/* Subtle Background Glows */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-300/10 rounded-full blur-[120px]" />
            <div className="absolute right-1/4 bottom-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 w-full max-w-lg text-center flex flex-col items-center"
          >
            {/* The Empty Frame Doodle */}
            <div className="relative w-48 h-48 mb-8">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-charcoal/20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Hand drawn frame */}
                <path
                  d="M10,10 Q50,8 90,12 Q92,50 88,90 Q50,92 12,88 Q8,50 10,10 Z"
                  strokeDasharray="5 5"
                />
                <path d="M12,12 L88,10 L90,88 L10,90 Z" />
                {/* Question mark doodle */}
                <path d="M40,35 C40,25 60,25 60,35 C60,45 50,45 50,55" />
                <circle cx="50" cy="65" r="2" fill="currentColor" />
              </svg>

              {/* Cute heart doodle floating */}
              <motion.svg
                animate={{ y: [-5, 5, -5], rotate: [-5, 5, -5] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                viewBox="0 0 24 24"
                className="absolute -top-4 -right-4 w-10 h-10 text-gold"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </motion.svg>
            </div>

            <h1 className="font-serif text-4xl text-charcoal mb-4 relative">
              Your canvas is empty...
              {/* Scribble underline */}
              <svg
                className="absolute -bottom-2 left-0 w-full h-3 text-gold/60"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M0,5 Q20,0 40,8 T80,2 T100,6" />
              </svg>
            </h1>

            <p className="text-xl text-charcoal/50 mb-12" style={doodleFont}>
              Start pinning your favorite pieces here!
            </p>

            <div className="relative">
              <Link
                href="/shop"
                className="relative z-10 px-8 py-4 bg-charcoal text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-black hover:scale-[1.02] transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.1)] inline-block"
              >
                Explore Collection
              </Link>

              {/* Arrow pointing to button */}
              <svg
                className="absolute -top-16 -left-16 w-20 h-20 text-charcoal/40 -rotate-12"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10,80 Q30,20 80,40" />
                <path d="M70,30 L80,40 L70,50" />
              </svg>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── MOODBOARD FILLED STATE ──
  return (
    <div className="bg-[#f2efe9] min-h-screen text-charcoal flex flex-col font-sans selection:bg-gold selection:text-white">
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 pb-32 overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-300/10 rounded-full blur-[120px]" />
          <div className="absolute right-1/4 bottom-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 relative z-10">
          {/* Header - Doodle Style */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 relative">
            <div className="relative">
              <p className="text-2xl text-gold mb-1" style={doodleFont}>
                My Dream Board
              </p>
              <h1 className="font-serif text-5xl md:text-7xl text-charcoal tracking-tighter">
                The Collection
              </h1>
              <svg
                className="absolute -bottom-6 -right-12 w-24 h-24 text-charcoal/20"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d="M20,20 Q80,20 80,80 Q20,80 20,20"
                  strokeDasharray="4 4"
                />
                <path d="M30,50 L50,70 L70,30" />
              </svg>
            </div>

            <div className="flex items-center gap-6 relative z-10">
              <div className="flex flex-col items-end">
                <p className="text-xl text-charcoal/60" style={doodleFont}>
                  {items.length} piece{items.length !== 1 ? "s" : ""} pinned
                </p>
              </div>
              <button
                onClick={clearWishlist}
                className="group relative px-6 py-3 bg-white border border-charcoal/10 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100 shadow-sm"
              >
                Clear Board
              </button>
            </div>
          </div>

          {/* Polaroid Scatter Layout */}
          <div className="relative min-h-[60vh] w-full flex flex-wrap justify-center md:justify-start gap-8 md:gap-12 lg:gap-16 pt-8">
            <AnimatePresence>
              {items.map((product, idx) => {
                // Deterministic pseudo-randomness based on index so it doesn't hydrate mismatch
                const rotate = (idx % 2 === 0 ? 1 : -1) * (2 + (idx % 4) * 1.5);
                const translateY = (idx % 3) * 15;
                const tapeColor =
                  idx % 2 === 0 ? "bg-[#e2dac3]/80" : "bg-white/60";

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, rotate: rotate - 10 }}
                    animate={{ opacity: 1, scale: 1, rotate, y: translateY }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 0 }}
                    transition={{
                      duration: 0.5,
                      type: "spring",
                      stiffness: 100,
                      damping: 15,
                    }}
                    className="relative group cursor-grab active:cursor-grabbing w-[280px] sm:w-[320px] shrink-0 z-10 hover:z-50"
                  >
                    {/* The Polaroid Card */}
                    <div className="bg-white p-4 pb-12 shadow-[2px_10px_30px_rgba(0,0,0,0.1)] group-hover:shadow-[10px_30px_50px_rgba(0,0,0,0.2)] transition-shadow duration-500 border border-charcoal/5 relative">
                      {/* Masking Tape */}
                      <div
                        className={`absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 ${tapeColor} backdrop-blur-sm -rotate-2 shadow-sm z-20`}
                        style={{
                          clipPath:
                            "polygon(0% 10%, 5% 0%, 95% 5%, 100% 15%, 98% 90%, 95% 100%, 5% 95%, 0% 85%)",
                        }}
                      />

                      {/* Close button (looks like a red scribble mark on hover) */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFromWishlist(product.id);
                        }}
                        className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-charcoal/40 hover:text-red-500 transition-colors z-30 opacity-0 group-hover:opacity-100"
                        title="Remove from board"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      {/* Image */}
                      <Link
                        href={`/shop/${product.handle}`}
                        className="block relative aspect-[3/4] bg-[#f4efe6] overflow-hidden mb-4"
                      >
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-[1s]"
                          sizes="(max-width: 768px) 100vw, 320px"
                        />
                      </Link>

                      {/* Info & Add to Cart */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div>
                          <p
                            className="text-xl text-charcoal/80 leading-none"
                            style={doodleFont}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                              Add to Cart
                            </span>
                            {product.title.length > 18
                              ? product.title.slice(0, 18) + "..."
                              : product.title}
                          </p>
                          <p className="text-xs font-bold text-charcoal/40 uppercase tracking-widest mt-1">
                            {formatPrice(product.salePrice ?? product.price)}
                          </p>
                        </div>

                        <button
                          onClick={() => addItem(product, product.sizes[0])}
                          className="w-10 h-10 rounded-full border border-charcoal/20 flex items-center justify-center text-charcoal hover:bg-charcoal hover:border-charcoal hover:text-white transition-all shadow-sm hover:scale-105"
                          title="Acquire"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Random Doodle Annotations (Only visible on hover) */}
                      <svg
                        className="absolute -bottom-6 -left-6 w-16 h-16 text-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        viewBox="0 0 100 100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {idx % 2 === 0 ? (
                          <path d="M20,50 Q50,20 80,50 Q50,80 20,50" />
                        ) : (
                          <path d="M20,20 L80,80 M80,20 L20,80" />
                        )}
                      </svg>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
