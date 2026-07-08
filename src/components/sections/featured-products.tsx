"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Check } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  MOCK_PRODUCTS,
  getProducts,
  formatPrice,
  COLOR_MAP,
  type MockProduct,
} from "@/lib/commerce/catalog";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";

const categories = ["All", "Kurtis", "Lehengas", "Co-ords", "Sarees"];

/* ── Component ── */
export default function FeaturedProducts() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [addedProduct, setAddedProduct] = useState<string | null>(null);
  const addTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Initialized to mock data so the homepage is never empty; replaced on mount with real data.
  const [products, setProducts] = useState<MockProduct[]>(
    MOCK_PRODUCTS.slice(0, 8),
  );

  useEffect(() => {
    getProducts(8).then((data) => setProducts(data));
  }, []);

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? products
        : products.filter((p) => p.category === activeCategory),
    [activeCategory, products],
  );

  const handleQuickAdd = useCallback(
    (product: MockProduct, size: string) => {
      if (addTimeoutRef.current) clearTimeout(addTimeoutRef.current);
      if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);

      setAddingToCart(product.id);
      addTimeoutRef.current = setTimeout(() => {
        addItem(product, size);
        setAddingToCart(null);
        setAddedProduct(product.id);
        addTimeoutRef.current = null;
        addedTimeoutRef.current = setTimeout(() => {
          setAddedProduct(null);
          addedTimeoutRef.current = null;
        }, 2000);
      }, 600); // Simulate network latency
    },
    [addItem],
  );

  useEffect(() => {
    return () => {
      if (addTimeoutRef.current) clearTimeout(addTimeoutRef.current);
      if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    };
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="content-auto hidden md:block px-6 py-24 md:py-32 lg:px-20 relative overflow-hidden">
      {/* Aesthetic Doodles for empty space */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg
          className="absolute left-10 top-10 w-48 h-48 text-gold/70 -rotate-12"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M50 150 Q 150 180 180 50 T 50 150"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            fill="none"
          />
          <path
            d="M40 140 L 50 150 L 65 145"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <text
            x="120"
            y="80"
            fontFamily="cursive"
            fontSize="14"
            fill="currentColor"
            className="opacity-90 rotate-12"
          >
            Must Haves
          </text>
        </svg>
        <svg
          className="absolute right-20 top-20 w-64 h-64 text-charcoal/20 animate-[spin_60s_linear_infinite]"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle
            cx="50"
            cy="50"
            r="30"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
        <div className="absolute right-[-5%] top-[10%] w-64 h-64 bg-orange-300/30 rounded-full blur-[60px]" />
      </div>

      {/* ── Section header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12"
      >
        <div className="inline-flex items-center gap-3">
          <span className="h-[1px] w-6 bg-gold" />
          <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
            Curated For You
          </p>
          <span className="h-[1px] w-6 bg-gold" />
        </div>
        <h2 className="mt-3 font-serif text-3xl md:text-5xl text-charcoal font-light">
          Seasonal{" "}
          <span className="font-serif italic font-normal text-gold">
            Must-Haves
          </span>
        </h2>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Explore our most coveted silhouettes, tailored to absolute perfection
          with hand-embroidered details and premium natural textiles.
        </p>
      </motion.div>

      {/* ── Category tabs ── */}
      <div className="no-scrollbar flex gap-4 overflow-x-auto justify-start md:justify-center pb-2 mb-12 border-b border-charcoal/5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`relative py-3 px-4 text-xs font-semibold uppercase tracking-widest transition-colors duration-300 shrink-0 ${
              activeCategory === cat
                ? "text-gold"
                : "text-muted-foreground hover:text-charcoal"
            }`}
          >
            <span>{cat}</span>
            {activeCategory === cat && (
              <motion.span
                layoutId="featuredCategory"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold"
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Product grid ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
      >
        <AnimatePresence mode="sync">
          {filtered.map((product) => {
            const isWishlist = isWishlisted(product.id);
            const isAdding = addingToCart === product.id;
            const isAdded = addedProduct === product.id;

            return (
              <motion.div
                key={product.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  transition: { duration: 0.15 },
                }}
                className="group flex flex-col bg-white border border-charcoal/5 hover:shadow-lg transition-shadow duration-300"
                style={{
                  willChange: "opacity, transform",
                  backfaceVisibility: "hidden",
                }}
              >
                {/* Image Container */}
                <Link
                  href={`/shop/${product.handle}`}
                  className="relative aspect-[3/4] overflow-hidden bg-warm-gray block"
                >
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,_1,_0.5,_1)] group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />

                  {/* Badges */}
                  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                    {product.salePrice && (
                      <span className="bg-destructive/90 backdrop-blur px-2.5 py-1 text-[9px] font-semibold tracking-widest text-white uppercase border border-white/10">
                        Sale
                      </span>
                    )}
                    {product.isNew && (
                      <span className="bg-charcoal/90 backdrop-blur px-2.5 py-1 text-[9px] font-semibold tracking-widest text-white uppercase border border-white/10">
                        New
                      </span>
                    )}
                  </div>

                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleWishlist(product);
                    }}
                    className={`absolute right-3 top-3 rounded-full bg-white/95 backdrop-blur p-2 shadow-md transition-[opacity,transform] duration-300 hover:scale-110 md:opacity-0 group-hover:opacity-100 ${
                      isWishlist
                        ? "text-red-500 scale-110 !opacity-100"
                        : "text-charcoal hover:text-gold"
                    }`}
                    aria-label={`Wishlist ${product.title}`}
                  >
                    <Heart
                      className={`h-4 w-4 ${isWishlist ? "fill-current" : ""}`}
                    />
                  </button>

                  {/* Quick Add Tray Overlay */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-charcoal/95 backdrop-blur p-4 transition-transform duration-500 ease-[cubic-bezier(0.25,_1,_0.5,_1)] group-hover:translate-y-0 flex flex-col gap-2">
                    <p className="text-[10px] text-white/60 uppercase tracking-widest text-center">
                      Add Wholesale Set
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {product.sizes.slice(0, 1).map((size) => (
                        <button
                          key={size}
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuickAdd(product, size);
                          }}
                          disabled={isAdding || isAdded}
                          className="bg-white/10 hover:bg-gold hover:text-white transition-colors duration-200 text-[10px] font-semibold text-white px-3 py-1.5 min-w-[90px] border border-white/10 uppercase tracking-[0.12em]"
                        >
                          1 Set
                        </button>
                      ))}
                    </div>
                  </div>
                </Link>

                {/* Product Info Block */}
                <div className="p-4 flex-1 flex flex-col justify-between border-t border-charcoal/5">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      {product.category}
                    </p>
                    <Link href={`/shop/${product.handle}`}>
                      <h3 className="text-sm font-serif font-medium text-charcoal hover:text-gold transition-colors duration-300 line-clamp-1">
                        {product.title}
                      </h3>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-charcoal/5">
                    {/* Prices */}
                    <div className="flex items-center gap-2">
                      {product.salePrice ? (
                        <>
                          <span className="text-sm font-semibold text-charcoal">
                            From {formatPrice(product.salePrice)}/set
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-charcoal">
                          From {formatPrice(product.price)}/set
                        </span>
                      )}
                    </div>

                    {/* Colors or Cart indicator */}
                    <div className="flex items-center gap-2">
                      {isAdded ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold uppercase tracking-wider">
                          <Check className="h-3 w-3" /> Added
                        </span>
                      ) : isAdding ? (
                        <span className="text-[10px] text-gold font-semibold uppercase tracking-wider animate-pulse">
                          Adding...
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          {product.colors.map((color) => (
                            <span
                              key={color}
                              className="block h-2.5 w-2.5 rounded-full border border-charcoal/10"
                              style={{
                                backgroundColor: COLOR_MAP[color] ?? "#ccc",
                              }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="px-4 pb-4 text-[10px] uppercase tracking-[0.16em] text-charcoal/40">
                    {formatPrice(
                      getPerPiecePrice(product.salePrice ?? product.price),
                    )}
                    /pc - 1 set = {B2B_CONFIG.setSize} pcs
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
