"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, X, ArrowRight, Check } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { formatPrice, type MockProduct } from "@/lib/shopify";

export default function WishlistPage() {
  const { items, removeFromWishlist } = useWishlist();

  return (
    <div className="bg-warm-white min-h-screen text-charcoal font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 lg:pt-36 pb-24 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-10 lg:mb-14">
            <p className="eyebrow mb-3">Saved For Later</p>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-none">
                Your <span className="italic">Wishlist</span>
              </h1>
              {items.length > 0 && (
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-charcoal/40 pb-1.5">
                  {items.length} {items.length === 1 ? "Piece" : "Pieces"}
                </p>
              )}
            </div>
          </header>

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.ul
              layout
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12"
            >
              <AnimatePresence mode="popLayout">
                {items.map((product) => (
                  <WishlistCard
                    key={product.id}
                    product={product}
                    onRemove={() => removeFromWishlist(product.id)}
                  />
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
    <div className="relative flex flex-col items-center justify-center text-center py-24 lg:py-32 border border-charcoal/10 bg-white frame-luxe overflow-hidden">
      <p className="font-serif text-[90px] lg:text-[130px] leading-none text-charcoal/[0.05] select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] pointer-events-none">
        Beloved
      </p>
      <div className="relative w-14 h-14 rounded-full border border-gold/40 flex items-center justify-center mb-6">
        <Heart className="w-5 h-5 text-gold-dark" strokeWidth={1} />
      </div>
      <h2 className="relative font-serif text-3xl sm:text-4xl font-light mb-4">
        Nothing saved — <span className="italic">yet.</span>
      </h2>
      <p className="relative text-sm text-charcoal/50 max-w-sm mb-10 leading-relaxed">
        Tap the heart on any piece you love and it will wait for you here —
        from everyday cottons to festive silks.
      </p>
      <Link href="/shop" className="relative btn-luxe group">
        Explore the Collection
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
      </Link>
    </div>
  );
}

function WishlistCard({
  product,
  onRemove,
}: {
  product: MockProduct;
  onRemove: () => void;
}) {
  const { addItem } = useCart();
  const [sizeOpen, setSizeOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const soldOut = product.availableForSale === false;
  const onSale =
    product.salePrice != null && product.salePrice < product.price;

  const handleAdd = (size: string) => {
    addItem(product, size, product.colors[0]);
    setSizeOpen(false);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="group relative flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#efece6] mb-4">
        <Link href={`/shop/${product.handle}`} className="block w-full h-full">
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.04]"
          />
        </Link>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${product.title} from wishlist`}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-charcoal/60 hover:text-charcoal hover:bg-white shadow-sm transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {soldOut && (
          <span className="absolute top-3 left-3 bg-charcoal/85 text-white text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full">
            Sold Out
          </span>
        )}
        {!soldOut && onSale && (
          <span className="absolute top-3 left-3 bg-gold text-white text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full">
            On Sale
          </span>
        )}

        {/* Quick add — size pop-over */}
        {!soldOut && (
          <div className="absolute inset-x-3 bottom-3">
            <AnimatePresence mode="wait">
              {sizeOpen ? (
                <motion.div
                  key="sizes"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/95 backdrop-blur-md rounded-xl p-2 shadow-lg"
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-charcoal/40 text-center mb-1.5 mt-1">
                    Select Size
                  </p>
                  <div className="flex gap-1.5 justify-center flex-wrap">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleAdd(size)}
                        className="min-w-9 h-9 px-2 rounded-lg text-xs font-bold bg-[#f2efe9] hover:bg-charcoal hover:text-white transition-colors"
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="cta"
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSizeOpen(true)}
                  className={`w-full h-11 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] shadow-md transition-all lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 ${
                    added
                      ? "bg-[#2a4d3e] text-white"
                      : "bg-white/95 backdrop-blur-md text-charcoal hover:bg-charcoal hover:text-white"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" /> Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> Add to Cart
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Meta */}
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gold mb-1.5">
        {product.category}
      </p>
      <Link
        href={`/shop/${product.handle}`}
        className="font-serif text-base sm:text-lg leading-snug mb-1 hover:text-gold-dark transition-colors"
      >
        {product.title}
      </Link>
      <p className="text-sm">
        <span className="font-medium">
          {formatPrice(product.salePrice ?? product.price)}
        </span>
        {onSale && (
          <span className="ml-2 text-charcoal/35 line-through text-xs">
            {formatPrice(product.price)}
          </span>
        )}
      </p>
    </motion.li>
  );
}
