"use client";

/**
 * §7.1 — the bulk desk is the PO room. The table's steppers edit the live
 * cart directly (cart-context contract §1.1.5 — addItem/updateQuantity only),
 * so the purchase order in the right rail writes itself as steppers move.
 * The same set counts are mirrored into the tray so every gauge on the site
 * (SetBlocks, nav mini-gauge, running footer) reads one order.
 *
 * No entrance animation anywhere (§1.6). The only motion: committed-row wash,
 * AnimatedRupees line-total ticks, the PO pane's re-ink, the chop.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle, Minus, Plus, Search } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { EntryClose, EntryHead } from "@/components/document/entry";
import { TermsRule } from "@/components/document/terms-rule";
import { POPane } from "@/components/document/po-pane";
import { SetBlocks } from "@/components/b2b/set-blocks";
import {
  formatPrice,
  getProducts,
  type MockProduct,
} from "@/lib/commerce/catalog";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useTray } from "@/lib/line/tray-context";
import { TRAY_CART_SIZE, useTrayHandoff } from "@/lib/line/tray-handoff";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import {
  calculateGstBreakdown,
  calculateLineTotal,
  calculateWholesaleTotals,
  getPerPiecePrice,
} from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { trackBulkOrderAdd } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useWholesaleBuyer } from "./use-wholesale-buyer";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Totals tick instead of jumping (§1.6); reduced motion snaps. */
function AnimatedRupees({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
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

export default function BulkOrderClient() {
  const [products, setProducts] = useState<MockProduct[] | null>(null);
  const [query, setQuery] = useState("");
  const { items, addItem, updateQuantity, removeItem, hydrated: cartHydrated } =
    useCart();
  const tray = useTray();
  const buyer = useWholesaleBuyer();
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  useEffect(() => {
    // Empty-not-mock contract (§1.1.7): no MOCK_PRODUCTS seed, no mock flash.
    getProducts(40).then((data) => setProducts(data));
  }, []);

  /**
   * Open the desk with the order the buyer built while browsing: reconcile the
   * tray into the cart once, after BOTH stores hydrate (the cart's hydrate
   * effect replaces `items`, so an earlier write would be clobbered; the tray's
   * `committed` is empty until its own read). The handoff is raise-only and
   * idempotent, so it never fights a reduction the buyer makes here afterwards
   * — which is also why it must run once, not on every items change.
   */
  const loadTrayOrder = useTrayHandoff();
  const loadedTrayOrder = useRef(false);
  useEffect(() => {
    if (!cartHydrated || !tray.hydrated || loadedTrayOrder.current) return;
    loadedTrayOrder.current = true;
    loadTrayOrder();
  }, [cartHydrated, tray.hydrated, loadTrayOrder]);

  const visibleProducts = useMemo(() => {
    const catalog = products ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return catalog;

    return catalog.filter((product) => {
      const haystack = [
        product.title,
        product.category,
        getStyleCode(product),
        ...product.colors,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [products, query]);

  /** All cart lines for a style at the wholesale size key. */
  const cartLinesFor = (productId: string): CartItem[] =>
    items.filter(
      (item) => item.productId === productId && item.size === TRAY_CART_SIZE,
    );

  const setsFor = (productId: string): number =>
    cartLinesFor(productId).reduce((sum, item) => sum + item.quantity, 0);

  /**
   * Set a style's total sets in the live cart, and mirror the count into the
   * tray so SetBlocks and the running chrome agree with the PO.
   */
  const setRowSets = (product: MockProduct, next: number) => {
    const target = Math.max(0, Math.floor(next) || 0);
    const lines = cartLinesFor(product.id);
    const current = lines.reduce((sum, item) => sum + item.quantity, 0);
    if (target === current) return;

    if (lines.length === 0) {
      if (target > 0) {
        addItem(product, TRAY_CART_SIZE, product.colors[0], target);
      }
    } else if (target > current) {
      // Top up the largest existing line (tray-handoff rule 4).
      const largest = [...lines].sort((a, b) => b.quantity - a.quantity)[0];
      updateQuantity(largest.id, largest.quantity + (target - current));
    } else {
      // Reduce from the last lines backwards, preserving earlier colourways.
      let toRemove = current - target;
      for (let index = lines.length - 1; index >= 0 && toRemove > 0; index--) {
        const line = lines[index];
        const cut = Math.min(line.quantity, toRemove);
        if (cut >= line.quantity) removeItem(line.id);
        else updateQuantity(line.id, line.quantity - cut);
        toRemove -= cut;
      }
    }

    // Tray mirror — one order across every surface.
    if (target > 0) tray.commit(product, target);
    else tray.setSets(product.id, 0);

    if (current === 0 && target > 0) {
      trackBulkOrderAdd({
        styles: 1,
        total_sets: target,
        total_pieces: target * B2B_CONFIG.setSize,
      });
    }
  };

  const totals = calculateWholesaleTotals(items);
  const gst = calculateGstBreakdown(items, totals.totalSets);
  const blendedPerPiece =
    totals.totalPieces > 0
      ? Math.round(totals.subtotal / totals.totalPieces)
      : null;

  const onRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    index: number,
    product: MockProduct,
    sets: number,
  ) => {
    const target = event.target as HTMLElement;
    const typingInField =
      target.tagName === "INPUT" || target.tagName === "TEXTAREA";

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = index + (event.key === "ArrowDown" ? 1 : -1);
      rowRefs.current[nextIndex]?.focus();
      return;
    }
    if (typingInField) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      setRowSets(product, Number(event.key));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      setRowSets(product, sets + 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />
      <main className="flex-1 pb-24 pt-24 lg:pt-28">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-10 lg:px-16">
          <div className="relative lg:pl-[72px]">
            {/* R2 — the folio rail rule. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-[72px] hidden w-px bg-line/25 lg:block"
            />

            {/* Letterhead */}
            <header className="border-b-2 border-line pb-6">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
                Bulk orders
              </p>
              <h1 className="mt-4 text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                Bulk kurti orders at wholesale rates
              </h1>
            </header>
            <TermsRule className="mt-4" />

            {/* Desk instruments — search + live order facts (R0 instrument). */}
            <section className="ledger sticky top-16 z-30 border-b border-line/25 bg-surface py-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <label className="relative block max-w-md flex-1">
                  <span className="sr-only">Search styles</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content/35" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search style, code, color"
                    className="h-10 w-full border border-line/25 bg-surface pl-9 pr-3 text-sm text-content outline-none transition-colors placeholder:text-content/40 focus:border-content"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-content/60">
                  <span>
                    {totals.totalSets} sets · {totals.totalPieces} pcs
                  </span>
                  <span className="text-content">
                    Order {formatPrice(totals.subtotal)}
                  </span>
                  <span>GST est. {formatPrice(gst.gstAmount)}</span>
                  <span>
                    {blendedPerPiece !== null
                      ? `Blended ${formatPrice(blendedPerPiece)}/pc`
                      : "Blended —/pc"}
                  </span>
                  <SetBlocks size="md" />
                </div>
              </div>
            </section>

            {/* Entry A — the line. */}
            <EntryHead
              letter="A"
              name="Styles"
              count={products === null ? undefined : products.length}
              countLabel="styles"
              action={
                <a
                  href={buildCatalogRequestUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                >
                  WhatsApp catalog
                </a>
              }
              className="mt-16 lg:mt-20"
            />

            <div className="mt-6 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                {products === null ? (
                  /* Loading register (§4): ghost ledger + scan line. */
                  <div className="relative overflow-hidden" aria-hidden="true">
                    <div
                      className="ledger-scan pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-content/5 to-transparent"
                    />
                    {Array.from({ length: 8 }, (_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 border-b border-line/15 py-3"
                      >
                        <div className="h-16 w-12 bg-surface-hover" />
                        <div className="h-3 w-48 bg-surface-hover" />
                        <div className="ml-auto h-3 w-24 bg-surface-hover" />
                      </div>
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="border border-line/25 px-6 py-16 text-center">
                    <p className="text-sm leading-6 text-content/60">
                      Styles updating — WhatsApp for today&apos;s price list.
                    </p>
                    <a
                      href={buildCatalogRequestUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-luxe mt-6 inline-flex"
                    >
                      WhatsApp catalog <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ledger w-full min-w-[720px] border-collapse">
                      <thead>
                        <tr className="border-b-2 border-line text-left text-[9px] uppercase tracking-[0.22em] text-content/60">
                          <th className="py-3 pr-4 font-extrabold">Style</th>
                          <th className="py-3 pr-4 font-extrabold">Code</th>
                          <th className="py-3 pr-4 font-extrabold">Pack</th>
                          <th className="py-3 pr-4 font-extrabold">Rate</th>
                          <th className="py-3 pr-4 font-extrabold">Sets</th>
                          <th className="py-3 text-right font-extrabold">Line</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleProducts.map((product, index) => {
                          const sets = setsFor(product.id);
                          const setPrice = product.salePrice ?? product.price;
                          const committed = sets > 0;
                          return (
                            <tr
                              key={product.id}
                              ref={(node) => {
                                rowRefs.current[index] = node;
                              }}
                              tabIndex={0}
                              onKeyDown={(event) =>
                                onRowKeyDown(event, index, product, sets)
                              }
                              className={cn(
                                "group border-b border-l-2 border-line/15 outline-none",
                                "motion-safe:transition-colors motion-safe:duration-200",
                                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-lime",
                                committed
                                  ? "border-l-accent-lime bg-accent-lime/8"
                                  : "border-l-transparent hover:bg-surface-hover/40",
                              )}
                            >
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-4">
                                  <div className="relative h-16 w-12 shrink-0 bg-surface-hover">
                                    <Image
                                      src={product.image}
                                      alt={product.title}
                                      fill
                                      className="object-cover"
                                      sizes="48px"
                                    />
                                  </div>
                                  <div>
                                    <Link
                                      href={`/shop/${product.handle}`}
                                      tabIndex={-1}
                                      className="text-sm font-bold text-content underline-offset-2 hover:underline"
                                    >
                                      {product.title}
                                    </Link>
                                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-content/40">
                                      {product.category}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-4 font-mono text-[11px] text-content/55">
                                {getStyleCode(product)}
                              </td>
                              <td className="py-3 pr-4 text-xs text-content/60">
                                {SIZE_RATIO_LABEL}
                              </td>
                              <td className="py-3 pr-4">
                                <p className="text-sm font-bold">
                                  {formatPrice(setPrice)}/set
                                </p>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content/40">
                                  {formatPrice(getPerPiecePrice(setPrice))}/pc
                                </p>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex w-28 items-center border border-line/25 bg-surface">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRowSets(product, Math.max(0, sets - 1))
                                    }
                                    className="flex h-10 w-9 items-center justify-center text-content/45 transition-colors hover:bg-surface-inverse hover:text-content-inverse"
                                    aria-label={`Decrease sets for ${product.title}`}
                                  >
                                    <Minus className="h-3 w-3" strokeWidth={1.6} />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={sets || ""}
                                    onChange={(event) =>
                                      setRowSets(
                                        product,
                                        Number.parseInt(
                                          event.target.value || "0",
                                          10,
                                        ) || 0,
                                      )
                                    }
                                    className="h-10 w-10 border-x border-line/25 bg-transparent text-center text-sm font-bold outline-none"
                                    aria-label={`Sets for ${product.title}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setRowSets(product, sets + 1)}
                                    className="flex h-10 w-9 items-center justify-center text-content/45 transition-colors hover:bg-surface-inverse hover:text-content-inverse"
                                    aria-label={`Increase sets for ${product.title}`}
                                  >
                                    <Plus className="h-3 w-3" strokeWidth={1.6} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 text-right text-base font-bold tracking-[-0.01em]">
                                {sets > 0 ? (
                                  <AnimatedRupees
                                    value={calculateLineTotal(
                                      {
                                        price: product.price,
                                        salePrice: product.salePrice,
                                        quantity: sets,
                                      },
                                      totals.totalSets,
                                    )}
                                  />
                                ) : (
                                  <span aria-hidden="true" className="text-content/25">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {visibleProducts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center">
                              <p className="text-sm leading-6 text-content/60">
                                No styles match this search. Try a style code,
                                color, or category.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* The purchase order — writes itself as steppers move. */}
              <aside className="lg:col-span-4">
                <POPane items={items} buyer={buyer} sticky />
              </aside>
            </div>

            <EntryClose className="mt-12" />

            {/* Order path — one line of fact, two exits. */}
            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="max-w-xl text-sm leading-6 text-content/60">
                WhatsApp confirms stock fastest. GST invoice at dispatch.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/cart" className="btn-luxe-outline">
                  Review the order <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/checkout" className="btn-luxe-outline">
                  Checkout <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
