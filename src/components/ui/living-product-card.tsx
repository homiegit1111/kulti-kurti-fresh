"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Plus, X } from "lucide-react";
import { formatPrice, type MockProduct } from "@/lib/shopify";
import { useCart } from "@/lib/cart-context";

interface LivingProductCardProps {
  product: MockProduct;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  videoUrl?: string;
  isLiving?: boolean;
  heightClass?: string;
}

export const LivingProductCard = memo(function LivingProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  videoUrl,
  isLiving = false,
  heightClass = "",
}: LivingProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addItem } = useCart();

  // Inventory guard: disable quick-add when Shopify reports it unavailable.
  const soldOut = product.availableForSale === false;

  // Pricing / merchandising state.
  const onSale =
    typeof product.salePrice === "number" && product.salePrice < product.price;
  const discountPct = onSale
    ? Math.round(((product.price - (product.salePrice as number)) / product.price) * 100)
    : 0;
  const badge = soldOut
    ? { label: "Sold Out", tone: "muted" as const }
    : onSale
      ? { label: `${discountPct}% Off`, tone: "sale" as const }
      : product.isNew
        ? { label: "New", tone: "new" as const }
        : null;

  const showVideo = Boolean(videoUrl) && (isLiving ? !isHovered : isHovered);

  useEffect(() => {
    if (!videoRef.current) return;
    if (showVideo) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [showVideo]);

  return (
    <div
      className={`group relative w-full flex flex-col bg-transparent overflow-hidden ${heightClass}`}
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/shop/${product.handle}`}
        className="block w-full relative aspect-[2/3] bg-warm-gray overflow-hidden"
      >
        {/* The Base Image */}
        <motion.div
          animate={{ opacity: showVideo ? 0 : 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
            style={{ willChange: "transform", backfaceVisibility: "hidden" }}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
        </motion.div>

        {/* The Video Layer */}
        {videoUrl && (
          <motion.div
            animate={{ opacity: showVideo ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-10 bg-charcoal"
          >
            <video
              ref={videoRef}
              src={videoUrl}
              poster={product.image}
              className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
              loop
              muted
              playsInline
              preload="metadata"
            />
          </motion.div>
        )}

        {/* Formal Action Overlay (Crosshair style) */}
        <div className="absolute inset-0 z-20 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-500 pointer-events-none" />

        {/* Merchandising badge — Sale / New / Sold Out (top-left) */}
        {badge && (
          <span
            className={`absolute top-3 left-3 md:top-4 md:left-4 z-30 px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm ${
              badge.tone === "sale"
                ? "bg-charcoal text-white"
                : badge.tone === "new"
                  ? "bg-gold/90 text-charcoal"
                  : "bg-white/85 text-charcoal/50"
            }`}
          >
            {badge.label}
          </span>
        )}

        {/* Wishlist Button - Top Right, Minimal */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleWishlist();
          }}
          aria-label={
            isWishlisted
              ? `Remove ${product.title} from wishlist`
              : `Add ${product.title} to wishlist`
          }
          className="absolute top-3 right-3 md:top-4 md:right-4 z-30 min-h-10 min-w-10 p-2 text-charcoal bg-white/85 backdrop-blur-sm opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${isWishlisted ? "fill-charcoal" : ""}`}
            strokeWidth={1.5}
          />
        </button>

        {/* Quick Add Button - Bottom Center, Minimal */}
        <button
          onClick={(e) => {
            e.preventDefault();
            if (soldOut) return;
            addItem(product, "M");
          }}
          disabled={soldOut}
          aria-label={
            soldOut
              ? `${product.title} is sold out`
              : `Add ${product.title} to cart in size M`
          }
          className={`absolute z-30 transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 active:scale-[0.97]
            bottom-3 right-3 flex h-10 w-10 items-center justify-center
            md:bottom-0 md:right-0 md:h-11 md:w-full md:gap-2 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 ${
            soldOut
              ? "bg-white/85 text-charcoal/40 cursor-not-allowed"
              : "bg-charcoal/90 backdrop-blur-sm text-white hover:bg-charcoal"
          }`}
        >
          {soldOut ? (
            <span className="hidden md:inline text-[9px] font-bold uppercase tracking-[0.25em]">
              Sold Out
            </span>
          ) : (
            <span className="hidden md:inline text-[9px] font-bold uppercase tracking-[0.25em]">
              Add to Cart
            </span>
          )}
          {soldOut ? (
            <X className="h-3.5 w-3.5 md:hidden" strokeWidth={1.5} />
          ) : (
            <Plus className="h-3.5 w-3.5 md:h-3 md:w-3" strokeWidth={1.5} />
          )}
        </button>
      </Link>

      {/* Content Below Image — editorial, left-aligned */}
      <div className="pt-4 pb-6 pr-1 flex flex-col items-start text-left">
        <p className="text-[8.5px] uppercase tracking-[0.28em] text-gold-dark/80 font-bold mb-1.5">
          {product.category}
        </p>
        <Link href={`/shop/${product.handle}`} className="transition-colors">
          <h3 className="font-serif text-base md:text-[19px] text-charcoal font-light tracking-tight leading-snug mb-1 line-clamp-2">
            <span className="link-luxe">{product.title}</span>
          </h3>
        </Link>
        {onSale ? (
          <p className="mt-1.5 flex items-baseline gap-2.5">
            <span className="font-serif text-sm text-charcoal">
              {formatPrice(product.salePrice as number)}
            </span>
            <span className="text-[10px] font-medium text-charcoal/35 line-through tracking-wider">
              {formatPrice(product.price)}
            </span>
          </p>
        ) : (
          <p className="mt-1.5 font-serif text-sm text-charcoal/75">
            {formatPrice(product.price)}
          </p>
        )}
      </div>
    </div>
  );
});
