"use client";

/**
 * THE STYLE FOLIO — the product page as one page of the line book.
 *
 * Not a photo gallery with a card stack bolted to its right edge. The sheet is
 * ruled like a line-sheet folio and read in the order a boutique owner actually
 * asks:
 *
 *   letterhead   — where am I, which style, what pack (the running head)
 *   the entry    — the name at display scale, and beside it THE RATE, per piece
 *                  first, with what the buyer keeps on it
 *   the spread   — the plate on the left, the order console on the right, both
 *                  hanging off one shared rule
 *   the note     — description + the trade facts + what this order invoices at
 *   the run      — siblings standing on a shared ground rule at staggered heights
 *   buyer notes  — the reviews
 *
 * The vocabulary is the cover's: warm cream paper, brown-black ink, ONE
 * vermilion. Type does the work — a vermilion dot eyebrow, a light Fraunces
 * line closing in vermilion italic, a hairline under it. Nothing is a rounded
 * box in a row of equal rounded boxes; the composition is carried by rules,
 * scale and asymmetry.
 *
 * ON A PHONE the same order survives, unstacked: letterhead → name → rate →
 * plate → what a set is → order. The rate is the second thing on the page
 * because it is the second question, and a fixed ink bar keeps "Add to order"
 * under the thumb the whole way down.
 *
 * Every number here comes from B2B_CONFIG / GST_CONFIG / the pricing helpers.
 * Nothing about stock is asserted except sold-out.
 */

import {
  use,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getProductByHandle,
  formatPrice,
  COLOR_MAP,
  type MockProduct,
} from "@/lib/commerce/catalog";
import ReviewsSection from "@/components/product/reviews-section";
import StockAlertForm from "@/components/product/stock-alert-form";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useTray } from "@/lib/line/tray-context";
import { TRAY_CART_SIZE } from "@/lib/line/tray-handoff";
import { PLATE_MORPH_CLASS, plateMorphName } from "@/lib/line/plate-morph";
import {
  B2B_CONFIG,
  GST_CONFIG,
  SIZE_RATIO_LABEL,
  TYPICAL_RESALE_MULTIPLIER,
} from "@/lib/b2b/config";
import { getPerPiecePrice, calculateGstBreakdown } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { buildProductInquiryUrl } from "@/lib/b2b/whatsapp";
import { ResellerMarginEstimator } from "@/components/b2b/reseller-margin-estimator";
import { SetBlocks } from "@/components/b2b/set-blocks";
import { SetStepper } from "@/components/line/set-stepper";
import { PriceBlock } from "@/components/line/price-block";
import { TermsRule } from "@/components/document/terms-rule";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════════════
   SHARED FURNITURE — the same measure and the same section rhythm the
   homepage uses, so the two pages read as one printed book.
   ══════════════════════════════════════════════════════════════════════════ */

/** The page measure. Identical to the homepage's Field container. */
function Sheet({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1400px] px-5 md:px-10 lg:px-16",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The cover's section head: vermilion dot + letterspaced eyebrow, a light
 * Fraunces line whose closing clause is vermilion italic, a hairline under it.
 */
function PlateHead({
  eyebrow,
  title,
  accent,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-home-rule pb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
            <span
              aria-hidden="true"
              className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
            />
            {eyebrow}
          </p>
          <h2 className="mt-3 font-editorial text-[clamp(1.6rem,2.6vw,2.3rem)] font-light leading-[1.14] tracking-[-0.01em]">
            {title}
            {accent && (
              <>
                {" "}
                <span className="font-semibold italic text-home-vermilion">
                  {accent}
                </span>
              </>
            )}
          </h2>
        </div>
        {action && <div className="pb-1">{action}</div>}
      </div>
    </header>
  );
}

/** The homepage's pill action, at a 44px touch height on every viewport. */
const PILL =
  "inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground";

/** Small ruled caption pair — the console's recurring label line. */
function BlockLabel({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="font-trade text-[10px] tracking-[0.18em] text-home-ink-mute">
        {left}
      </p>
      {right && (
        <p className="font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
          {right}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROUTE SHELL
   ══════════════════════════════════════════════════════════════════════════ */

export default function ProductDetailPage({
  params,
  initialProduct,
  relatedProducts = [],
}: {
  params: Promise<{ handle: string }>;
  /** Server-fetched product: real HTML on first paint (SEO/LCP), no spinner. */
  initialProduct?: MockProduct | null;
  /** Server-fetched siblings sharing this style's code-category prefix. */
  relatedProducts?: MockProduct[];
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

  return (
    <div className="flex min-h-screen flex-col bg-home-ground font-sans text-home-ink">
      <Navbar />
      {/* pt clears the fixed chrome (64px, 74px at lg — the running head is
          suppressed on product pages). pb clears the fixed mobile order bar,
          which is sm:hidden, so the padding ends at sm too. */}
      <main className="relative flex-1 pb-28 pt-16 sm:pb-0 lg:pt-[74px]">
        {product === undefined ? (
          <Sheet className="flex min-h-[50vh] items-center justify-center py-24">
            <p className="font-trade text-[10px] tracking-[0.2em] text-home-ink-mute">
              Opening the style…
            </p>
          </Sheet>
        ) : product === null ? (
          <Sheet className="py-24 lg:py-32">
            <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
              <span
                aria-hidden="true"
                className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
              />
              Not in the book
            </p>
            <h1 className="mt-4 max-w-[18ch] font-editorial text-[clamp(2rem,4vw,3rem)] font-light leading-[1.1]">
              That style isn&apos;t in this season&apos;s{" "}
              <span className="font-semibold italic text-home-vermilion">
                line book.
              </span>
            </h1>
            <Link href="/shop" className={cn(PILL, "mt-8")}>
              <ArrowLeft className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Browse every style
            </Link>
          </Sheet>
        ) : (
          <StyleFolio product={product} relatedProducts={relatedProducts} />
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THE FOLIO
   ══════════════════════════════════════════════════════════════════════════ */

function StyleFolio({
  product,
  relatedProducts,
}: {
  product: MockProduct;
  relatedProducts: MockProduct[];
}) {
  const [sets, setSets] = useState(B2B_CONFIG.defaultLineSets);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const [plateIndex, setPlateIndex] = useState(0);

  // Inventory guard: only block when the backend explicitly reports unavailable.
  // Nothing positive about stock is ever printed.
  const soldOut = product.availableForSale === false;

  // Optimistic "Added" affordance (React 19): true during the add transition,
  // auto-reverts when it settles.
  const [, startAddTransition] = useTransition();
  const [added, setAddedOptimistic] = useOptimistic(
    false,
    (_state, value: boolean) => value,
  );

  const { items, addItem } = useCart();
  const tray = useTray();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const setPrice = product.salePrice ?? product.price;
  const perPiece = getPerPiecePrice(setPrice);
  const styleCode = getStyleCode(product);
  const codePrefix = styleCode.split("-").slice(0, 2).join("-");
  /** Illustrative only — TYPICAL_RESALE_MULTIPLIER is an assumption about the
      buyer's own shop, so every figure built from it says "typical". */
  const keepPerPiece =
    Math.round(perPiece * TYPICAL_RESALE_MULTIPLIER) - perPiece;

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
      quantity: sets,
    };
    const gst = calculateGstBreakdown([line], sets);
    return {
      gst,
      subtotal: setPrice * sets,
      totalPieces: sets * B2B_CONFIG.setSize,
    };
  }, [product, selectedColor, sets, setPrice]);

  /**
   * Mirror this style's post-add cart set count into the tray, exactly the
   * bulk-desk way (setRowSets): the nav mini-gauge, SetBlocks and the running
   * footer all read tray totals, so a cart-only write leaves them stale.
   * `items` is the pre-add snapshot; addItem increments, so the target is the
   * style's current cart sets (across colourways, at the wholesale size key)
   * plus what was just added.
   */
  const mirrorTraySets = (addedSets: number) => {
    const cartSets = items
      .filter(
        (item) => item.productId === product.id && item.size === TRAY_CART_SIZE,
      )
      .reduce((sum, item) => sum + item.quantity, 0);
    const target = cartSets + addedSets;
    if (target > 0) tray.commit(product, target);
    else tray.setSets(product.id, 0);
  };

  const handleAddToCart = () => {
    if (soldOut) return;
    startAddTransition(async () => {
      setAddedOptimistic(true);
      addItem(product, "Set", selectedColor, sets);
      mirrorTraySets(sets);
      await new Promise((resolve) => setTimeout(resolve, 1600));
    });
  };

  const handleReviewOrder = () => {
    if (soldOut) return;
    addItem(product, "Set", selectedColor, sets);
    mirrorTraySets(sets);
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
    if (idx !== -1 && product.images[idx]) setPlateIndex(idx);
  };

  const setsLabel = `${sets} set${sets === 1 ? "" : "s"}`;

  return (
    <>
      {/* ── LETTERHEAD — the folio's running head ────────────────────────── */}
      <div className="border-b border-home-rule bg-home-panel">
        <Sheet className="flex items-center gap-3 py-1.5 sm:gap-4">
          <Link
            href="/shop"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 font-trade text-[10px] tracking-[0.14em] text-home-ink-mute transition-colors duration-200 hover:text-home-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All styles
          </Link>
          <span aria-hidden="true" className="h-3 w-px shrink-0 bg-home-rule" />
          <span className="truncate font-trade text-[10px] tracking-[0.14em] text-home-ink">
            {styleCode}
          </span>
          <span className="ml-auto hidden shrink-0 font-trade text-[10px] tracking-[0.14em] text-home-ink-mute sm:inline">
            {product.category} · set of {B2B_CONFIG.setSize} ·{" "}
            {SIZE_RATIO_LABEL}
          </span>
        </Sheet>
      </div>

      {/* ── THE ENTRY — the name, and beside it the rate ─────────────────── */}
      <Sheet className="pt-9 lg:pt-14">
        <div className="grid gap-y-8 lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="lg:col-span-7">
            {soldOut ? (
              <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
                <span
                  aria-hidden="true"
                  className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
                />
                Sold out · not shipping
              </p>
            ) : (
              <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
                <span
                  aria-hidden="true"
                  className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
                />
                Style {styleCode}
              </p>
            )}
            <h1 className="mt-3 max-w-[17ch] font-editorial text-[clamp(2.05rem,4.4vw,3.3rem)] font-light leading-[1.08] tracking-[-0.015em]">
              {product.title}
            </h1>
            <p className="mt-4 font-trade text-[10px] tracking-[0.16em] text-home-ink-mute">
              {product.category} · {product.colors.length} colourway
              {product.colors.length === 1 ? "" : "s"} · {SIZE_RATIO_LABEL} run
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="lg:border-l lg:border-home-rule lg:pl-8">
              <p className="font-trade text-[10px] tracking-[0.18em] text-home-ink-mute">
                Your wholesale rate
              </p>
              {/* PER PIECE LEADS. The set rate is an artifact of the pack size
                  and sits behind it — the inversion is law on this site. */}
              <p className="mt-2.5 flex items-baseline gap-2">
                <span className="text-[clamp(2.4rem,4.8vw,3.2rem)] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
                  {formatPrice(perPiece)}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-home-ink-mute">
                  per piece
                </span>
              </p>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[14px] text-home-ink-soft">
                <span className="font-semibold tabular-nums text-home-ink">
                  {formatPrice(setPrice)}
                </span>
                <span>per set of {B2B_CONFIG.setSize}</span>
                {product.salePrice !== null && (
                  <span className="tabular-nums text-home-ink-mute line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </p>
              <p className="mt-3 border-t border-home-rule pt-3 text-[14px] leading-[1.5]">
                <span className="font-editorial font-semibold italic text-home-vermilion">
                  you keep {formatPrice(keepPerPiece)} a piece
                </span>{" "}
                <span className="text-home-ink-mute">
                  at a typical {TYPICAL_RESALE_MULTIPLIER}× resale
                </span>
              </p>
            </div>
          </div>
        </div>
        <hr className="mt-9 border-0 border-t border-home-rule lg:mt-12" />
      </Sheet>

      {/* ── THE SPREAD — plate left, console right ───────────────────────── */}
      <Sheet className="pt-8 lg:pt-12">
        <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <Plate
              product={product}
              plateIndex={plateIndex}
              setPlateIndex={setPlateIndex}
              selectColor={selectColor}
              styleCode={styleCode}
              soldOut={soldOut}
            />
          </div>

          <div className="lg:col-span-5">
            <OrderConsole
              product={product}
              soldOut={soldOut}
              added={added}
              perPiece={perPiece}
              setPrice={setPrice}
              sets={sets}
              setSets={setSets}
              setsLabel={setsLabel}
              selectedColor={selectedColor}
              selectColor={selectColor}
              economics={economics}
              wishlisted={wishlisted}
              toggleWishlist={toggleWishlist}
              onAddToCart={handleAddToCart}
              onReviewOrder={handleReviewOrder}
              onShare={handleShare}
            />
          </div>
        </div>
      </Sheet>

      {/* ── THE NOTE — what it is, and what this order invoices at ───────── */}
      <div className="mt-16 border-t border-home-rule bg-home-panel lg:mt-24">
        <Sheet className="py-16 lg:py-20">
          <PlateHead
            eyebrow="The style"
            title="What you're buying,"
            accent="in plain words."
          />
          <div className="mt-10 grid gap-y-12 lg:grid-cols-12 lg:gap-x-12">
            <div className="lg:col-span-6">
              <p className="max-w-[54ch] text-[15px] leading-[1.7] text-home-ink-soft">
                {product.description}
              </p>
              <SpecList
                product={product}
                styleCode={styleCode}
                perPiece={perPiece}
                setPrice={setPrice}
              />
            </div>

            <div className="lg:col-span-5 lg:col-start-8">
              <BlockLabel left={`What ${setsLabel} invoices at`} />
              <div className="mt-3 flex flex-col">
                <LedgerRow
                  label="Subtotal"
                  note={`${setsLabel} × ${formatPrice(setPrice)}`}
                  value={formatPrice(economics.subtotal)}
                />
                <LedgerRow
                  label={`${GST_CONFIG.label} ${economics.gst.gstRateLabel}`}
                  note="on the per-piece value"
                  value={formatPrice(economics.gst.gstAmount)}
                  muted
                />
                <div className="flex items-baseline justify-between gap-4 border-t border-home-ink/30 pt-3.5">
                  <span className="font-trade text-[10px] tracking-[0.16em] text-home-ink-mute">
                    Estimated invoice
                  </span>
                  <span className="text-[22px] font-extrabold tabular-nums tracking-[-0.03em]">
                    {formatPrice(economics.gst.grandTotal)}
                  </span>
                </div>
              </div>
              <p className="mt-3.5 max-w-[46ch] text-[12px] leading-[1.6] text-home-ink-mute">
                {GST_CONFIG.note}
              </p>

              {/* Planning aid, deliberately after the buy decision. */}
              <details className="group mt-7 border-t border-home-rule">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-trade text-[10px] tracking-[0.14em] text-home-ink-soft transition-colors duration-200 hover:text-home-ink [&::-webkit-details-marker]:hidden">
                  <span>
                    At a typical {TYPICAL_RESALE_MULTIPLIER}× resale you keep{" "}
                    {formatPrice(keepPerPiece)} a piece
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-home-ink-mute group-open:hidden"
                  >
                    +
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden shrink-0 text-home-ink-mute group-open:inline"
                  >
                    −
                  </span>
                </summary>
                <div className="pb-2">
                  <ResellerMarginEstimator wholesalePerPiece={perPiece} />
                </div>
              </details>
            </div>
          </div>
        </Sheet>
      </div>

      {/* ── THE RUN — siblings on a shared ground rule ───────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-home-rule bg-home-ground">
          <Sheet className="py-16 lg:py-20">
            <PlateHead
              eyebrow={`${codePrefix}-* · ${relatedProducts.length} style${relatedProducts.length === 1 ? "" : "s"}`}
              title="From the same run,"
              accent="same book."
              action={
                <Link href="/shop" className={PILL}>
                  All styles →
                </Link>
              }
            />
            <SameRun products={relatedProducts} />
          </Sheet>
        </div>
      )}

      {/* ── BUYER NOTES ──────────────────────────────────────────────────── */}
      <div className="border-t border-home-rule bg-home-panel">
        <Sheet className="py-16 lg:py-20">
          <ReviewsSection handle={product.handle} />
        </Sheet>
      </div>

      {/* ── FIXED MOBILE ORDER BAR ───────────────────────────────────────── */}
      {/* Opaque panel + one ink hairline, no drop shadow: the whole page is
          ruled paper, and a shadow here would also have to be a hardcoded
          colour that cannot follow the theme. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-home-ink/25 bg-home-panel pb-safe sm:hidden">
        <div className="flex items-center gap-3 px-5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-trade text-[9px] tracking-[0.14em] text-home-ink-mute">
              {setsLabel} · {economics.totalPieces} pcs · + GST at invoice
            </p>
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[19px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                {formatPrice(perPiece)}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-home-ink-mute">
                /pc
              </span>
              <span className="truncate text-[12px] font-semibold tabular-nums text-home-ink-soft">
                · {formatPrice(economics.subtotal)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={soldOut}
            className={cn(
              "flex h-12 shrink-0 items-center justify-center gap-2 px-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-colors duration-200",
              added
                ? "bg-accent-lime text-on-accent"
                : soldOut
                  ? "cursor-not-allowed border border-home-rule text-home-ink-mute"
                  : "bg-home-ink text-home-ground active:opacity-85",
            )}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2.5} /> Added
              </>
            ) : soldOut ? (
              "Sold out"
            ) : (
              <>
                Add <ShoppingBag className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THE PLATE — the garment shown whole on paper.

   A square field, because the studio shots are square: a taller box letterboxed
   every photograph (a measured 65px of dead paper above and below at 1440×900)
   and rendered the garment smaller for nothing. The thumbnails hang off one
   hairline under the plate — square and object-contain, so a thumbnail is a
   true preview of what opens rather than a crop of it.
   ══════════════════════════════════════════════════════════════════════════ */

function Plate({
  product,
  plateIndex,
  setPlateIndex,
  selectColor,
  styleCode,
  soldOut,
}: {
  product: MockProduct;
  plateIndex: number;
  setPlateIndex: (i: number) => void;
  selectColor: (color: string) => void;
  styleCode: string;
  soldOut: boolean;
}) {
  const plates = product.images.slice(0, 4);

  // Tap-to-zoom pan: transform-only, motion-safe (reduced motion snaps).
  // Pinch-zoom stays native — no touch-action override anywhere.
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  // A plate switch always resets the inspection zoom (render-phase reset — the
  // React docs' "adjusting state when a prop changes" pattern).
  const [prevIndex, setPrevIndex] = useState(plateIndex);
  if (prevIndex !== plateIndex) {
    setPrevIndex(plateIndex);
    setZoomed(false);
  }

  const updateOrigin = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: Math.min(
        100,
        Math.max(0, ((event.clientX - rect.left) / rect.width) * 100),
      ),
      y: Math.min(
        100,
        Math.max(0, ((event.clientY - rect.top) / rect.height) * 100),
      ),
    });
  };

  /** Rail click: route through selectColor when the plate has a named
      colourway, so the console and the plate never disagree. */
  const openPlate = (index: number) => {
    const color = product.colors[index];
    if (color) selectColor(color);
    else setPlateIndex(index);
  };

  /** "01 · sage"-style rail label from the colour→index map. */
  const plateLabel = (index: number) => {
    const number = String(index + 1).padStart(2, "0");
    const color = product.colors[index];
    return color ? `${number} · ${color}` : number;
  };

  return (
    <div className="lg:sticky lg:top-[98px]">
      <div
        className="relative w-full overflow-hidden border border-home-rule bg-home-panel"
        style={{
          aspectRatio: "1 / 1",
          // View Transitions morph target. The list side claims the SAME name on
          // click (src/lib/line/plate-morph.ts) so the garment travels across the
          // navigation. A static name is safe here and only here: a product page
          // has exactly one hero, so it cannot collide with itself.
          viewTransitionName: plateMorphName(product.id),
          // Groups this snapshot with the list plates so one CSS rule gives them
          // all the same curve and keeps the garment from squashing as the box
          // changes from 4:5 to 1:1.
          viewTransitionClass: PLATE_MORPH_CLASS,
        }}
      >
        <button
          type="button"
          aria-label={zoomed ? "Reset zoom" : "Zoom in to inspect the fabric"}
          onClick={(event) => {
            updateOrigin(event as unknown as React.PointerEvent<HTMLElement>);
            setZoomed((z) => !z);
          }}
          onPointerMove={(event) => {
            if (zoomed && event.pointerType === "mouse") updateOrigin(event);
          }}
          className={cn(
            "absolute inset-0 block h-full w-full",
            zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
        >
          <span
            className="absolute inset-0 block motion-safe:transition-transform motion-safe:duration-200"
            style={{
              transform: zoomed ? "scale(2)" : "none",
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          >
            <Image
              src={product.images[plateIndex]}
              alt={product.title}
              fill
              className="object-contain p-4 sm:p-6 lg:p-8"
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </span>
        </button>

        {/* Stated in plain words — nothing else tells a buyer the cloth can be
            inspected up close. */}
        <span className="pointer-events-none absolute bottom-4 left-4 border border-home-rule bg-home-ground/90 px-2.5 py-1.5 font-trade text-[9px] tracking-[0.14em] text-home-ink-soft">
          {zoomed ? "Tap to reset" : "Tap to zoom"}
        </span>

        <span className="pointer-events-none absolute bottom-4 right-4 bg-home-ink px-2.5 py-1.5 font-trade text-[9px] tracking-[0.14em] text-home-ground">
          {styleCode}
        </span>

        {soldOut && (
          <span className="pointer-events-none absolute left-4 top-4 border border-home-vermilion bg-home-ground px-3 py-1.5 font-trade text-[9px] tracking-[0.16em] text-home-vermilion">
            Sold out
          </span>
        )}
      </div>

      {plates.length > 1 && (
        <div className="mt-5 flex gap-3 overflow-x-auto border-t border-home-rule pt-4 hide-scrollbar">
          {plates.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => openPlate(i)}
              aria-label={`Show photo ${plateLabel(i)}`}
              aria-pressed={plateIndex === i}
              className="group flex shrink-0 flex-col gap-1.5 text-left"
            >
              <span
                className={cn(
                  "relative block h-[72px] w-[72px] overflow-hidden border bg-home-panel transition-colors duration-200",
                  plateIndex === i
                    ? "border-home-ink"
                    : "border-home-rule group-hover:border-home-ink/60",
                )}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  sizes="72px"
                  className={cn(
                    "object-contain transition-opacity duration-200",
                    plateIndex === i
                      ? "opacity-100"
                      : "opacity-60 group-hover:opacity-90",
                  )}
                />
              </span>
              <span
                className={cn(
                  "block font-trade text-[9px] capitalize tracking-[0.08em]",
                  plateIndex === i ? "text-home-ink" : "text-home-ink-mute",
                )}
              >
                {plateLabel(i)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THE ORDER CONSOLE — what a set is, which colourway, how many, add.
   One unmistakable primary action; WhatsApp is the persistent secondary.
   ══════════════════════════════════════════════════════════════════════════ */

function OrderConsole({
  product,
  soldOut,
  added,
  perPiece,
  setPrice,
  sets,
  setSets,
  setsLabel,
  selectedColor,
  selectColor,
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
  perPiece: number;
  setPrice: number;
  sets: number;
  setSets: React.Dispatch<React.SetStateAction<number>>;
  setsLabel: string;
  selectedColor: string;
  selectColor: (color: string) => void;
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
  const { totals } = useTray();

  return (
    <div className="flex flex-col">
      {/* ── What one set is. This block is the whole teaching job: four ruled
             cells, one piece each, and the arithmetic written underneath. ── */}
      <section aria-label="What one set contains">
        <BlockLabel
          left="One set ships as"
          right={`${B2B_CONFIG.setSize} pieces`}
        />
        <div className="mt-3 grid grid-cols-4 border-y border-home-rule">
          {B2B_CONFIG.sizeRatio.map((size, i) => (
            <div
              key={size}
              className={cn(
                "flex flex-col items-center gap-1.5 py-4",
                i > 0 && "border-l border-home-rule",
              )}
            >
              <span className="font-editorial text-[20px] font-light leading-none">
                {size}
              </span>
              <span className="font-trade text-[10px] leading-none text-home-ink-mute">
                ×1
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 inline-flex items-center gap-2.5 font-trade text-[10px] tracking-[0.12em] text-home-ink-mute">
          <span
            aria-hidden="true"
            className="h-[5px] w-[5px] shrink-0 rounded-full bg-home-vermilion"
          />
          one of each size — {SIZE_RATIO_LABEL} — is one set
        </p>
      </section>

      {/* ── Colourway ── */}
      {product.colors.length > 0 && (
        <section className="mt-7" aria-label="Colourway">
          <BlockLabel left="Colourway" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {product.colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => selectColor(color)}
                aria-label={`Show the ${color} colourway`}
                aria-pressed={selectedColor === color}
                className={cn(
                  "relative h-11 w-11 border border-home-rule transition-[outline-color] duration-200",
                  selectedColor === color &&
                    "outline outline-2 outline-offset-2 outline-home-ink",
                )}
                style={{
                  backgroundColor: COLOR_MAP[color] ?? "var(--home-raised)",
                }}
              />
            ))}
            <span className="ml-1 font-trade text-[10px] capitalize tracking-[0.14em] text-home-ink">
              {selectedColor}
            </span>
          </div>
        </section>
      )}

      {/* ── The money row ── */}
      <section className="mt-7" aria-label="Add this style to your order">
        <BlockLabel
          left="Sets of this style"
          right={`${economics.totalPieces} pieces`}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {/* The site's one order control, held at a 48px touch target here.
              The override is layout only — set-stepper.tsx is untouched. */}
          <div className="shrink-0 [&_button]:h-12 [&_button]:w-12 [&_span]:h-12">
            <SetStepper
              sets={sets}
              onChange={(next) => setSets(next)}
              size="md"
              disabled={soldOut}
              label="Sets of this style"
            />
          </div>

          <button
            type="button"
            onClick={onAddToCart}
            disabled={soldOut}
            className={cn(
              // `w-full sm:flex-1`, never a bare `flex-1`: the row is a COLUMN
              // below sm, where flex-basis:0% governs height and silently
              // collapses h-12 to the text's own 17px.
              "flex h-12 w-full items-center justify-center gap-2.5 px-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-colors duration-200 sm:flex-1",
              added
                ? "bg-accent-lime text-on-accent"
                : soldOut
                  ? "cursor-not-allowed border border-home-rule text-home-ink-mute"
                  : "bg-home-ink text-home-ground hover:opacity-85",
            )}
          >
            {added ? (
              <>
                <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} /> Added
                to order
              </>
            ) : soldOut ? (
              "Sold out"
            ) : (
              <>
                Add to order
                <ShoppingBag className="h-4 w-4 shrink-0" />
              </>
            )}
          </button>
        </div>

        <a
          href={buildProductInquiryUrl(product)}
          target="_blank"
          rel="noopener"
          className="mt-3 flex h-12 items-center justify-center gap-2.5 border border-home-ink/30 px-4 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Confirm stock on WhatsApp
        </a>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-home-rule pt-4">
          <p className="text-[13px] text-home-ink-soft">
            <span className="font-semibold tabular-nums text-home-ink">
              {setsLabel}
            </span>{" "}
            · {economics.totalPieces} pcs
          </p>
          <p className="text-[15px] font-semibold tabular-nums text-home-ink">
            {formatPrice(economics.subtotal)}
            <span className="ml-2 font-trade text-[10px] font-normal tracking-[0.12em] text-home-ink-mute">
              + GST at invoice
            </span>
          </p>
        </div>

        {/* The label says what the control does: it adds the sets, then opens
            the order. */}
        <button
          type="button"
          onClick={onReviewOrder}
          disabled={soldOut}
          className={cn(
            "inline-flex min-h-11 items-center font-trade text-[10px] tracking-[0.14em] underline-offset-4 transition-colors duration-200",
            soldOut
              ? "cursor-not-allowed text-home-ink-mute/60"
              : "text-home-ink-mute hover:text-home-ink hover:underline",
          )}
        >
          Add and review your order →
        </button>

        {soldOut && (
          <div className="mt-2">
            <StockAlertForm handle={product.handle} size="Set" />
          </div>
        )}
      </section>

      {/* ── The one MOQ meter on the site, cart-wide ── */}
      <section
        className="mt-6 border-t border-home-rule pt-5"
        aria-label="Minimum order"
      >
        <BlockLabel left="Minimum order" right="mix any styles" />
        <SetBlocks size="md" className="mt-3" />
        {totals.totalSets > 0 && (
          <p className="mt-2 font-trade text-[10px] tracking-[0.12em] text-home-ink-mute">
            {totals.totalSets} set{totals.totalSets === 1 ? "" : "s"} in your
            order · each a full {SIZE_RATIO_LABEL} run
          </p>
        )}
      </section>

      <TermsRule className="mt-7" />

      <div className="mt-3 flex items-center gap-5">
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          className="group inline-flex min-h-11 items-center gap-2"
          aria-label={
            wishlisted ? "Remove from your line sheet" : "Save to your line sheet"
          }
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors duration-200",
              wishlisted
                ? "fill-home-ink text-home-ink"
                : "text-home-ink-mute group-hover:text-home-ink",
            )}
          />
          <span className="font-trade text-[10px] tracking-[0.14em] text-home-ink-mute transition-colors duration-200 group-hover:text-home-ink">
            {wishlisted ? "Saved" : "Save"}
          </span>
        </button>
        <span aria-hidden="true" className="h-3 w-px bg-home-rule" />
        <button
          type="button"
          onClick={onShare}
          className="group inline-flex min-h-11 items-center gap-2"
        >
          <Share2 className="h-4 w-4 text-home-ink-mute transition-colors duration-200 group-hover:text-home-ink" />
          <span className="font-trade text-[10px] tracking-[0.14em] text-home-ink-mute transition-colors duration-200 group-hover:text-home-ink">
            Share
          </span>
        </button>
        <span className="ml-auto font-trade text-[10px] tracking-[0.12em] text-home-ink-mute tabular-nums">
          {formatPrice(perPiece)}/pc · {formatPrice(setPrice)}/set
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THE TRADE FACTS — every value derived from the product or from config.
   Nothing about availability is stated here.
   ══════════════════════════════════════════════════════════════════════════ */

function SpecList({
  product,
  styleCode,
  perPiece,
  setPrice,
}: {
  product: MockProduct;
  styleCode: string;
  perPiece: number;
  setPrice: number;
}) {
  // `caps` is opt-in per row: the catalogue stores colourways lower-case
  // ("sage"), but the rest of these values are sentence copy and a blanket
  // `capitalize` turned them into "Set Of 4 Pieces".
  const facts: { label: string; value: string; caps?: boolean }[] = [
    { label: "Style code", value: styleCode },
    { label: "Category", value: product.category },
    {
      label: "Colourways",
      value: product.colors.length > 0 ? product.colors.join(", ") : "—",
      caps: true,
    },
    { label: "Size run", value: `${SIZE_RATIO_LABEL} — one of each` },
    { label: "Pack", value: `set of ${B2B_CONFIG.setSize} pieces` },
    {
      label: "Minimum order",
      value: `${B2B_CONFIG.minimumOrderSets} sets, mixed across styles`,
    },
    {
      label: "Rate",
      value: `${formatPrice(perPiece)}/pc · ${formatPrice(setPrice)}/set`,
    },
    {
      label: GST_CONFIG.label,
      value: `${GST_CONFIG.lowRate}–${GST_CONFIG.highRate}%, invoiced at dispatch`,
    },
  ];

  return (
    <dl className="mt-9 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex items-baseline justify-between gap-4 border-t border-home-rule py-3"
        >
          <dt className="shrink-0 font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
            {fact.label}
          </dt>
          <dd
            className={cn(
              "text-right text-[13px] font-semibold leading-snug text-home-ink",
              fact.caps && "capitalize",
            )}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LedgerRow({
  label,
  note,
  value,
  muted,
}: {
  label: string;
  note?: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-home-rule py-3.5">
      <div className="min-w-0">
        <p
          className={cn(
            "font-trade text-[10px] tracking-[0.14em]",
            muted ? "text-home-ink-mute" : "text-home-ink-soft",
          )}
        >
          {label}
        </p>
        {note && (
          <p className="mt-1 text-[11px] text-home-ink-mute">{note}</p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 text-[15px] font-semibold tabular-nums",
          muted ? "text-home-ink-soft" : "text-home-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THE RUN — the homepage's lineup device, reused: plates hung at three
   different heights, bottom-aligned so each one's rule falls at its own
   level, priced in small typeset labels. Deliberately not a card grid.
   ══════════════════════════════════════════════════════════════════════════ */

function SameRun({ products }: { products: MockProduct[] }) {
  const HEIGHTS = [
    "h-[290px] lg:h-[400px]",
    "h-[330px] lg:h-[460px]",
    "h-[270px] lg:h-[370px]",
  ];

  return (
    <>
      <p className="mt-5 font-trade text-[10px] tracking-[0.18em] text-home-ink-mute sm:hidden">
        {products.length} styles · swipe →
      </p>
      <div className="-mx-5 mt-8 flex snap-x items-end gap-6 overflow-x-auto px-5 pb-2 hide-scrollbar md:-mx-10 md:px-10 lg:-mx-16 lg:mt-14 lg:gap-10 lg:px-16">
        {products.map((rp, i) => {
          const rpSetPrice = rp.salePrice ?? rp.price;
          return (
            <Link
              key={rp.id}
              href={`/shop/${rp.handle}`}
              className="group flex w-[220px] shrink-0 snap-start flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-home-ink lg:w-[280px]"
            >
              <div className={cn("relative w-full", HEIGHTS[i % HEIGHTS.length])}>
                <Image
                  src={rp.image}
                  alt={rp.title}
                  fill
                  sizes="(max-width: 1024px) 220px, 280px"
                  className="object-cover object-top"
                />
              </div>
              {/* The ground rule each figure stands on. */}
              <div className="w-full border-t border-home-ink/35" />
              <div className="pt-3.5">
                <p className="font-trade text-[10px] tracking-[0.06em] text-home-ink-mute">
                  {getStyleCode(rp)}
                </p>
                <p className="mt-1.5 line-clamp-2 min-h-[2.5em] font-editorial text-[17px] italic leading-tight group-hover:underline lg:text-[19px]">
                  {rp.title}
                </p>
                <PriceBlock
                  className="mt-3"
                  setPrice={rpSetPrice}
                  perPiece={getPerPiecePrice(rpSetPrice)}
                  scale="card"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
