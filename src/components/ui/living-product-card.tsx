"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { formatPrice, type MockProduct } from "@/lib/medusa";
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
      className={`group relative w-full flex flex-col bg-[#fcfbf9] overflow-hidden ${heightClass}`}
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
            addItem(product, "M");
          }}
          aria-label={`Add ${product.title} to cart in size M`}
          className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-30 flex min-h-11 items-center gap-2 px-4 md:px-6 py-3 bg-white text-charcoal text-[9px] font-bold uppercase tracking-[0.2em] transform translate-y-0 opacity-100 md:translate-y-8 md:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-charcoal hover:text-white active:scale-[0.98] transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          <span>Add to Cart</span>
          <Plus className="h-3 w-3" strokeWidth={2} />
        </button>
      </Link>

      {/* Content Below Image - Formal & Compact */}
      <div className="pt-4 pb-6 px-1 flex flex-col items-center text-center">
        <p className="text-[9px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-1.5">
          {product.category}
        </p>
        <Link
          href={`/shop/${product.handle}`}
          className="group-hover:text-gold transition-colors"
        >
          <h3 className="font-serif text-base md:text-lg text-charcoal font-light tracking-tight leading-snug mb-1 line-clamp-2">
            {product.title}
          </h3>
        </Link>
        <p className="text-[10px] font-medium text-charcoal/60 tracking-widest">
          {formatPrice(product.salePrice ?? product.price)}
        </p>
      </div>
    </div>
  );
});
