"use client";

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { buildCatalogRequestUrl, buildLinesheetInquiryUrl } from "@/lib/b2b/whatsapp";
import { LivingProductCard } from "@/components/ui/living-product-card";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function WishlistPage() {
  const { items, isWishlisted, toggleWishlist } = useWishlist();
  const { addItem, openCart } = useCart();
  const reduceMotion = useReducedMotion();

  const orderAllSaved = () => {
    items.forEach((product) => {
      addItem(product, "Set", product.colors[0], B2B_CONFIG.defaultLineSets);
    });
    openCart();
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />
      <main className="flex-1 px-4 pb-24 pt-28 sm:px-6 lg:px-10 lg:pt-36">
        <div className="mx-auto max-w-[1600px]">
          {/* Header */}
          <motion.header
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
            className="mb-12 border-b-2 border-line pb-6 lg:mb-16"
          >
            <p className="eyebrow text-accent-red">Buyer linesheet</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
              <h1 className="text-6xl font-black uppercase leading-[0.82] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
                Saved
              </h1>
              {items.length > 0 && (
                <p className="pb-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-content/45">
                  {items.length} {items.length === 1 ? "style" : "styles"}
                </p>
              )}
            </div>
            {items.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={orderAllSaved} className="btn-luxe">
                  Add all as sets
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <a
                  href={buildLinesheetInquiryUrl(items)}
                  className="btn-luxe-outline"
                >
                  Ask availability <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </motion.header>

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.ul
              layout
              className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {items.map((product, idx) => (
                  <motion.li
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      duration: 0.5,
                      ease: EASE,
                      delay: (idx % 8) * 0.05,
                    }}
                  >
                    <LivingProductCard
                      product={product}
                      isWishlisted={isWishlisted(product.id)}
                      onToggleWishlist={() => toggleWishlist(product)}
                      heightClass="aspect-[3/4] h-auto"
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden border border-line/20 bg-surface-2 py-24 text-center lg:py-32">
      <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[30vw] font-black uppercase leading-none tracking-[-0.08em] text-content/[0.04] sm:text-[16rem]">
        Saved
      </p>
      <p className="eyebrow eyebrow--bare relative text-accent-red">
        Linesheet
      </p>
      <h2 className="relative mt-4 max-w-[16ch] text-4xl font-black uppercase leading-[0.85] tracking-[-0.05em] sm:text-5xl">
        No wholesale styles saved yet.
      </h2>
      <p className="relative mt-5 max-w-sm text-sm leading-6 text-content/60">
        Save styles for your next catalog order, repeat buying list, or
        availability check on WhatsApp.
      </p>
      <div className="relative mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-luxe group">
          Explore wholesale catalog
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        <a href={buildCatalogRequestUrl()} className="btn-luxe-outline">
          WhatsApp catalog <MessageCircle className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
