"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  MOCK_COLLECTIONS,
  MOCK_PRODUCTS,
  getCollections,
  getProductsByCollection,
  type MockProduct,
} from "@/lib/commerce/catalog";
import { useWishlist } from "@/lib/wishlist-context";
import { LivingProductCard } from "@/components/ui/living-product-card";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

type Collection = (typeof MOCK_COLLECTIONS)[number];

const EASE = [0.16, 1, 0.3, 1] as const;

const pad = (n: number) => String(n).padStart(2, "0");

const CollectionHero = ({
  collection,
  handle,
}: {
  collection: Collection;
  handle: string;
}) => {
  const reduceMotion = useReducedMotion();
  const chapter =
    MOCK_COLLECTIONS.findIndex((c) => c.handle === handle) + 1 || 1;

  return (
    <section className="relative overflow-hidden bg-surface-inverse px-4 pb-14 pt-28 text-content-inverse sm:px-6 lg:px-10 lg:pb-20 lg:pt-40">
      {/* giant faded chapter numeral — editorial backdrop device */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 bottom-0 select-none text-[38vw] font-black leading-[0.75] text-content-inverse/5 lg:text-[24vw]"
      >
        {pad(chapter)}
      </div>

      <div className="relative mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Typography */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <Link
            href="/collections"
            className="group mb-7 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-content-inverse/50 transition-colors hover:text-accent-lime"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            All chapters
          </Link>
          <p className="eyebrow text-accent-lime">
            Chapter {pad(chapter)} / Collection
          </p>
          <h1 className="mt-5 max-w-[13ch] text-[clamp(3rem,9vw,8rem)] font-black uppercase leading-[0.82] tracking-[-0.075em]">
            {collection.title}
          </h1>
          <p className="mt-7 max-w-[42ch] border-l-2 border-accent-lime pl-5 text-sm leading-6 text-content-inverse/65">
            {collection.description}
          </p>

          {/* trade terms strip — cream micro-labels with lime ticks */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-[0.22em] text-content-inverse/45">
            {[
              `MOQ ${B2B_CONFIG.minimumOrderSets} sets`,
              `${SIZE_RATIO_LABEL} ratio packs`,
              "WhatsApp ordering",
            ].map((spec) => (
              <span key={spec} className="flex items-center gap-2">
                <span className="h-1 w-1 bg-accent-lime" aria-hidden="true" />
                {spec}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Hero image with lime corner chip */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.48, ease: EASE }}
          className="relative"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-content-inverse/10 lg:aspect-[3/4]">
            <Image
              src={collection.image}
              alt={collection.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />
            <span className="absolute left-0 top-0 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-on-accent">
              {collection.handle}
            </span>
            <span className="absolute right-4 top-4 border border-white/40 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
              Chapter {pad(chapter)}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default function CollectionDetailClient({
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
  const reduceMotion = useReducedMotion();

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
        <main className="flex flex-1 flex-col items-center justify-center bg-surface px-6 pt-32 text-center text-content lg:px-10">
          <p className="eyebrow eyebrow--bare text-accent-red">404 / Not found</p>
          <h1 className="mt-4 text-5xl font-black uppercase leading-[0.85] tracking-[-0.06em] sm:text-7xl">
            Collection not found.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-content/60">
            The collection you are looking for does not exist.
          </p>
          <Link href="/shop" className="btn-luxe mt-10">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to shop
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-surface text-content">
        <CollectionHero collection={collection} handle={handle} />

        {/* ── The rail — curated product grid ─────────────────────────── */}
        <div className="bg-surface px-4 pb-20 pt-14 sm:px-6 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-[1600px]">
            {/* rail head — section-scale, not a throwaway count line */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.65, ease: EASE }}
              className="mb-10 border-b-2 border-line pb-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="eyebrow">The rail / Curated styles</p>
                  <h2 className="mt-3 max-w-[14ch] text-4xl font-black uppercase leading-[0.85] tracking-[-0.05em] sm:text-6xl">
                    Inside this chapter.
                  </h2>
                </div>
                <div className="flex items-center gap-6 md:pb-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/45 lg:text-[10px]">
                    {products.length} piece{products.length !== 1 ? "s" : ""} on
                    the rail
                  </p>
                  <Link
                    href="/shop"
                    className="text-[9px] font-bold uppercase tracking-[0.2em] text-content underline decoration-accent-red decoration-2 underline-offset-4"
                  >
                    All inventory
                  </Link>
                </div>
              </div>
              <p className="mt-4 max-w-[52ch] text-sm leading-6 text-content/55">
                Every style ships as a {SIZE_RATIO_LABEL} ratio set — mix
                chapters to reach MOQ and keep the rack varied.
              </p>
            </motion.div>

            <motion.div
              layout
              className="grid grid-cols-2 gap-3 pb-8 sm:gap-4 lg:grid-cols-4 lg:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {products.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.6,
                      ease: EASE,
                      delay: (idx % 8) * 0.05,
                    }}
                    className="w-full"
                  >
                    <LivingProductCard
                      product={product}
                      isWishlisted={isWishlisted(product.id)}
                      onToggleWishlist={() => toggleWishlist(product)}
                      heightClass="aspect-[3/4] h-auto"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* ── Chapter CTA band ────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-accent-red px-4 py-12 text-white sm:px-6 lg:px-10 lg:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-12 select-none text-[28vw] font-black uppercase leading-none text-black/8"
          >
            {collection.title.trim().charAt(0).toUpperCase() || "R"}
          </div>
          <div className="relative mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-12 lg:items-end">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.65, ease: EASE }}
              className="lg:col-span-8"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">
                Chapter to checkout
              </p>
              <h2 className="mt-4 max-w-[13ch] text-[clamp(2.8rem,7vw,7rem)] font-black uppercase leading-[0.78] tracking-[-0.075em]">
                Rack this chapter.
              </h2>
            </motion.div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
              className="lg:col-span-4"
            >
              <p className="max-w-md text-sm leading-7 text-white/70">
                Add sets straight from the rail, or send the chapter to the
                bulk desk for mixed-style pricing and dispatch timelines.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/bulk-order"
                  className="linebook-button border-white bg-white text-on-accent hover:bg-accent-lime"
                >
                  Open bulk desk <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href={buildCatalogRequestUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="linebook-button border-white/50 text-white hover:border-white"
                >
                  WhatsApp catalogue <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
