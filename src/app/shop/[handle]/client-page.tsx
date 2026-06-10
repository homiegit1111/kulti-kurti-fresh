"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Play,
  ShoppingBag,
  Check,
  Heart,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  MOCK_PRODUCTS,
  getProductByHandle,
  formatPrice,
  COLOR_MAP,
  type MockProduct,
} from "@/lib/medusa";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { isShopifyConfigured } from "@/lib/shopify";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  // undefined = loading, null = not found, MockProduct = loaded
  const [product, setProduct] = useState<MockProduct | null | undefined>(
    undefined,
  );

  useEffect(() => {
    getProductByHandle(handle).then(setProduct);
  }, [handle]);

  if (product === undefined) {
    return (
      <>
        <Navbar />
        <main className="flex-1 pt-20 lg:pt-32 min-h-screen bg-[#f7f6f2] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  if (product === null) {
    return (
      <div className="bg-warm-white min-h-screen text-charcoal font-sans">
        <Navbar />
        <main className="flex-1 relative z-10 pt-32 px-6 lg:px-20 text-center flex flex-col items-center justify-center">
          <h1 className="text-5xl font-serif mb-4">Product Not Found</h1>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 border border-charcoal px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-charcoal hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Collection
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#f7f6f2] min-h-screen text-charcoal font-sans selection:bg-charcoal selection:text-white flex flex-col">
      <Navbar />
      <main className="pt-20 lg:pt-32 flex-1 relative pb-24 lg:pb-0">
        <DashboardProductDetail product={product} />
      </main>
      <Footer />
    </div>
  );
}

function DashboardProductDetail({ product }: { product: MockProduct }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>("info");

  const [added, setAdded] = useState(false);

  const { addItem, checkoutUrl } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addItem(product, selectedSize, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedSize) return;
    addItem(product, selectedSize, selectedColor);
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      window.location.href = "/checkout";
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;
    const shareData = {
      title: product.title,
      text: product.description,
      url,
    };

    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }

    await navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category,
  ).slice(0, 8);

  return (
    <div className="flex flex-col gap-8 lg:gap-24 pb-24 relative overflow-hidden">
      {/* ── DYNAMIC COLOR AURA (The Glimpse) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Desktop Glow (Right side behind purchase area) */}
        <motion.div
          initial={{
            backgroundColor: COLOR_MAP[selectedColor] ?? "transparent",
          }}
          animate={{
            backgroundColor: COLOR_MAP[selectedColor] ?? "transparent",
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-[5%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[180px] opacity-20 hidden lg:block"
          style={{ willChange: "background-color" }}
        />
        {/* Mobile Glow (Middle behind color/size selector) */}
        <motion.div
          initial={{
            backgroundColor: COLOR_MAP[selectedColor] ?? "transparent",
          }}
          animate={{
            backgroundColor: COLOR_MAP[selectedColor] ?? "transparent",
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-[55%] left-[-20%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-25 lg:hidden"
          style={{ willChange: "background-color" }}
        />
      </div>

      {/* ── TOP SECTION: Mobile & Desktop Layout ── */}
      <div className="max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="flex flex-col lg:hidden mb-4 pt-4">
          <p className="text-[10px] font-bold tracking-[0.3em] text-gold uppercase mb-2">
            {product.category} COLLECTION
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight leading-none mb-1">
            {product.title}
          </h1>
          <p className="text-lg font-serif text-charcoal font-medium">
            {formatPrice(product.salePrice ?? product.price)}
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 min-h-[calc(100vh-140px)]">
          {/* ── 1. LEFT COLUMN ── */}
          <div className="lg:col-span-3 flex flex-col justify-between pt-4 order-2 lg:order-1">
            <div className="flex flex-col gap-6">
              {/* Modern Minimalist Thumbnails Row */}
              <div className="flex gap-5 items-center pb-2">
                <button
                  disabled
                  className="flex flex-col items-center justify-center gap-1 w-12 opacity-30 cursor-not-allowed"
                  title="3D Model Coming Soon"
                >
                  <div className="w-10 h-10 rounded-full border border-charcoal text-charcoal flex items-center justify-center relative">
                    <span className="text-[10px] font-bold tracking-widest">
                      3D
                    </span>
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-widest text-charcoal/50">
                    Soon
                  </span>
                </button>

                <div className="w-px h-8 bg-charcoal/20" />

                <div className="flex gap-4">
                  {product.images.slice(0, 4).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`w-10 h-14 relative overflow-hidden transition-all duration-300 ${
                        activeImageIndex === i
                          ? "opacity-100 ring-1 ring-charcoal ring-offset-4 ring-offset-[#f7f6f2]"
                          : "opacity-40 hover:opacity-100"
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Video & Colors (MOVED UP) */}
              <div className="hidden lg:block pt-6 border-t border-charcoal/10">
                <h3 className="text-charcoal/40 font-bold text-[10px] uppercase tracking-[0.2em] mb-4">
                  View Lookbook & Colors
                </h3>
                <div className="flex gap-4 h-40 xl:h-48">
                  {/* Video Block Placeholder */}
                  <div className="flex-1 bg-white rounded-3xl relative overflow-hidden group cursor-pointer shadow-sm border border-charcoal/5">
                    <Image
                      src={product.images[1] || product.images[0]}
                      alt="Video Thumbnail"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-multiply"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play
                          className="w-3 h-3 ml-1 text-gold"
                          fill="currentColor"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Animated Vertical Color Selector */}
                  <div className="w-16 xl:w-20 flex flex-col relative rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white border border-charcoal/5">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(color);
                          const idx = product.colors.indexOf(color);
                          if (idx !== -1 && product.images[idx])
                            setActiveImageIndex(idx);
                        }}
                        className={`w-full relative transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${selectedColor === color ? "flex-[3]" : "flex-1 hover:flex-[1.5]"}`}
                        style={{ backgroundColor: COLOR_MAP[color] ?? "#ccc" }}
                      >
                        {selectedColor === color && (
                          <motion.div
                            layoutId="desktopActiveColor"
                            className="absolute inset-0 flex items-center justify-center mix-blend-difference"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Minimalist Client Reviews Link */}
              <Link
                href="#reviews"
                className="hidden lg:flex group items-center justify-between border-t border-b border-charcoal/10 py-5 mt-2"
              >
                <span className="font-bold text-[10px] uppercase tracking-widest text-charcoal group-hover:text-gold transition-colors">
                  Read Client Reviews (4.9/5)
                </span>
                <MessageCircle className="w-4 h-4 text-charcoal/40 group-hover:text-gold transition-colors" />
              </Link>
            </div>

            {/* Ultra-Modern Purchase Area (Typography Driven & App-like) */}
            <div className="hidden lg:flex flex-col pb-4 mt-4">
              {/* Header */}
              <div className="flex items-end justify-between border-b border-charcoal/10 pb-4 mb-8">
                <h2 className="text-3xl font-sans font-bold uppercase tracking-tighter leading-none">
                  {selectedColor} {product.category}
                </h2>
                <span className="text-xl font-sans font-medium tracking-tight text-charcoal/60 leading-none">
                  {formatPrice(product.salePrice ?? product.price)}
                </span>
              </div>

              {/* Typography Size Selector */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-charcoal/40">
                    Select Size
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-charcoal hover:text-charcoal/60 transition-colors cursor-pointer border-b border-charcoal/20 pb-0.5">
                    Size Guide
                  </span>
                </div>

                <div className="flex justify-between items-center px-4 relative">
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-charcoal/5 -translate-y-1/2 z-0" />
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className="relative z-10 group py-2 px-4 bg-[#f7f6f2]"
                    >
                      <span
                        className={`text-2xl font-sans tracking-tighter transition-all duration-500 ${selectedSize === size ? "text-charcoal font-bold scale-110 inline-block" : "text-charcoal/20 font-medium group-hover:text-charcoal/40 inline-block"}`}
                      >
                        {size}
                      </span>
                      {selectedSize === size && (
                        <motion.div
                          layoutId="sizeIndicator"
                          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-charcoal rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Pill Buttons */}
              <div className="flex gap-3 mt-8">
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize}
                className={`group relative flex-1 h-16 rounded-full flex items-center justify-between px-2 pl-8 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden ${
                  added
                    ? "bg-[#2a4d3e] text-white shadow-[0_20px_40px_rgba(42,77,62,0.3)]"
                    : !selectedSize
                      ? "bg-charcoal/5 text-charcoal/30 cursor-not-allowed"
                      : "bg-charcoal text-white hover:bg-black hover:scale-[1.02] shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
                }`}
              >
                <div className="relative z-10 overflow-hidden h-5 flex items-center">
                  <AnimatePresence mode="wait">
                    {added ? (
                      <motion.span
                        key="added"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="font-bold uppercase tracking-[0.2em] text-[10px]"
                      >
                        Added to Cart
                      </motion.span>
                    ) : (
                      <motion.span
                        key="default"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="font-bold uppercase tracking-[0.2em] text-[10px]"
                      >
                        {selectedSize ? "Add to Cart" : "Select a Size"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 ${
                    added
                      ? "bg-white text-[#2a4d3e] scale-110"
                      : !selectedSize
                        ? "bg-transparent"
                        : "bg-white text-charcoal group-hover:w-14"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {added ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="w-5 h-5" />
                      </motion.div>
                    ) : selectedSize ? (
                      <motion.div
                        key="arrow"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </button>

              {isShopifyConfigured() && (
                <button
                  onClick={handleBuyNow}
                  disabled={!selectedSize}
                  className={`h-16 px-6 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-300 shrink-0 ${
                    !selectedSize
                      ? "bg-gold/20 text-gold/30 cursor-not-allowed"
                      : "bg-gold text-white hover:bg-gold-dark shadow-[0_20px_40px_rgba(201,169,110,0.3)] hover:scale-[1.02]"
                  }`}
                >
                  Buy Now
                </button>
              )}
              </div>

              <div className="flex justify-center mt-6">
                <p className="text-[9px] uppercase tracking-[0.3em] text-charcoal/30 font-bold">
                  SKU: {product.handle.slice(0, 8)}
                </p>
              </div>
            </div>
          </div>

          {/* ── 2. CENTER COLUMN (Image Viewer) ── */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-start py-6 lg:py-0 lg:pt-4 order-1 lg:order-2">
            {/* Hovering Action Pill (Fills Top Space) */}
            <div className="hidden lg:flex items-center gap-4 bg-white/40 hover:bg-white backdrop-blur-md border border-charcoal/5 px-6 py-2.5 rounded-full mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-colors duration-500">
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-label={
                  wishlisted
                    ? `Remove ${product.title} from wishlist`
                    : `Add ${product.title} to wishlist`
                }
                className="flex items-center gap-2 group px-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                <Heart
                  className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${wishlisted ? "fill-gold text-gold" : "text-charcoal/40 group-hover:text-gold"}`}
                />
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-charcoal/50 group-hover:text-charcoal transition-colors">
                  Wishlist
                </span>
              </button>
              <div className="w-px h-3 bg-charcoal/10" />
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-2 group px-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                <Share2 className="w-4 h-4 text-charcoal/40 group-hover:text-gold transition-all duration-300 group-hover:scale-110" />
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-charcoal/50 group-hover:text-charcoal transition-colors">
                  Share
                </span>
              </button>
              <div className="w-px h-3 bg-charcoal/10" />

              {/* Playful Help Button */}
              <Link
                href="/contact"
                className="flex items-center gap-2 group relative overflow-hidden bg-[#f7f6f2] hover:bg-gold/10 px-4 py-2 rounded-full transition-colors duration-500 ml-1 border border-charcoal/5 hover:border-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                <MessageCircle className="w-3.5 h-3.5 text-charcoal/40 group-hover:text-gold transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12" />
                <div className="relative h-4 overflow-hidden w-[95px] flex items-center">
                  <span className="absolute inset-0 flex items-center justify-start text-[9px] uppercase tracking-[0.2em] font-bold text-charcoal/50 group-hover:-translate-y-full transition-transform duration-500">
                    Questions?
                  </span>
                  <span className="absolute inset-0 flex items-center justify-start text-[11px] font-serif italic text-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500 whitespace-nowrap">
                    Talk to us :)
                  </span>
                </div>
              </Link>
            </div>

            <div className="relative w-full max-w-[450px] lg:max-w-[500px] aspect-[4/5] lg:aspect-[3/4] mx-auto pointer-events-none">
              <motion.div
                key={selectedColor} // Triggers animation on color change
                initial={{
                  filter: "brightness(1.2) blur(10px)",
                  scale: 0.95,
                  y: 10,
                }}
                animate={{ filter: "brightness(1) blur(0px)", scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
                className="relative w-full h-full rounded-[2.5rem] lg:rounded-[3.5rem] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.15)]"
                style={{
                  willChange: "transform, filter",
                  backfaceVisibility: "hidden",
                }}
              >
                <Image
                  src={product.images[activeImageIndex]}
                  alt={product.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </motion.div>
            </div>
          </div>

          {/* ── 3. RIGHT COLUMN ── */}
          <div className="lg:col-span-4 flex flex-col pt-2 lg:pt-4 lg:pl-8 order-3 lg:order-3">
            {/* Desktop Right Column Top: Product Title */}
            <div className="hidden lg:block mb-10 border-b border-charcoal/10 pb-6">
              <p className="text-[10px] font-bold tracking-[0.3em] text-gold uppercase mb-2">
                {product.category} COLLECTION
              </p>
              <h1 className="text-4xl lg:text-5xl font-serif tracking-tight leading-none mb-4">
                {product.title}
              </h1>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-serif text-charcoal font-medium">
                  {formatPrice(product.salePrice ?? product.price)}
                </p>
                <div className="flex items-center gap-2 text-charcoal/40 font-bold text-xs tracking-widest uppercase">
                  <div className="w-4 h-px bg-charcoal/40 transform -rotate-45" />
                  <span>{selectedColor} | AUTUMN</span>
                </div>
              </div>
            </div>

            {/* Mobile Sizing & Colors Block */}
            <motion.div
              animate={{
                boxShadow: `0 10px 40px -10px ${COLOR_MAP[selectedColor] ? COLOR_MAP[selectedColor] + "40" : "rgba(0,0,0,0.05)"}`,
                borderColor: COLOR_MAP[selectedColor]
                  ? COLOR_MAP[selectedColor] + "30"
                  : "rgba(0,0,0,0.05)",
              }}
              transition={{ duration: 1 }}
              className="flex flex-col lg:hidden gap-6 mb-8 bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border relative overflow-hidden"
            >
              {/* Animated Inner Glow */}
              <motion.div
                animate={{
                  backgroundColor: COLOR_MAP[selectedColor] ?? "transparent",
                }}
                transition={{ duration: 1 }}
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] opacity-10 pointer-events-none"
              />
              {/* Animated Color Selection */}
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-charcoal/50 mb-3">
                  Color:{" "}
                  <span className="text-charcoal capitalize ml-1">
                    {selectedColor}
                  </span>
                </p>
                <div className="flex gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        const idx = product.colors.indexOf(color);
                        if (idx !== -1 && product.images[idx])
                          setActiveImageIndex(idx);
                      }}
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        selectedColor === color
                          ? "scale-110 shadow-lg"
                          : "hover:scale-105"
                      }`}
                    >
                      <span
                        className="w-full h-full rounded-full"
                        style={{ backgroundColor: COLOR_MAP[color] ?? "#ccc" }}
                      />
                      {selectedColor === color && (
                        <motion.div
                          layoutId="mobileActiveColorRing"
                          className="absolute -inset-1 border-2 border-charcoal rounded-full"
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-charcoal/50">
                    Size
                  </p>
                  <button className="text-[10px] font-bold tracking-widest uppercase text-gold underline underline-offset-2">
                    Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 flex-1 min-w-[60px] rounded-xl text-sm font-bold transition-all ${
                        selectedSize === size
                          ? "bg-charcoal text-white shadow-md"
                          : "bg-[#f2f4f7] text-charcoal hover:bg-[#e4e7ec]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Middle Section: Expandable Info Blocks */}
            <div className="flex flex-col flex-1 bg-white lg:bg-transparent rounded-3xl lg:rounded-none p-6 lg:p-0 shadow-sm lg:shadow-none border border-charcoal/5 lg:border-none">
              {/* Accordion 1 */}
              <div className="border-b lg:border-t-0 border-charcoal/10">
                <button
                  onClick={() => toggleSection("info")}
                  className="w-full text-left font-sans font-bold text-xs lg:text-sm tracking-widest hover:text-gold transition-colors flex items-center justify-between py-5 lg:py-6 uppercase"
                >
                  The Details
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${expandedSection === "info" ? "rotate-180 text-gold" : "text-charcoal/40"}`}
                    strokeWidth={2}
                  />
                </button>
                <AnimatePresence>
                  {expandedSection === "info" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-sm leading-relaxed text-charcoal/70 font-serif italic">
                        {product.description} Engineered with precision,
                        featuring cutting-edge materials tailored for the modern
                        aesthetic.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 2 */}
              <div className="border-b border-charcoal/10">
                <button
                  onClick={() => toggleSection("craft")}
                  className="w-full text-left font-sans font-bold text-xs lg:text-sm tracking-widest hover:text-gold transition-colors flex items-center justify-between py-5 lg:py-6 uppercase"
                >
                  Craftsmanship
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${expandedSection === "craft" ? "rotate-180 text-gold" : "text-charcoal/40"}`}
                    strokeWidth={2}
                  />
                </button>
                <AnimatePresence>
                  {expandedSection === "craft" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="pb-6 text-sm leading-relaxed text-charcoal/70 font-serif italic list-disc list-inside space-y-1">
                        <li>100% Premium Sustainable Fabric</li>
                        <li>Intricate hand-embroidery details</li>
                        <li>Dry clean exclusively</li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 3 */}
              <div className="border-b lg:border-b border-charcoal/10">
                <button
                  onClick={() => toggleSection("shipping")}
                  className="w-full text-left font-sans font-bold text-xs lg:text-sm tracking-widest hover:text-gold transition-colors flex items-center justify-between py-5 lg:py-6 uppercase"
                >
                  Shipping & Returns
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${expandedSection === "shipping" ? "rotate-180 text-gold" : "text-charcoal/40"}`}
                    strokeWidth={2}
                  />
                </button>
                <AnimatePresence>
                  {expandedSection === "shipping" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-sm leading-relaxed text-charcoal/70 font-serif italic">
                        Complimentary express global shipping on orders over
                        ₹5,000. Returns accepted within 14 days of delivery.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Designer's Note & Guarantees (Fills empty space on Desktop) */}
            <div className="hidden lg:flex flex-col mt-10 gap-6">
              <div className="bg-[#f0efe9] rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <svg
                    className="w-40 h-40"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <h4 className="text-[9px] uppercase tracking-[0.3em] font-bold text-charcoal/40 mb-4 relative z-10">
                  Designer&apos;s Note
                </h4>
                <p className="font-serif italic text-charcoal/80 text-base leading-relaxed relative z-10">
                  &quot;This silhouette was born from a desire to merge
                  traditional royal court elegance with the effortless comfort
                  required by the modern woman. Every stitch tells a story of
                  our heritage.&quot;
                </p>
                <div className="mt-6 text-[11px] font-sans font-bold uppercase tracking-widest text-charcoal relative z-10">
                  — Creative Director
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center text-center py-6 px-4 border border-charcoal/5 rounded-3xl bg-white/40 hover:bg-white transition-colors">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal mb-1.5">
                    Handcrafted
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-charcoal/40">
                    In India
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center py-6 px-4 border border-charcoal/5 rounded-3xl bg-white/40 hover:bg-white transition-colors">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal mb-1.5">
                    Sustainable
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-charcoal/40">
                    Materials
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY ADD TO CART BAR ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/90 backdrop-blur-xl border-t border-charcoal/10 pb-safe"
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      >
        <div className="flex gap-2">
        <button
          onClick={handleAddToCart}
          disabled={!selectedSize}
          className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 font-bold uppercase tracking-widest text-xs overflow-hidden relative ${
            added
              ? "bg-[#2a4d3e] text-white scale-[0.98] shadow-lg shadow-[#2a4d3e]/20"
              : !selectedSize
                ? "bg-[#f2f4f7] text-charcoal/30"
                : "bg-charcoal text-white hover:bg-black active:scale-[0.98] shadow-xl shadow-charcoal/20"
          }`}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.div
                key="added"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Added to Cart</span>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-2"
              >
                {selectedSize ? (
                  <>
                    <span>Add to Cart</span>
                    <ShoppingBag className="w-4 h-4 opacity-50" />
                  </>
                ) : (
                  "Select a Size"
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {isShopifyConfigured() && (
          <button
            onClick={handleBuyNow}
            disabled={!selectedSize}
            className={`h-14 px-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center shrink-0 transition-all duration-500 ${
              !selectedSize
                ? "bg-gold/20 text-gold/30"
                : "bg-gold text-white hover:bg-gold-dark active:scale-[0.98] shadow-lg shadow-gold/20"
            }`}
          >
            Buy Now
          </button>
        )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: Full Width Related Products ── */}
      <section className="w-full bg-white border-t border-charcoal/5 pt-16 lg:pt-20 pb-12 overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between items-end mb-8 lg:mb-10">
            <div>
              <span className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold mb-2 block">
                Explore More
              </span>
              <h2 className="font-serif text-3xl lg:text-5xl font-light">
                You May Also <span className="italic text-gold">Like</span>
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden md:inline-flex items-center gap-2 border-b border-charcoal pb-1 text-xs font-bold uppercase tracking-widest hover:text-gold hover:border-gold transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex gap-4 lg:gap-8 overflow-x-auto hide-scrollbar pb-8 snap-x pl-1">
            {relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                href={`/shop/${rp.handle}`}
                className="w-[240px] lg:w-[320px] shrink-0 group snap-start"
              >
                <div className="relative aspect-[3/4] bg-[#f7f6f2] rounded-[2rem] overflow-hidden mb-4 lg:mb-6">
                  <Image
                    src={rp.image}
                    alt={rp.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-multiply"
                    sizes="320px"
                  />
                </div>
                <div className="flex justify-between items-start px-2">
                  <div className="flex flex-col">
                    <h3 className="font-serif text-base lg:text-lg text-charcoal group-hover:text-gold transition-colors mb-1">
                      {rp.title}
                    </h3>
                    <p className="text-[9px] lg:text-[10px] font-bold tracking-widest text-charcoal/50 uppercase">
                      {rp.category}
                    </p>
                  </div>
                  <span className="font-serif text-charcoal font-semibold text-sm lg:text-base">
                    {formatPrice(rp.salePrice ?? rp.price)}
                  </span>
                </div>
              </Link>
            ))}
            {/* Edge spacer for scroll layout */}
            <div className="w-6 shrink-0" />
          </div>
        </div>
      </section>
    </div>
  );
}
