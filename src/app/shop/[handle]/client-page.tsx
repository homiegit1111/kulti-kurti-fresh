"use client";

import {
  useState,
  useEffect,
  use,
  useOptimistic,
  useTransition,
  useMemo,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Truck,
  RefreshCcw,
  MessageCircle,
  ChevronRight,
  ShoppingBag,
  Check,
  Heart,
  Share2,
  Minus,
  Plus,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  useReducedMotion,
} from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/reveal";
import {
  MOCK_PRODUCTS,
  getProductByHandle,
  formatPrice,
  COLOR_MAP,
  type MockProduct,
} from "@/lib/commerce/catalog";
import ReviewsSection from "@/components/product/reviews-section";
import StockAlertForm from "@/components/product/stock-alert-form";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { getPerPiecePrice, calculateGstBreakdown } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { buildProductInquiryUrl } from "@/lib/b2b/whatsapp";
import { ResellerMarginEstimator } from "@/components/b2b/reseller-margin-estimator";

const EASE = [0.16, 1, 0.3, 1] as const;

type TabId = "details" | "pack" | "pricing" | "terms";

const TABS: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "pack", label: "Pack & sizing" },
  { id: "pricing", label: "Pricing" },
  { id: "terms", label: "Trade terms" },
];

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
        <main className="flex-1 pt-20 lg:pt-32 min-h-screen bg-surface flex items-center justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-content/45">
            Loading style...
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (product === null) {
    return (
      <div className="bg-surface min-h-screen text-content font-sans">
        <Navbar />
        <main className="flex-1 relative z-10 pt-32 px-4 sm:px-6 lg:px-10 text-center flex flex-col items-center justify-center">
          <p className="eyebrow mb-4 justify-center">404 / Not in book</p>
          <h1 className="text-5xl font-black uppercase tracking-[-0.05em] mb-8">
            Product Not Found
          </h1>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 border border-line px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-surface-inverse hover:text-content-inverse transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Line Book
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen text-content font-sans flex flex-col">
      <Navbar />
      <main className="pt-20 lg:pt-32 flex-1 relative pb-28 lg:pb-0">
        <TradePlateDetail product={product} />
      </main>
      <Footer />
    </div>
  );
}

/* ── Live-counting rupee figure: rolls to its new value like an order
   calculator. Snaps instantly under prefers-reduced-motion. ── */
function AnimatedRupees({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    // Reduced motion: skip the roll entirely and render `value` directly
    // (below), so the effect never sets state synchronously.
    if (reduce) return;
    const controls = animate(mv, value, {
      duration: 0.5,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return <>{formatPrice(reduce ? value : display)}</>;
}

function TradePlateDetail({ product }: { product: MockProduct }) {
  const reduce = useReducedMotion();
  const [selectedSets, setSelectedSets] = useState(B2B_CONFIG.defaultLineSets);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("details");

  // Inventory guard: only block when the backend explicitly reports unavailable.
  const soldOut = product.availableForSale === false;

  // Optimistic "Added" affordance (React 19): true during the add transition,
  // auto-reverts when it settles.
  const [, startAddTransition] = useTransition();
  const [added, setAddedOptimistic] = useOptimistic(
    false,
    (_state, value: boolean) => value,
  );

  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const setPrice = product.salePrice ?? product.price;
  const perPiece = getPerPiecePrice(setPrice);
  const styleCode = getStyleCode(product);

  // Live wholesale economics for THIS style at the chosen set count. Built from
  // a synthetic cart line so the GST band + grand total match exactly what the
  // cart will compute — one source of truth, no drift.
  const economics = useMemo(() => {
    const line: CartItem = {
      id: product.id,
      productId: product.id,
      title: product.title,
      handle: product.handle,
      image: product.image,
      price: product.price,
      salePrice: product.salePrice,
      size: "Set",
      color: selectedColor,
      quantity: selectedSets,
    };
    const gst = calculateGstBreakdown([line], selectedSets);
    const totalPieces = selectedSets * B2B_CONFIG.setSize;
    return { gst, subtotal: setPrice * selectedSets, totalPieces };
  }, [product, selectedColor, selectedSets, setPrice]);

  const handleAddToCart = () => {
    if (soldOut) return;
    startAddTransition(async () => {
      setAddedOptimistic(true);
      addItem(product, "Set", selectedColor, selectedSets);
      await new Promise((resolve) => setTimeout(resolve, 1600));
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
    const shareData = { title: product.title, text: product.description, url };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  const selectColor = (color: string) => {
    setSelectedColor(color);
    const idx = product.colors.indexOf(color);
    if (idx !== -1 && product.images[idx]) setActiveImageIndex(idx);
  };

  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category,
  ).slice(0, 8);

  return (
    <div className="flex flex-col gap-14 lg:gap-24 pb-20 relative">
      {/* ── DOCUMENT HEADER BAND ── */}
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <Link
          href="/shop"
          className="mb-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content/50 hover:text-content transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Line book
        </Link>

        <div className="flex items-center justify-between border-y-2 border-line py-3">
          <span className="eyebrow">Style № {styleCode}</span>
          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-[0.3em] text-content/45">
            {product.category}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-content/40">
            Reseller pricing / Proforma
          </span>
        </div>
      </div>

      {/* ── MAIN: STAGE (left) + CONSOLE (right) ── */}
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* ── THE STAGE ── */}
          <div className="lg:col-span-7 order-1">
            <div className="lg:sticky lg:top-28 self-start">
              <ImageStage
                product={product}
                activeImageIndex={activeImageIndex}
                setActiveImageIndex={setActiveImageIndex}
                styleCode={styleCode}
                soldOut={soldOut}
                reduce={!!reduce}
              />
            </div>
          </div>

          {/* ── THE CONSOLE ── */}
          <div className="lg:col-span-5 order-2 mt-8 lg:mt-0 flex flex-col">
            <BuyConsole
              product={product}
              soldOut={soldOut}
              added={added}
              setPrice={setPrice}
              perPiece={perPiece}
              selectedColor={selectedColor}
              selectColor={selectColor}
              selectedSets={selectedSets}
              setSelectedSets={setSelectedSets}
              economics={economics}
              wishlisted={wishlisted}
              toggleWishlist={toggleWishlist}
              onAddToCart={handleAddToCart}
              onReviewOrder={handleReviewOrder}
              onShare={handleShare}
            />

            <DetailTabs
              product={product}
              styleCode={styleCode}
              setPrice={setPrice}
              perPiece={perPiece}
              selectedSets={selectedSets}
              economics={economics}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              reduce={!!reduce}
            />
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY TICKER BAR ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-inverse text-content-inverse border-t-2 border-line/30 pb-safe"
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      >
        <div className="flex items-stretch">
          <div className="flex flex-col justify-center px-4 py-2.5 flex-1 min-w-0">
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-content-inverse/55">
              {selectedSets} set{selectedSets > 1 ? "s" : ""} ·{" "}
              {economics.totalPieces} pcs · + GST at invoice
            </span>
            <span className="text-lg font-black tracking-[-0.02em] tabular-nums leading-tight">
              <AnimatedRupees value={economics.subtotal} />
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={soldOut}
            className={`px-6 flex items-center justify-center gap-2 font-bold uppercase tracking-[0.18em] text-[11px] transition-colors ${
              added
                ? "bg-accent-lime text-on-accent"
                : soldOut
                  ? "bg-transparent text-content-inverse/40"
                  : "bg-accent-lime text-on-accent active:opacity-90"
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={added ? "added" : "default"}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                className="flex items-center gap-2"
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2.5} /> Added
                  </>
                ) : soldOut ? (
                  "Sold out"
                ) : (
                  <>
                    Add <ShoppingBag className="w-4 h-4" />
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
        {soldOut && (
          <div className="px-4 pb-3 pt-1">
            <StockAlertForm handle={product.handle} size="Set" />
          </div>
        )}
      </div>

      {/* ── REVIEWS (demoted below the fold) ── */}
      <section id="reviews" className="w-full bg-surface">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-20 lg:pb-28">
          <Reveal y={28}>
            <ReviewsSection handle={product.handle} />
          </Reveal>
        </div>
      </section>

      {/* ── MORE FROM THIS RUN (related) ── */}
      {relatedProducts.length > 0 && (
        <section className="w-full bg-surface-2 border-t border-line/20 pt-16 lg:pt-20 pb-12 overflow-hidden">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
            <Reveal y={24}>
              <div className="flex justify-between items-end mb-8 lg:mb-10 border-b-2 border-line pb-5">
                <div>
                  <span className="eyebrow mb-3">Same category</span>
                  <h2 className="font-sans text-3xl lg:text-5xl font-black uppercase tracking-[-0.045em] leading-[0.9]">
                    More from this run
                  </h2>
                </div>
                <Link
                  href="/shop"
                  className="hidden md:inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content hover:text-accent-red transition-colors"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Reveal>

            <div className="flex gap-4 lg:gap-6 overflow-x-auto hide-scrollbar pb-8 snap-x pl-1">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/shop/${rp.handle}`}
                  className="w-[240px] lg:w-[300px] shrink-0 group snap-start"
                >
                  <div className="relative aspect-[3/4] bg-surface-hover overflow-hidden mb-4">
                    <Image
                      src={rp.image}
                      alt={rp.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="300px"
                    />
                    <span className="absolute bottom-3 right-3 bg-accent-lime px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-on-accent">
                      {getStyleCode(rp)}
                    </span>
                  </div>
                  {/* line-book data block: rule, category label, clamped title,
                      then set/per-pc on one baseline — no collisions at any
                      title length. */}
                  <div className="border-t-2 border-line/70 px-0.5 pt-3">
                    <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.22em] text-content/40">
                      {rp.category}
                    </p>
                    <h3 className="line-clamp-2 min-h-[2.1em] font-sans text-sm lg:text-[15px] font-bold uppercase tracking-[-0.01em] leading-tight text-content group-hover:text-accent-red transition-colors">
                      {rp.title}
                    </h3>
                    <div className="mt-2.5 flex items-baseline justify-between gap-3">
                      <span className="font-black text-content text-base tracking-[-0.02em] tabular-nums">
                        {formatPrice(rp.salePrice ?? rp.price)}
                        <span className="ml-1 text-[8px] font-bold uppercase tracking-[0.14em] text-content/40">
                          /set
                        </span>
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] tabular-nums text-content/45">
                        {getPerPiecePrice(rp.salePrice ?? rp.price) &&
                          `${formatPrice(getPerPiecePrice(rp.salePrice ?? rp.price))}/pc`}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              <div className="w-6 shrink-0" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   THE STAGE — garment shown in full (object-contain) on a warm studio
   backdrop. Nothing is cropped. Plate-index rail + one-shot registration
   scan preserve the line-book identity.
   ══════════════════════════════════════════════════════════════════ */
function ImageStage({
  product,
  activeImageIndex,
  setActiveImageIndex,
  styleCode,
  soldOut,
  reduce,
}: {
  product: MockProduct;
  activeImageIndex: number;
  setActiveImageIndex: (i: number) => void;
  styleCode: string;
  soldOut: boolean;
  reduce: boolean;
}) {
  const plates = product.images.slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-4 lg:gap-6">
        {/* Plate numbers — catalog plate index, not a thumbnail strip */}
        {plates.length > 1 && (
          <div className="hidden sm:flex flex-col gap-3 pt-1 shrink-0">
            {plates.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImageIndex(i)}
                aria-label={`View plate ${i + 1}`}
                className={`group relative w-14 h-20 lg:w-16 lg:h-24 overflow-hidden border-2 transition-all duration-300 bg-surface-hover ${
                  activeImageIndex === i
                    ? "border-line"
                    : "border-line/15 hover:border-line/50"
                }`}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  className={`object-cover transition-opacity duration-300 ${
                    activeImageIndex === i
                      ? "opacity-100"
                      : "opacity-50 group-hover:opacity-90"
                  }`}
                  sizes="64px"
                />
                <span
                  className={`absolute bottom-0 left-0 px-1 py-0.5 text-[8px] font-bold tracking-[0.1em] ${
                    activeImageIndex === i
                      ? "bg-accent-lime text-on-accent"
                      : "bg-surface-inverse/70 text-content-inverse"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Hero plate — garment on a warm studio backdrop, shown in full */}
        <div className="frame-luxe flex-1 relative">
          {/* Deterministic sizing: mobile keeps the native 4/5 plate; on lg the
              conflicting aspect is dropped so the plate fills the full 7-col
              track at a viewport-capped height (sticky top-28 + 11rem offset
              leaves 4rem clearance — the plate is always fully in view). */}
          <div className="relative w-full aspect-[4/5] lg:aspect-auto lg:h-[min(calc(100vh-11rem),840px)] overflow-hidden bg-surface-hover/60">
            {/* Soft studio glow keyed warm — gallery matting, not empty space */}
            <div className="product-stage-glow absolute inset-0" aria-hidden />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeImageIndex}
                initial={{ opacity: 0, scale: reduce ? 1 : 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                className="absolute inset-0"
                style={{ willChange: "transform", backfaceVisibility: "hidden" }}
              >
                <Image
                  src={product.images[activeImageIndex]}
                  alt={product.title}
                  fill
                  className="object-contain p-4 sm:p-6 lg:p-8"
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              </motion.div>
            </AnimatePresence>

            {/* Registration scan — one pass, document entering the system */}
            {!reduce && (
              <motion.div
                initial={{ y: "-100%", opacity: 0.9 }}
                animate={{ y: "120%", opacity: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
                className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-accent-lime/40 to-transparent pointer-events-none"
              />
            )}

            {/* Style-code chip */}
            <span className="absolute bottom-4 right-4 bg-accent-lime px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent">
              {styleCode}
            </span>

            {soldOut && (
              <span className="absolute top-4 left-4 bg-accent-red px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
                Sold Out
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile plate index — horizontal snap row */}
      {plates.length > 1 && (
        <div className="flex sm:hidden gap-3 overflow-x-auto hide-scrollbar">
          {plates.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImageIndex(i)}
              aria-label={`View plate ${i + 1}`}
              className={`relative w-14 h-20 shrink-0 overflow-hidden border-2 transition-all bg-surface-hover ${
                activeImageIndex === i ? "border-line" : "border-line/15"
              }`}
            >
              <Image
                src={img}
                alt=""
                fill
                className={`object-cover ${activeImageIndex === i ? "opacity-100" : "opacity-50"}`}
                sizes="56px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   THE CONSOLE — the whole buy decision, above the fold. Status, title,
   price, colorway, sets stepper + Add, live total, quiet actions.
   ══════════════════════════════════════════════════════════════════ */
function BuyConsole({
  product,
  soldOut,
  added,
  setPrice,
  perPiece,
  selectedColor,
  selectColor,
  selectedSets,
  setSelectedSets,
  economics,
  wishlisted,
  toggleWishlist,
  onAddToCart,
  onReviewOrder,
  onShare,
}: {
  product: MockProduct;
  soldOut: boolean;
  added: boolean;
  setPrice: number;
  perPiece: number;
  selectedColor: string;
  selectColor: (color: string) => void;
  selectedSets: number;
  setSelectedSets: React.Dispatch<React.SetStateAction<number>>;
  economics: {
    gst: ReturnType<typeof calculateGstBreakdown>;
    subtotal: number;
    totalPieces: number;
  };
  wishlisted: boolean;
  toggleWishlist: (product: MockProduct) => void;
  onAddToCart: () => void;
  onReviewOrder: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Header: title + status */}
      <div className="border-b border-line/20 pb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className={`h-1.5 w-1.5 ${soldOut ? "bg-accent-red" : "bg-accent-lime"}`}
          />
          <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-content/55">
            {soldOut ? "Out of stock" : "In stock · Ready to order"}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-[2.4rem] font-black uppercase tracking-[-0.04em] leading-[0.95]">
          {product.title}
        </h1>
      </div>

      {/* Price — per-piece is the hero number for a reseller */}
      <div className="flex items-end justify-between gap-4 py-4 border-b border-line/20">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/45 mb-1">
            Per piece
          </p>
          <p className="text-3xl font-black tracking-[-0.03em] leading-none tabular-nums">
            {formatPrice(perPiece)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-content/45 mb-1">
            Per set · {B2B_CONFIG.setSize} pcs
          </p>
          <div className="flex items-baseline justify-end gap-2">
            {product.salePrice && (
              <span className="text-[11px] font-bold text-content/40 line-through tabular-nums">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="text-lg font-black tracking-[-0.02em] tabular-nums">
              {formatPrice(setPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* ── BUY BLOCK — the primary action, immediately in reach ── */}
      <div className="py-5 flex flex-col gap-4">
        {/* Colorway (compact inline row) */}
        {product.colors.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/45 shrink-0">
              Color
              <span className="ml-2 text-content capitalize tracking-[0.12em]">
                {selectedColor}
              </span>
            </span>
            <div className="flex gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => selectColor(color)}
                  aria-label={`Select ${color}`}
                  className={`group relative h-9 w-9 border-2 transition-transform duration-200 ${
                    selectedColor === color
                      ? "border-line -translate-y-0.5"
                      : "border-line/20 hover:-translate-y-0.5 hover:border-line/50"
                  }`}
                  style={{ backgroundColor: COLOR_MAP[color] ?? "#ccc" }}
                >
                  {selectedColor === color && (
                    <motion.span
                      layoutId="swatchFrame"
                      className="absolute inset-[2px] border border-accent-lime"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sets stepper + Add to order — the money row, side by side */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-stretch border-2 border-line h-14 shrink-0">
            <button
              onClick={() =>
                setSelectedSets((v) =>
                  Math.max(B2B_CONFIG.minimumStyleSets, v - 1),
                )
              }
              disabled={soldOut}
              className="w-12 flex items-center justify-center text-content hover:bg-surface-inverse hover:text-content-inverse transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-content"
              aria-label="Decrease sets"
            >
              <Minus className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <div className="w-14 flex flex-col items-center justify-center border-x-2 border-line leading-none">
              <span className="text-xl font-black tabular-nums">
                {String(selectedSets).padStart(2, "0")}
              </span>
              <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-content/45 mt-0.5">
                sets
              </span>
            </div>
            <button
              onClick={() => setSelectedSets((v) => v + 1)}
              disabled={soldOut}
              className="w-12 flex items-center justify-center text-content hover:bg-surface-inverse hover:text-content-inverse transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-content"
              aria-label="Increase sets"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={onAddToCart}
            disabled={soldOut}
            className={`group relative flex-1 h-14 flex items-center justify-between px-5 overflow-hidden transition-colors duration-300 ${
              added
                ? "bg-accent-lime text-on-accent"
                : soldOut
                  ? "bg-transparent border-2 border-line/25 text-content/40 cursor-not-allowed"
                  : "bg-surface-inverse text-content-inverse hover:bg-accent-lime hover:text-on-accent"
            }`}
          >
            <span className="relative z-10 overflow-hidden h-5 flex items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={added ? "added" : "default"}
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -18, opacity: 0 }}
                  className="font-bold uppercase tracking-[0.18em] text-[11px] whitespace-nowrap"
                >
                  {added
                    ? "Added to order"
                    : soldOut
                      ? "Sold out"
                      : "Add to order"}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="relative z-10 w-6 h-6 flex items-center justify-center shrink-0">
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="bag"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <ShoppingBag className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </button>
        </div>

        {/* Secondary row: review cart + live total inline */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onReviewOrder}
            disabled={soldOut}
            className={`text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
              soldOut
                ? "text-content/40 cursor-not-allowed"
                : "text-content hover:text-accent-red"
            }`}
          >
            Review cart →
          </button>
          {/* Charge-adjacent number = the exact payable (ex-GST subtotal);
              GST is estimated on the invoice at dispatch (GST_CONFIG.note). */}
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-content/50 tabular-nums">
            {economics.totalPieces} pcs · total{" "}
            <span className="text-content">
              <AnimatedRupees value={economics.subtotal} />
            </span>{" "}
            + GST at invoice
          </p>
        </div>

        {soldOut && <StockAlertForm handle={product.handle} size="Set" />}

        {/* Quiet actions row */}
        <div className="flex items-center gap-6 border-t border-line/20 pt-4">
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            className="group flex items-center gap-2"
            aria-label={
              wishlisted ? "Remove from line sheet" : "Save to line sheet"
            }
          >
            <Heart
              className={`w-4 h-4 transition-all group-hover:scale-110 ${wishlisted ? "fill-accent-red text-accent-red" : "text-content/40 group-hover:text-accent-red"}`}
            />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-content/55 group-hover:text-content transition-colors">
              Save
            </span>
          </button>
          <div className="w-px h-3 bg-line/20" />
          <button
            type="button"
            onClick={onShare}
            className="group flex items-center gap-2"
          >
            <Share2 className="w-4 h-4 text-content/40 group-hover:text-content transition-all group-hover:scale-110" />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-content/55 group-hover:text-content transition-colors">
              Share
            </span>
          </button>
          <div className="w-px h-3 bg-line/20" />
          <Link href="/contact" className="group flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-content/40 group-hover:text-content transition-colors" />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-content/55 group-hover:text-content transition-colors">
              Questions?
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DETAIL TABS — secondary info, one tap away instead of a long scroll.
   Details / Pack & sizing / Pricing / Trade terms. Sliding lime
   underline + cross-fading panels.
   ══════════════════════════════════════════════════════════════════ */
function DetailTabs({
  product,
  styleCode,
  setPrice,
  perPiece,
  selectedSets,
  economics,
  activeTab,
  setActiveTab,
  reduce,
}: {
  product: MockProduct;
  styleCode: string;
  setPrice: number;
  perPiece: number;
  selectedSets: number;
  economics: {
    gst: ReturnType<typeof calculateGstBreakdown>;
    subtotal: number;
    totalPieces: number;
  };
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
  reduce: boolean;
}) {
  const moqTarget = B2B_CONFIG.minimumOrderSets;
  const moqProgress = Math.min(1, selectedSets / moqTarget);
  const moqMet = selectedSets >= moqTarget;

  return (
    <div className="border-t-2 border-line mt-1">
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Product information"
        className="flex items-stretch gap-1 overflow-x-auto hide-scrollbar -mb-px"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 px-3.5 py-4 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                active ? "text-content" : "text-content/40 hover:text-content/70"
              }`}
            >
              {tab.label}
              {active && (
                <motion.span
                  layoutId="pdpTabUnderline"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-lime"
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
          >
            {activeTab === "details" && (
              <div className="max-w-[54ch]">
                <p className="text-sm leading-7 text-content/70">
                  {product.description}
                </p>
                <a
                  href={buildProductInquiryUrl(product)}
                  className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content hover:text-accent-red transition-colors"
                >
                  Ask availability on WhatsApp{" "}
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {activeTab === "pack" && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
                      Pack anatomy
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-content/45">
                      {SIZE_RATIO_LABEL} run
                    </span>
                  </div>
                  <div className="grid grid-cols-4 border border-line/25">
                    {B2B_CONFIG.sizeRatio.map((size, i) => (
                      <div
                        key={size}
                        className={`flex items-center justify-center py-3 text-sm font-black tracking-[-0.02em] ${
                          i > 0 ? "border-l border-line/20" : ""
                        }`}
                      >
                        {size}
                        <span className="text-[8px] font-bold text-content/40 ml-1">
                          ×1
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-content/45">
                    1 set = {B2B_CONFIG.setSize} pcs · one of each size
                  </p>
                </div>

                {/* MOQ meter — informational (MOQ applies across the whole cart) */}
                <div>
                  <div className="relative h-1 bg-line/15 overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 ${moqMet ? "bg-accent-lime" : "bg-accent-red"}`}
                      initial={false}
                      animate={{ width: `${moqProgress * 100}%` }}
                      transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                    />
                  </div>
                  <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-content/45">
                    {moqMet
                      ? `Cart MOQ met · ${moqTarget} sets`
                      : `Cart MOQ ${moqTarget} sets · mix any styles`}
                  </p>
                </div>

                {/* Trust strip */}
                <div className="grid grid-cols-3 border border-line/25">
                  {[
                    { icon: Banknote, label: "GST Invoice" },
                    { icon: Truck, label: "All-India Dispatch" },
                    { icon: RefreshCcw, label: `MOQ ${moqTarget} Sets` },
                  ].map(({ icon: Icon, label }, i) => (
                    <div
                      key={label}
                      className={`flex flex-col items-center gap-1.5 text-center py-3 ${i > 0 ? "border-l border-line/20" : ""}`}
                    >
                      <Icon
                        className="w-3.5 h-3.5 text-content"
                        strokeWidth={1.5}
                      />
                      <span className="text-[8px] uppercase tracking-[0.1em] font-bold text-content/55 leading-tight px-1">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="flex flex-col gap-6">
                {/* Full price ledger — the wholesale detail */}
                <div className="panel-luxe p-4">
                  <LedgerRow
                    label="Subtotal"
                    sub={`${selectedSets} set${selectedSets > 1 ? "s" : ""} × ${formatPrice(setPrice)}`}
                    value={<AnimatedRupees value={economics.subtotal} />}
                  />
                  <div className="h-px bg-line/15 my-2.5" />
                  <LedgerRow
                    label={`GST ${economics.gst.gstRateLabel}`}
                    sub="On per-piece value"
                    value={<AnimatedRupees value={economics.gst.gstAmount} />}
                    muted
                  />
                  <div className="h-px bg-line/15 my-2.5" />
                  <div className="flex items-end justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-content/60">
                      Est. invoice total
                    </span>
                    <span className="text-xl font-black tracking-[-0.03em] tabular-nums">
                      <AnimatedRupees value={economics.gst.grandTotal} />
                    </span>
                  </div>
                </div>

                {/* Reseller margin estimator */}
                <ResellerMarginEstimator wholesalePerPiece={perPiece} />
              </div>
            )}

            {activeTab === "terms" && (
              <ul className="text-sm leading-6 text-content/65 list-disc list-inside space-y-1.5">
                <li>Style code: {styleCode}</li>
                <li>
                  1 set = {B2B_CONFIG.setSize} pcs in a {SIZE_RATIO_LABEL} size
                  run
                </li>
                <li>
                  Wholesale set price shown before any cart-level adjustment
                </li>
                <li>
                  Stock, GST invoice, dispatch city & Razorpay payment link
                  confirmed on WhatsApp before shipping
                </li>
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LedgerRow({
  label,
  sub,
  value,
  muted,
}: {
  label: string;
  sub?: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.16em] ${muted ? "text-content/50" : "text-content/70"}`}
        >
          {label}
        </p>
        {sub && (
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-content/40 mt-0.5">
            {sub}
          </p>
        )}
      </div>
      <span
        className={`text-sm font-black tracking-[-0.02em] tabular-nums ${muted ? "text-content/70" : "text-content"}`}
      >
        {value}
      </span>
    </div>
  );
}
