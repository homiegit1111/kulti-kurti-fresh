"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CreditCard, MessageCircle, Minus, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";
import { formatPrice, COLOR_MAP } from "@/lib/commerce/catalog";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import {
  calculateLineTotal,
  calculateWholesaleTotals,
  getPerPiecePrice,
} from "@/lib/b2b/pricing";
import { validateCartMOQ } from "@/lib/b2b/validation";
import { buildWholesaleWhatsAppUrl } from "@/lib/b2b/whatsapp";
import { getStyleCode } from "@/lib/b2b/style-code";
import { MoqProgress } from "@/components/b2b/moq-progress";
import { ResellerMarginEstimator } from "@/components/b2b/reseller-margin-estimator";
import {
  trackBeginWhatsappOrder,
  trackMoqBlockedCheckout,
} from "@/lib/analytics";

export default function CartPage() {
  const { items, itemCount, removeItem, updateQuantity, clearCart } = useCart();
  const totals = calculateWholesaleTotals(items);
  const moq = validateCartMOQ(items);
  const moqProgress = Math.min(
    100,
    Math.round((totals.totalSets / B2B_CONFIG.minimumOrderSets) * 100),
  );

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
    window.location.href = buildWholesaleWhatsAppUrl(items);
  };

  return (
    <div className="bg-warm-white min-h-screen text-charcoal flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 lg:pt-36 pb-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 md:mb-16 flex flex-wrap items-end justify-between gap-6 border-b border-charcoal/10 pb-8"
          >
            <div>
              <p className="eyebrow mb-3">Wholesale Order Builder</p>
              <h1 className="font-serif text-5xl md:text-6xl text-charcoal font-light tracking-tight">
                Buyer <span className="italic">Cart</span>
              </h1>
            </div>
            {items.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/40">
                {itemCount} sets / {totals.totalPieces} pcs
              </p>
            )}
          </motion.div>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mx-auto flex max-w-xl flex-col items-center justify-center border border-charcoal/10 bg-white px-6 py-16 text-center"
            >
              <p className="eyebrow eyebrow--bare mb-3">Wholesale cart</p>
              <h2 className="font-serif text-3xl md:text-4xl text-charcoal font-light mb-4">
                Start with {B2B_CONFIG.minimumOrderSets} wholesale sets.
              </h2>
              <p className="text-sm text-charcoal/50 max-w-sm leading-relaxed mb-10">
                Build a reseller-ready order in size-ratio packs. 1 set has{" "}
                {B2B_CONFIG.setSize} pcs in {SIZE_RATIO_LABEL}.
              </p>
              <Link href="/shop" className="btn-luxe group">
                <span>Explore Wholesale Catalog</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.4 }}
                      className="group flex gap-6 md:gap-8 py-8 border-b border-charcoal/10 relative"
                    >
                      <Link
                        href={`/shop/${item.handle}`}
                        className="relative w-28 md:w-36 aspect-[3/4] shrink-0 bg-warm-gray overflow-hidden"
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                          sizes="150px"
                        />
                      </Link>

                      <div className="flex flex-col flex-1 justify-between py-1">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-gold-dark">
                              {getStyleCode(item)}
                            </p>
                            <Link href={`/shop/${item.handle}`}>
                              <h3 className="text-xl md:text-2xl font-serif font-light text-charcoal line-clamp-2 leading-tight">
                                <span className="link-luxe">{item.title}</span>
                              </h3>
                            </Link>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                              <p className="text-[10px] font-bold text-charcoal/45 uppercase tracking-[0.2em]">
                                Ratio{" "}
                                <span className="text-charcoal">
                                  {SIZE_RATIO_LABEL}
                                </span>
                              </p>

                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-charcoal/15"
                                  style={{
                                    backgroundColor:
                                      COLOR_MAP[item.color] ?? "#ccc",
                                  }}
                                />
                                <span className="text-[10px] font-bold text-charcoal/45 uppercase tracking-[0.2em]">
                                  {item.color} style
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-charcoal/30 hover:text-charcoal transition-colors p-2 -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                            title="Remove style"
                            aria-label={`Remove ${item.title} from cart`}
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>

                        <div className="flex items-end justify-between mt-6">
                          <div>
                            <div className="flex items-center border border-charcoal/15">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                aria-label="Decrease sets"
                                className="w-9 h-9 flex items-center justify-center text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                              >
                                <Minus className="h-3 w-3" strokeWidth={1.5} />
                              </button>
                              <span className="w-10 text-center text-xs font-semibold tabular-nums border-x border-charcoal/15 leading-9">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                aria-label="Increase sets"
                                className="w-9 h-9 flex items-center justify-center text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                              >
                                <Plus className="h-3 w-3" strokeWidth={1.5} />
                              </button>
                            </div>
                            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-charcoal/40">
                              Sets / {item.quantity * B2B_CONFIG.setSize} pcs
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-charcoal/40 font-semibold tracking-[0.15em] uppercase mb-1">
                              {formatPrice(item.salePrice ?? item.price)}/set -{" "}
                              {formatPrice(
                                getPerPiecePrice(item.salePrice ?? item.price),
                              )}
                              /pc
                            </p>
                            <p className="text-xl font-serif text-charcoal">
                              {formatPrice(calculateLineTotal(item, itemCount))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="flex items-center justify-between mt-10">
                  <Link
                    href="/shop"
                    className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform duration-300" />
                    <span className="link-luxe">Add More Styles</span>
                  </Link>
                  <button
                    onClick={clearCart}
                    className="text-[10px] font-bold text-charcoal/35 hover:text-charcoal uppercase tracking-[0.2em] transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 xl:col-span-4 relative mt-8 lg:mt-0">
                <div className="sticky top-32 z-20">
                  <div className="bg-charcoal text-warm-white relative px-8 py-10 md:px-10 md:py-12 frame-luxe">
                    <div className="relative z-10">
                      <p className="eyebrow eyebrow--bare mb-2">Wholesale</p>
                      <h3 className="font-serif text-3xl font-light mb-10">
                        Order <span className="italic">Summary</span>
                      </h3>

                      <div className="space-y-5 mb-8">
                        <SummaryRow
                          label="Sets / Pieces"
                          value={`${totals.totalSets} / ${totals.totalPieces}`}
                        />
                        <SummaryRow
                          label="Tier"
                          value={totals.appliedTier?.label || "MOQ pending"}
                        />
                        <SummaryRow
                          label="Savings"
                          value={`${totals.discountPercent}% / ${formatPrice(totals.discountAmount)}`}
                        />
                      </div>

                      <div className="mb-8">
                        <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">
                          <span>MOQ {B2B_CONFIG.minimumOrderSets} sets</span>
                          <span>{moqProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/15">
                          <div
                            className="h-full bg-gold transition-all"
                            style={{ width: `${moqProgress}%` }}
                          />
                        </div>
                        <div className="mt-3">
                          <MoqProgress totals={totals} tone="dark" />
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-10 pt-6 border-t border-gold/40">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 pb-1">
                          Total
                        </span>
                        <span className="font-serif text-4xl font-light">
                          {formatPrice(totals.subtotal)}
                        </span>
                      </div>

                      <button
                        onClick={beginWhatsappOrder}
                        className="group w-full min-h-14 px-4 py-4 flex items-center justify-center gap-3 bg-warm-white text-charcoal text-[10px] font-bold uppercase tracking-[0.22em] hover:bg-gold hover:text-charcoal transition-colors duration-400 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                      >
                        <span>{moq.ok ? "Send WhatsApp Order" : "MOQ Pending"}</span>
                        <MessageCircle className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                      </button>

                      <p className="text-center text-[9px] text-white/40 uppercase tracking-[0.2em] leading-relaxed">
                        Razorpay payment link after availability confirmation
                      </p>

                      <div className="mt-4 grid gap-3">
                        {moq.ok ? (
                          <Link
                            href="/checkout"
                            className="flex min-h-12 items-center justify-center gap-3 border border-white/25 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-charcoal"
                          >
                            Razorpay Checkout <CreditCard className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="flex min-h-12 items-center justify-center gap-3 border border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
                          >
                            Razorpay unlocks at MOQ
                          </button>
                        )}
                        <Link
                          href="/bulk-order"
                          className="flex min-h-12 items-center justify-center gap-3 border border-white/15 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 transition-colors hover:bg-white/10"
                        >
                          Open Bulk Linesheet <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-charcoal/10 border-x border-b border-charcoal/10 bg-white text-center">
                    {[
                      ["MOQ", "4 Sets"],
                      ["GST", "Invoice"],
                      ["Dispatch", "All India"],
                    ].map(([key, value]) => (
                      <div key={key} className="py-4 px-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-charcoal">
                          {key}
                        </p>
                        <p className="text-[9px] uppercase tracking-[0.14em] text-charcoal/45 mt-1">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <ResellerMarginEstimator
                      wholesalePerPiece={getPerPiecePrice(
                        items[0]?.salePrice ?? items[0]?.price ?? 0,
                      )}
                    />
                  </div>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline border-b border-white/10 pb-4 gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
        {label}
      </span>
      <span className="font-serif text-lg text-right">{value}</span>
    </div>
  );
}
