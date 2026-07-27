"use client";

/**
 * §7.1 — the wholesale cart as a ruled order document. No entrance animation
 * (§1.6), no ghost letters, no percent meter: SetBlocks is the site's one MOQ
 * gauge and the PO pane renders the exact WhatsApp order (secondary mount).
 */

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  MessageCircle,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TermsRule } from "@/components/document/terms-rule";
import { POPane } from "@/components/document/po-pane";
import { SetBlocks } from "@/components/b2b/set-blocks";
import { useCart } from "@/lib/cart-context";
import { useTray } from "@/lib/line/tray-context";
import { useTrayHandoff } from "@/lib/line/tray-handoff";
import { formatPrice, COLOR_MAP } from "@/lib/commerce/catalog";
import { B2B_CONFIG, GST_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import {
  calculateLineTotal,
  calculateWholesaleTotals,
  calculateGstBreakdown,
  getPerPiecePrice,
} from "@/lib/b2b/pricing";
import { validateCartMOQ } from "@/lib/b2b/validation";
import { buildWholesaleWhatsAppUrl } from "@/lib/b2b/whatsapp";
import { getStyleCode } from "@/lib/b2b/style-code";
import {
  trackBeginWhatsappOrder,
  trackMoqBlockedCheckout,
} from "@/lib/analytics";
import { useWholesaleBuyer } from "../bulk-order/use-wholesale-buyer";

export default function CartPage() {
  const {
    items,
    itemCount,
    removeItem,
    updateQuantity,
    clearCart,
    hydrated: cartHydrated,
  } = useCart();
  const buyer = useWholesaleBuyer();

  /**
   * The cart page must show the order the buyer built while browsing (the
   * tray), not a mysteriously empty sheet. Reconcile tray → cart once, after
   * both stores hydrate; the handoff is raise-only and idempotent, and running
   * it once (not per items change) keeps it from fighting reductions made here.
   */
  const { hydrated: trayHydrated } = useTray();
  const loadTrayOrder = useTrayHandoff();
  const loadedTrayOrder = useRef(false);
  useEffect(() => {
    if (!cartHydrated || !trayHydrated || loadedTrayOrder.current) return;
    loadedTrayOrder.current = true;
    loadTrayOrder();
  }, [cartHydrated, trayHydrated, loadTrayOrder]);
  const totals = calculateWholesaleTotals(items);
  const gst = calculateGstBreakdown(items, totals.totalSets);
  const moq = validateCartMOQ(items);

  const beginWhatsappOrder = () => {
    if (!moq.ok) {
      trackMoqBlockedCheckout({
        total_sets: moq.totalSets,
        remaining_sets: moq.remainingSets,
      });
      return;
    }

    trackBeginWhatsappOrder({
      total_sets: totals.totalSets,
      total_pieces: totals.totalPieces,
      value: totals.subtotal,
      discount_percent: totals.discountPercent,
    });
    window.location.assign(buildWholesaleWhatsAppUrl(items, buyer));
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />

      <main className="relative z-10 flex-1 pb-24 pt-24 lg:pt-28">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-10 lg:px-16">
          <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-line pb-6">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
                Wholesale cart
              </p>
              <h1 className="mt-4 text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                Your wholesale order
              </h1>
            </div>
            {items.length > 0 && (
              <p className="ledger pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
                {itemCount} sets · {totals.totalPieces} pcs
              </p>
            )}
          </header>

          {items.length === 0 ? (
            <div className="mx-auto mt-12 max-w-2xl border border-line/25 px-6 py-16 text-center">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
                Wholesale cart
              </p>
              <h2 className="mx-auto mt-4 max-w-[18ch] text-3xl font-black uppercase leading-[0.95] tracking-[-0.03em]">
                Start with {B2B_CONFIG.minimumOrderSets} wholesale sets.
              </h2>
              <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-content/60">
                1 set has {B2B_CONFIG.setSize} pcs in {SIZE_RATIO_LABEL}. Mix
                any styles to reach {B2B_CONFIG.minimumOrderSets} sets.
              </p>
              <Link href="/shop" className="btn-luxe group mt-8 inline-flex">
                <span>Browse styles</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="flex flex-col lg:col-span-7 xl:col-span-8">
                {items.map((item) => {
                  const dotColor = COLOR_MAP[item.color];
                  return (
                    <div
                      key={item.id}
                      className="relative flex gap-5 border-b border-line/20 py-7 md:gap-8"
                    >
                      <Link
                        href={`/shop/${item.handle}`}
                        className="relative aspect-square w-24 shrink-0 overflow-hidden bg-surface-hover md:w-32"
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="130px"
                        />
                      </Link>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-content/55">
                              {getStyleCode(item)}
                            </p>
                            <Link href={`/shop/${item.handle}`}>
                              <h3 className="line-clamp-2 text-xl font-black uppercase leading-[0.95] tracking-[-0.03em] underline-offset-2 hover:underline md:text-2xl">
                                {item.title}
                              </h3>
                            </Link>

                            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">
                                Ratio{" "}
                                <span className="text-content">
                                  {SIZE_RATIO_LABEL}
                                </span>
                              </p>

                              <div className="flex items-center gap-2">
                                {dotColor && (
                                  <span
                                    className="h-2.5 w-2.5 border border-line/20"
                                    style={{ backgroundColor: dotColor }}
                                  />
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">
                                  {item.color} style
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="-mr-2 p-2 text-content/30 transition-colors hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
                            title="Remove style"
                            aria-label={`Remove ${item.title} from cart`}
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>

                        <div className="mt-6 flex items-end justify-between">
                          <div>
                            <div className="flex items-center border border-line/25">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                aria-label="Decrease sets"
                                className="flex h-9 w-9 items-center justify-center text-content/70 transition-colors hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
                              >
                                <Minus className="h-3 w-3" strokeWidth={1.5} />
                              </button>
                              <span className="ledger w-10 border-x border-line/25 text-center text-xs font-bold leading-9">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                aria-label="Increase sets"
                                className="flex h-9 w-9 items-center justify-center text-content/70 transition-colors hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
                              >
                                <Plus className="h-3 w-3" strokeWidth={1.5} />
                              </button>
                            </div>
                            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-content/40">
                              Sets · {item.quantity * B2B_CONFIG.setSize} pcs
                            </p>
                          </div>

                          <div className="ledger text-right">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-content/45">
                              {formatPrice(item.salePrice ?? item.price)}/set ·{" "}
                              {formatPrice(
                                getPerPiecePrice(item.salePrice ?? item.price),
                              )}
                              /pc
                            </p>
                            <p className="text-xl font-black tracking-[-0.02em]">
                              {formatPrice(calculateLineTotal(item, itemCount))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-10 flex items-center justify-between">
                  <Link
                    href="/shop"
                    className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content/60 transition-colors hover:text-content"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span className="link-luxe">Add more styles</span>
                  </Link>
                  <button
                    onClick={clearCart}
                    className="border border-line/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-red/70 transition-colors hover:border-accent-red hover:text-accent-red focus-visible:border-accent-red focus-visible:outline-none"
                  >
                    Clear cart
                  </button>
                </div>
              </div>

              <div className="relative mt-8 lg:col-span-5 lg:mt-0 xl:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <div className="border border-line/25 bg-surface px-6 py-8 md:px-7">
                    <div className="mb-6 flex items-baseline justify-between gap-4 border-b-2 border-line pb-4">
                      <h2 className="text-[10px] font-extrabold uppercase tracking-[0.22em]">
                        Order summary
                      </h2>
                      <span className="ledger text-[10px] font-extrabold uppercase tracking-[0.2em] text-content/55">
                        {totals.totalSets} sets · {totals.totalPieces} pcs
                      </span>
                    </div>

                    <div className="mb-6">
                      <SetBlocks size="md" />
                    </div>

                    {/* Money ladder: subtotal → GST → est. invoice total. */}
                    <div className="ledger mb-6 space-y-3.5 border-t border-line/25 pt-5">
                      <LadderRow
                        label="Subtotal"
                        value={formatPrice(totals.subtotal)}
                      />
                      <LadderRow
                        label={`GST ${gst.gstRateLabel}${gst.isMixed ? " (mixed)" : ""}`}
                        value={formatPrice(gst.gstAmount)}
                      />
                    </div>

                    {/* Labeled as an estimate: the online charge is the ex-GST
                        subtotal (see checkout); GST lands on the dispatch
                        invoice per GST_CONFIG.note below. */}
                    <div className="ledger mb-6 flex items-end justify-between border-t-2 border-line pt-4">
                      <span className="pb-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/70">
                        Est. invoice total
                      </span>
                      <span className="text-3xl font-black tracking-[-0.03em]">
                        {formatPrice(gst.grandTotal)}
                      </span>
                    </div>

                    <button
                      onClick={beginWhatsappOrder}
                      disabled={!moq.ok}
                      className="group mb-4 flex min-h-14 w-full items-center justify-center gap-3 bg-accent-lime px-4 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-on-accent transition-colors duration-300 hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime/70 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-content/55"
                    >
                      <span>
                        {moq.ok
                          ? "Send order on WhatsApp"
                          : `${moq.remainingSets} more ${
                              moq.remainingSets === 1 ? "set" : "sets"
                            } to minimum`}
                      </span>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>

                    <p className="text-center text-[9px] uppercase leading-relaxed tracking-[0.16em] text-content/45">
                      {GST_CONFIG.note}
                    </p>

                    <div className="mt-4 grid gap-3">
                      {moq.ok && (
                        <Link
                          href="/checkout"
                          className="flex min-h-12 items-center justify-center gap-3 border border-line/25 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-content transition-colors hover:bg-surface-inverse hover:text-content-inverse"
                        >
                          Razorpay checkout <CreditCard className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <Link
                        href="/bulk-order"
                        className="flex min-h-12 items-center justify-center gap-3 border border-line/25 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-content/70 transition-colors hover:text-content"
                      >
                        Open the bulk desk <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <TermsRule className="mt-4 border-x border-b" />

                  {/* The PO, verbatim — secondary mount (§7.1). */}
                  <POPane items={items} buyer={buyer} className="mt-8" />
                  <div className="mt-8 lg:hidden" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LadderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/55">
        {label}
      </span>
      <span className="text-right text-base font-bold tracking-[-0.01em] text-content">
        {value}
      </span>
    </div>
  );
}
