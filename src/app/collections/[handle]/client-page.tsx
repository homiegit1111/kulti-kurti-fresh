"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

type Collection = (typeof MOCK_COLLECTIONS)[number];

const EASE = [0.16, 1, 0.3, 1] as const;
const PRODUCT_REEL_VIDEO = "/videos/background.mp4";

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
      <div className="mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Typography */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <p className="eyebrow text-accent-lime">
            Chapter {String(chapter).padStart(2, "0")} / Collection
          </p>
          <h1 className="mt-5 max-w-[13ch] text-[clamp(3rem,9vw,8rem)] font-black uppercase leading-[0.82] tracking-[-0.075em]">
            {collection.title}
          </h1>
          <p className="mt-7 max-w-[42ch] border-l-2 border-accent-lime pl-5 text-sm leading-6 text-content-inverse/65">
            {collection.description}
          </p>
        </motion.div>

        {/* Hero image with lime corner chip */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.48, ease: EASE }}
          className="relative"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#2a2a26] lg:aspect-[3/4]">
            <Image
              src={collection.image}
              alt={collection.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />
            <span className="absolute left-4 top-4 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-on-accent">
              {collection.handle}
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

        {/* Product Showcase */}
        <div className="bg-surface px-4 pb-24 pt-12 sm:px-6 lg:px-10 lg:pt-16">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-8 flex items-center justify-between border-b border-line/25 pb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/45 lg:text-[10px]">
                {products.length} piece{products.length !== 1 ? "s" : ""} in this
                chapter
              </p>
              <Link
                href="/shop"
                className="text-[9px] font-bold uppercase tracking-[0.2em] text-content underline decoration-accent-red decoration-2 underline-offset-4"
              >
                All inventory
              </Link>
            </div>

            <motion.div
              layout
              className="grid grid-cols-2 gap-3 pb-8 sm:gap-4 lg:grid-cols-4 lg:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {products.map((product, idx) => {
                  const hasVideo = idx % 3 === 0 || idx % 4 === 0;
                  const videoUrl = hasVideo ? PRODUCT_REEL_VIDEO : undefined;
                  const isLiving = idx % 4 === 0;

                  return (
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
                        videoUrl={videoUrl}
                        isLiving={isLiving}
                        heightClass="aspect-[3/4] h-auto"
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
