"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Check, ShoppingBag, X, Plus, MoveRight } from "lucide-react";
import {
  MOCK_PRODUCTS,
  formatPrice,
  COLOR_MAP,
  type MockProduct,
} from "@/lib/commerce/catalog";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";

// Local media avoids third-party video latency on mobile networks.
const PRODUCT_REEL_VIDEO = "/videos/background.mp4";

export default function MobileTikTokFeed() {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const feedProducts = useMemo(
    () =>
      MOCK_PRODUCTS.slice(0, 5).map((p, i) => ({
        ...p,
        videoUrl: i % 2 === 0 ? PRODUCT_REEL_VIDEO : undefined, // Alternate video and image
      })),
    [],
  );

  return (
    <section className="content-auto block md:hidden bg-charcoal w-full py-12 relative overflow-hidden">
      {/* Decorative Doodles */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg
          className="absolute top-10 left-[-20px] w-32 h-32 text-gold animate-pulse-slow"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        >
          <path d="M10,50 Q30,20 50,50 T90,50" strokeDasharray="5,5" />
          <circle cx="90" cy="50" r="3" fill="currentColor" />
        </svg>
        <svg
          className="absolute bottom-20 right-[-10px] w-40 h-40 text-white"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <path d="M20,80 C20,80 40,30 80,40 C90,42 95,50 85,60 C75,70 50,75 50,75" />
          <path d="M85,60 L95,65 M85,60 L80,70" />
        </svg>
      </div>

      {/* Title */}
      <div className="w-full z-20 px-6 pt-4 pb-6 flex justify-between items-end">
        <div>
          <p className="text-[9px] uppercase tracking-[0.4em] text-gold font-semibold mb-1 flex items-center gap-2">
            Discover <MoveRight className="h-3 w-3 animate-bounce-horizontal" />
          </p>
          <h2 className="font-serif text-2xl text-white font-light">
            Seasonal Must-Haves
          </h2>
        </div>
      </div>

      {/* Horizontal Snap Scroll Container */}
      <div
        className="scroll-snap-x w-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory no-scrollbar relative z-10 px-6 pb-8 items-center gap-5"
        style={{
          touchAction: "pan-x",
          WebkitOverflowScrolling: "touch" as never,
        }}
      >
        {feedProducts.map((product) => (
          <FeedItem
            key={product.id}
            product={product}
            addItem={addItem}
            isWishlisted={isWishlisted(product.id)}
            toggleWishlist={() => toggleWishlist(product)}
          />
        ))}
        {/* End Spacer */}
        <div className="flex-none w-6 h-full" />
      </div>
    </section>
  );
}

const FeedItem = memo(function FeedItem({
  product,
  addItem,
  isWishlisted,
  toggleWishlist,
}: {
  product: MockProduct & { videoUrl?: string };
  addItem: (
    product: MockProduct,
    size: string,
    color?: string,
    sets?: number,
  ) => void;
  isWishlisted: boolean;
  toggleWishlist: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [added, setAdded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const addTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intersection observer to play/pause video when in view
  useEffect(() => {
    if (!videoRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.6 },
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  const handleAdd = useCallback(() => {
    if (addTimeoutRef.current) clearTimeout(addTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    setAddingToCart(true);
    addTimeoutRef.current = setTimeout(() => {
      addItem(product, "Set", selectedColor, 1);
      setAddingToCart(false);
      setAdded(true);
      addTimeoutRef.current = null;
      closeTimeoutRef.current = setTimeout(() => {
        setAdded(false);
        setDrawerOpen(false);
        closeTimeoutRef.current = null;
      }, 1500);
    }, 600);
  }, [addItem, product, selectedColor]);

  useEffect(() => {
    return () => {
      if (addTimeoutRef.current) clearTimeout(addTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="flex-none w-[85vw] h-[60vh] min-h-[450px] max-h-[600px] snap-center relative bg-charcoal rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-white/10 group"
      style={{
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
    >
      {/* Background Media */}
      {product.videoUrl ? (
        <video
          ref={videoRef}
          src={product.videoUrl}
          poster={product.image}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover"
          sizes="100vw"
        />
      )}

      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent pointer-events-none" />

      {/* Content Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between z-10 pb-12">
        {/* Left Side: Product Info */}
        <div className="flex-1 pr-4">
          <p className="text-[10px] uppercase tracking-widest text-gold font-semibold mb-1 shadow-black drop-shadow-md">
            {product.category}
          </p>
          <h3 className="font-serif text-2xl text-white font-light mb-1 shadow-black drop-shadow-md">
            {product.title}
          </h3>
          <p className="text-sm font-semibold text-white/90 shadow-black drop-shadow-md">
            From {formatPrice(product.salePrice ?? product.price)}/set
          </p>
          <p className="text-xs text-white/65 shadow-black drop-shadow-md">
            {formatPrice(getPerPiecePrice(product.salePrice ?? product.price))}
            /pc
          </p>
        </div>

        {/* Right Side: Actions (Like TikTok Sidebar) */}
        <div className="flex flex-col items-center gap-6 pb-2">
          <button
            onClick={toggleWishlist}
            aria-label={
              isWishlisted
                ? `Remove ${product.title} from wishlist`
                : `Add ${product.title} to wishlist`
            }
            className="flex flex-col items-center gap-1 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-full"
          >
            <div
              className={`p-3 rounded-full backdrop-blur-md transition-colors ${isWishlisted ? "bg-gold/20" : "bg-white/10"}`}
            >
              <Heart
                className={`h-6 w-6 transition-colors ${isWishlisted ? "fill-gold text-gold" : "text-white"}`}
                strokeWidth={1.5}
              />
            </div>
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            aria-label={`Open quick buy for ${product.title}`}
            className="flex flex-col items-center gap-1 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-full"
          >
            <div className="p-3 rounded-full bg-gold/90 backdrop-blur-md shadow-lg animate-pulse-slow">
              <ShoppingBag
                className="h-6 w-6 text-charcoal"
                strokeWidth={1.5}
              />
            </div>
            <span className="text-[9px] uppercase tracking-wider text-white font-semibold">
              Sets
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm z-20"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-warm-white rounded-t-3xl p-6 z-30 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-serif text-xl text-charcoal">
                    {product.title}
                  </h4>
                  <p className="text-sm text-gold font-semibold">
                    From {formatPrice(product.salePrice ?? product.price)}/set
                  </p>
                  <p className="text-xs text-charcoal/45">
                    1 set = {B2B_CONFIG.setSize} pcs
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close quick buy"
                  className="p-2 bg-charcoal/5 rounded-full hover:bg-charcoal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                >
                  <X className="h-5 w-5 text-charcoal" />
                </button>
              </div>

              {/* Ratio Pack */}
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                  Size-ratio pack
                </p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="h-11 px-4 border border-charcoal bg-charcoal text-white text-xs font-medium uppercase tracking-[0.16em] flex items-center"
                  >
                    S/M/L/XL
                  </span>
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                  Select Color
                </p>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`h-9 w-9 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
                        selectedColor === color
                          ? "border-charcoal scale-110"
                          : "border-transparent scale-100 opacity-70"
                      }`}
                      style={{ backgroundColor: COLOR_MAP[color] }}
                      aria-label={`Select ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAdd}
                  disabled={addingToCart || added}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-charcoal text-white text-xs font-semibold uppercase tracking-widest hover:bg-gold active:scale-[0.99] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                >
                  {added ? (
                    <>
                      <Check className="h-4 w-4" /> Added to Cart
                    </>
                  ) : addingToCart ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add 1 Set
                    </>
                  )}
                </button>
                <Link
                  href={`/shop/${product.handle}`}
                  className="w-full h-12 flex items-center justify-center border border-charcoal/10 text-charcoal text-xs font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                >
                  View Full Details
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
