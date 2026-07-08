"use client";

import { useState, useEffect, use, useOptimistic, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Truck,
  RefreshCcw,
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
} from "@/lib/commerce/catalog";
import ReviewsSection from "@/components/product/reviews-section";
import StockAlertForm from "@/components/product/stock-alert-form";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { buildProductInquiryUrl } from "@/lib/b2b/whatsapp";
import { ResellerMarginEstimator } from "@/components/b2b/reseller-margin-estimator";

export default function ProductDetailPage({
  params,
  initialProduct,
}: {
  params: Promise<{ handle: string }>;
  // Server-fetched product: ships real HTML on first paint (SEO/LCP) and
  // removes the client-side loading spinner entirely.
  initialProduct?: MockProduct | null;
}) {
  const { handle } = use(params);
  // undefined = loading, null = not found, MockProduct = loaded
  const [product, setProduct] = useState<MockProduct | null | undefined>(
    initialProduct ?? undefined,
  );

  useEffect(() => {
    // Only fetch client-side when the server didn't provide the product.
    if (initialProduct) return;
    getProductByHandle(handle).then(setProduct);
  }, [handle, initialProduct]);

  if (product === undefined) {
    return (
      <>
        <Navbar />
        <main className="flex-1 pt-20 lg:pt-32 min-h-screen bg-warm-white flex items-center justify-center">
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
    <div className="bg-warm-white min-h-screen text-charcoal font-sans flex flex-col">
      <Navbar />
      <main className="pt-20 lg:pt-32 flex-1 relative pb-24 lg:pb-0">
        <DashboardProductDetail product={product} />
      </main>
      <Footer />
    </div>
  );
}

function DashboardProductDetail({ product }: { product: MockProduct }) {
  const [selectedSets, setSelectedSets] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>("info");

  // Inventory guard: only block when Shopify explicitly reports unavailable.
  // (undefined = mock/unknown → treat as available so the catalog still works.)
  const soldOut = product.availableForSale === false;

  // Optimistic "Added" affordance (React 19): true during the add transition,
  // auto-reverts when it settles — no manual setTimeout toggle needed.
  const [, startAddTransition] = useTransition();
  const [added, setAddedOptimistic] = useOptimistic(
    false,
    (_state, value: boolean) => value,
  );

  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    if (soldOut) return;
    startAddTransition(async () => {
      setAddedOptimistic(true);
      addItem(product, "Set", selectedColor, selectedSets);
      // Hold the optimistic confirmation briefly for visible feedback.
      await new Promise((resolve) => setTimeout(resolve, 1400));
    });
  };

  const handleReviewOrder = () => {
    if (soldOut) return;
    addItem(product, "Set", selectedColor, selectedSets);
    window.location.href = "/cart";
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
          <p className="eyebrow mb-2">
            {getStyleCode(product)} - {product.category} Collection
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif font-light tracking-tight leading-[1.05] mb-2">
            {product.title}
          </h1>
          <p className="text-lg font-serif text-charcoal font-medium">
            {formatPrice(product.salePrice ?? product.price)}/set
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 min-h-[calc(100vh-140px)]">
          {/* ── 1. LEFT COLUMN ── */}
          <div className="lg:col-span-3 flex flex-col justify-between pt-4 order-2 lg:order-1">
            <div className="flex flex-col gap-6">
              {/* Modern Minimalist Thumbnails Row */}
              <div className="flex gap-5 items-center pb-2">
                <span className="eyebrow eyebrow--bare !tracking-[0.3em] text-[9px]">
                  Views
                </span>

                <div className="w-px h-8 bg-charcoal/15" />

                <div className="flex gap-4">
                  {product.images.slice(0, 4).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`w-10 h-14 relative overflow-hidden transition-all duration-300 ${
                        activeImageIndex === i
                          ? "opacity-100 ring-1 ring-charcoal ring-offset-4 ring-offset-warm-white"
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
                  <div className="flex-1 bg-white relative overflow-hidden group cursor-pointer border border-charcoal/10">
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
                  <div className="w-16 xl:w-20 flex flex-col relative overflow-hidden bg-white border border-charcoal/10">
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
                <h2 className="font-serif text-3xl font-light capitalize tracking-tight leading-none">
                  {selectedColor} <span className="italic text-charcoal/60">{product.category}</span>
                </h2>
                <span className="font-serif text-2xl font-light text-charcoal leading-none">
                  {formatPrice(product.salePrice ?? product.price)}/set
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal/45 -mt-4 mb-7">
                {formatPrice(getPerPiecePrice(product.salePrice ?? product.price))}
                /pc - 1 set = {B2B_CONFIG.setSize} pcs - {SIZE_RATIO_LABEL}
              </p>

              {/* Typography Size Selector */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-8">
                  <span className="eyebrow eyebrow--bare">Size Ratio</span>
                  <span className="link-luxe text-[10px] uppercase tracking-[0.25em] font-bold text-charcoal/70 hover:text-charcoal transition-colors cursor-pointer">
                    MOQ applies across cart
                  </span>
                </div>

                <div className="flex justify-between items-center px-4 relative">
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-charcoal/5 -translate-y-1/2 z-0" />
                  {B2B_CONFIG.sizeRatio.map((size) => (
                    <div
                      key={size}
                      className="relative z-10 group py-2 px-4 bg-warm-white"
                    >
                      <span
                        className="font-serif text-2xl tracking-tight text-charcoal inline-block"
                      >
                        {size}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-y border-charcoal/10 py-4">
                <span className="eyebrow eyebrow--bare">Sets</span>
                <div className="flex items-center border border-charcoal/15">
                  <button
                    onClick={() =>
                      setSelectedSets((value) => Math.max(1, value - 1))
                    }
                    className="h-10 w-10 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5"
                    aria-label="Decrease sets"
                  >
                    -
                  </button>
                  <span className="h-10 w-12 border-x border-charcoal/15 text-center text-xs font-bold leading-10">
                    {selectedSets}
                  </span>
                  <button
                    onClick={() => setSelectedSets((value) => value + 1)}
                    className="h-10 w-10 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5"
                    aria-label="Increase sets"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Interactive Pill Buttons */}
              <div className="flex gap-3 mt-8">
              <button
                onClick={handleAddToCart}
                disabled={soldOut}
                className={`group relative flex-1 h-16 flex items-center justify-between px-2 pl-8 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden ${
                  added
                    ? "bg-[#2a4d3e] text-white shadow-[0_20px_40px_rgba(42,77,62,0.25)]"
                    : "bg-charcoal text-white hover:bg-gold-dark shadow-[0_20px_40px_rgba(0,0,0,0.12)]"
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
                        {soldOut
                          ? "Sold Out"
                          : "Add Sets"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div
                  className={`relative z-10 w-12 h-12 flex items-center justify-center transition-all duration-700 ${
                    added
                      ? "bg-white text-[#2a4d3e] scale-110"
                      : "bg-white/10 border border-white/30 text-white group-hover:w-14 group-hover:bg-white group-hover:text-charcoal"
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
                    ) : (
                      <motion.div
                        key="arrow"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </button>

              <button
                onClick={handleReviewOrder}
                disabled={soldOut}
                className={`h-16 px-7 font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-300 shrink-0 ${
                  soldOut
                    ? "border border-gold/30 text-gold/40 cursor-not-allowed"
                    : "bg-gold text-white hover:bg-gold-dark shadow-[0_20px_40px_rgba(201,169,110,0.3)]"
                }`}
              >
                Review Cart
              </button>
              </div>

              {/* Back-in-stock / size alert — capture lost demand */}
              {soldOut && (
                <StockAlertForm handle={product.handle} size="Set" />
              )}

              {/* Trust signals */}
              <div className="grid grid-cols-3 gap-2 mt-8 pt-6 border-t border-charcoal/10">
                {[
                  { icon: Banknote, label: "GST Invoice" },
                  { icon: Truck, label: "All-India Dispatch" },
                  { icon: RefreshCcw, label: "MOQ 4 Sets" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <Icon className="w-4 h-4 text-gold" strokeWidth={1.5} />
                    <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-charcoal/50 leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
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
            <div className="hidden lg:flex items-center gap-4 bg-white/60 hover:bg-white backdrop-blur-md border border-charcoal/10 px-6 py-2.5 mb-8 transition-colors duration-500">
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
                className="flex items-center gap-2 group relative overflow-hidden bg-warm-gray/60 hover:bg-gold/10 px-4 py-2 transition-colors duration-500 ml-1 border border-charcoal/10 hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
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
                className="relative w-full h-full overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.15)]"
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
              <p className="eyebrow mb-3">
                {getStyleCode(product)} - {product.category} Collection
              </p>
              <h1 className="text-4xl lg:text-5xl font-serif font-light tracking-tight leading-[1.05] mb-4">
                {product.title}
              </h1>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-serif text-charcoal font-medium">
                  {formatPrice(product.salePrice ?? product.price)}/set
                </p>
                <div className="flex items-center gap-2 text-charcoal/40 font-bold text-xs tracking-widest uppercase">
                  <div className="w-4 h-px bg-charcoal/40 transform -rotate-45" />
                  <span>{selectedColor} | AUTUMN</span>
                </div>
              </div>
              <a
                href={buildProductInquiryUrl(product)}
                className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal hover:text-gold-dark"
              >
                Ask availability on WhatsApp <MessageCircle className="h-3.5 w-3.5" />
              </a>
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
              className="flex flex-col lg:hidden gap-6 mb-8 bg-white p-6 border relative overflow-hidden"
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

              {/* Ratio Pack */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-charcoal/50">
                    Size Ratio Pack
                  </p>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gold">
                    {SIZE_RATIO_LABEL}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {B2B_CONFIG.sizeRatio.map((size) => (
                    <span
                      key={size}
                      className="tap-luxe h-12 flex-1 min-w-[60px] border border-charcoal bg-charcoal text-white text-sm font-semibold flex items-center justify-center"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>

              {/* Trust signals (mobile) */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t border-charcoal/10">
                {[
                  { icon: Banknote, label: "GST" },
                  { icon: Truck, label: "Dispatch" },
                  { icon: RefreshCcw, label: "MOQ 4 Sets" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-gold" strokeWidth={1.5} />
                    <span className="text-[9px] uppercase tracking-wider font-bold text-charcoal/50">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Middle Section: Expandable Info Blocks */}
            <div className="flex flex-col flex-1 bg-white lg:bg-transparent p-6 lg:p-0 border border-charcoal/10 lg:border-none">
              {/* Accordion 1 */}
              <div className="border-b lg:border-t-0 border-charcoal/10">
                <button
                  onClick={() => toggleSection("info")}
                  className="w-full text-left font-sans font-bold text-xs lg:text-sm tracking-widest hover:text-gold transition-colors flex items-center justify-between py-5 lg:py-6 uppercase"
                >
                  Wholesale Details
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
                        {product.description} Ordered as a reseller-ready
                        ratio pack: 1 set = {B2B_CONFIG.setSize} pcs in{" "}
                        {SIZE_RATIO_LABEL}. MOQ applies across the cart.
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
                  Buyer Notes
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
                        <li>Style code: {getStyleCode(product)}</li>
                        <li>Wholesale set price shown before tier discounts</li>
                        <li>Confirm stock, GST invoice, dispatch, and Razorpay payment on WhatsApp</li>
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
                  Wholesale Dispatch
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
                        Wholesale orders are confirmed on WhatsApp with stock,
                        GST invoice details, dispatch city, and Razorpay payment
                        link before shipping.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Reseller planning and guarantees */}
            <div className="hidden lg:flex flex-col mt-10 gap-6">
              <div className="panel-luxe frame-luxe p-8 relative overflow-hidden group">
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
                  Buyer Margin Note
                </h4>
                <p className="font-serif italic text-charcoal/80 text-base leading-relaxed relative z-10">
                  &quot;Use the per-piece cost to plan boutique pricing, but keep
                  margin estimates market-aware. Final resale depends on your
                  city, channel, and customer segment.&quot;
                </p>
                <div className="mt-6 text-[11px] font-sans font-bold uppercase tracking-widest text-charcoal relative z-10">
                  Wholesale Planning
                </div>
              </div>

              <ResellerMarginEstimator
                wholesalePerPiece={getPerPiecePrice(product.salePrice ?? product.price)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center text-center py-6 px-4 border border-charcoal/10 bg-white/50 hover:bg-white transition-colors">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal mb-1.5">
                    Handcrafted
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-charcoal/40">
                    In India
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center py-6 px-4 border border-charcoal/10 bg-white/50 hover:bg-white transition-colors">
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
          disabled={soldOut}
          className={`flex-1 h-14 flex items-center justify-center gap-3 transition-all duration-500 font-bold uppercase tracking-[0.2em] text-[11px] overflow-hidden relative ${
            added
              ? "bg-[#2a4d3e] text-white scale-[0.98]"
              : soldOut
                ? "bg-transparent border border-charcoal/20 text-charcoal/45"
                : "bg-charcoal text-white active:scale-[0.98]"
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
                {soldOut ? (
                  "Sold Out"
                ) : (
                  <>
                    <span>Add Sets</span>
                    <ShoppingBag className="w-4 h-4 opacity-50" />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={handleReviewOrder}
          disabled={soldOut}
          className={`h-14 px-5 font-bold uppercase tracking-[0.2em] text-[11px] flex items-center justify-center shrink-0 transition-all duration-500 ${
            soldOut
              ? "border border-gold/30 text-gold/40"
              : "bg-gold text-white hover:bg-gold-dark active:scale-[0.98]"
          }`}
        >
          Review Cart
        </button>
        </div>
      </div>

      {/* ── Customer reviews with photos ── */}
      <section className="w-full bg-warm-white">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 pb-20 lg:pb-28">
          <ReviewsSection handle={product.handle} />
        </div>
      </section>

      {/* ── BOTTOM SECTION: Full Width Related Products ── */}
      <section className="w-full bg-white border-t border-charcoal/5 pt-16 lg:pt-20 pb-12 overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between items-end mb-8 lg:mb-10">
            <div>
              <span className="eyebrow mb-3">Explore More</span>
              <h2 className="font-serif text-3xl lg:text-5xl font-light">
                Related Wholesale <span className="italic">Styles</span>
              </h2>
            </div>
            <Link
              href="/shop"
              className="link-luxe hidden md:inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal hover:text-gold-dark transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-4 lg:gap-8 overflow-x-auto hide-scrollbar pb-8 snap-x pl-1">
            {relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                href={`/shop/${rp.handle}`}
                className="w-[240px] lg:w-[320px] shrink-0 group snap-start"
              >
                <div className="relative aspect-[3/4] bg-warm-gray overflow-hidden mb-4 lg:mb-6">
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
                    <h3 className="font-serif text-base lg:text-lg text-charcoal group-hover:text-gold-dark transition-colors mb-1">
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
