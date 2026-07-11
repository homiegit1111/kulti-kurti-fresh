"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CreditCard, MessageCircle, Minus, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";
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
import { MoqProgress } from "@/components/b2b/moq-progress";
import {
  trackBeginWhatsappOrder,
  trackMoqBlockedCheckout,
} from "@/lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CartPage() {
  const { items, itemCount, removeItem, updateQuantity, clearCart } = useCart();
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
    window.location.href = buildWholesaleWhatsAppUrl(items);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#ece9df] font-sans text-[#171814]">
      <Navbar />

      <main className="relative z-10 flex-1 px-4 pb-24 pt-28 sm:px-6 lg:px-10 lg:pt-36">
        <div className="mx-auto max-w-[1600px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
            className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b-2 border-[#171814] pb-6 md:mb-16"
          >
            <div>
              <p className="eyebrow text-[#cc2f4a]">Wholesale order builder</p>
              <h1 className="mt-4 text-6xl font-black uppercase leading-[0.82] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
                Your order
              </h1>
            </div>
            {items.length > 0 && (
              <p className="pb-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#171814]/45">
                {itemCount} sets / {totals.totalPieces} pcs
              </p>
            )}
          </motion.div>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative mx-auto flex max-w-2xl flex-col items-center justify-center overflow-hidden border border-[#171814]/20 bg-[#f2efe6] px-6 py-20 text-center"
            >
              <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[30vw] font-black uppercase leading-none tracking-[-0.08em] text-[#171814]/[0.04] sm:text-[16rem]">
                Cart
              </p>
              <p className="eyebrow eyebrow--bare relative text-[#cc2f4a]">
                Wholesale cart
              </p>
              <h2 className="relative mt-4 max-w-[14ch] text-4xl font-black uppercase leading-[0.85] tracking-[-0.05em] sm:text-5xl">
                Start with {B2B_CONFIG.minimumOrderSets} wholesale sets.
              </h2>
              <p className="relative mt-5 max-w-sm text-sm leading-6 text-[#171814]/60">
                Build a reseller-ready order in size-ratio packs. 1 set has{" "}
                {B2B_CONFIG.setSize} pcs in {SIZE_RATIO_LABEL}.
              </p>
              <Link href="/shop" className="btn-luxe group relative mt-10">
                <span>Explore wholesale catalog</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="flex flex-col lg:col-span-7 xl:col-span-8">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="group relative flex gap-5 border-b border-[#171814]/20 py-7 md:gap-8"
                    >
                      <Link
                        href={`/shop/${item.handle}`}
                        className="relative aspect-square w-24 shrink-0 overflow-hidden bg-[#d8d4c8] md:w-32"
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                          sizes="130px"
                        />
                      </Link>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#cc2f4a]">
                              {getStyleCode(item)}
                            </p>
                            <Link href={`/shop/${item.handle}`}>
                              <h3 className="text-xl font-black uppercase leading-[0.95] tracking-[-0.03em] line-clamp-2 md:text-2xl">
                                {item.title}
                              </h3>
                            </Link>

                            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#171814]/45">
                                Ratio{" "}
                                <span className="text-[#171814]">
                                  {SIZE_RATIO_LABEL}
                                </span>
                              </p>

                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-[#171814]/20"
                                  style={{
                                    backgroundColor:
                                      COLOR_MAP[item.color] ?? "#ccc",
                                  }}
                                />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#171814]/45">
                                  {item.color} style
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="-mr-2 p-2 text-[#171814]/30 transition-colors hover:text-[#cc2f4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff4f]"
                            title="Remove style"
                            aria-label={`Remove ${item.title} from cart`}
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>

                        <div className="mt-6 flex items-end justify-between">
                          <div>
                            <div className="flex items-center border border-[#171814]/25">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                aria-label="Decrease sets"
                                className="flex h-9 w-9 items-center justify-center text-[#171814]/50 transition-colors hover:bg-[#171814] hover:text-[#f1eee5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff4f]"
                              >
                                <Minus className="h-3 w-3" strokeWidth={1.5} />
                              </button>
                              <span className="w-10 border-x border-[#171814]/25 text-center text-xs font-bold leading-9 tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                aria-label="Increase sets"
                                className="flex h-9 w-9 items-center justify-center text-[#171814]/50 transition-colors hover:bg-[#171814] hover:text-[#f1eee5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff4f]"
                              >
                                <Plus className="h-3 w-3" strokeWidth={1.5} />
                              </button>
                            </div>
                            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#171814]/40">
                              Sets / {item.quantity * B2B_CONFIG.setSize} pcs
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#171814]/45">
                              {formatPrice(item.salePrice ?? item.price)}/set -{" "}
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
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="mt-10 flex items-center justify-between">
                  <Link
                    href="/shop"
                    className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#171814]/60 transition-colors hover:text-[#171814]"
                  >
                    <ArrowLeft className="h-3 w-3 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="link-luxe">Add more styles</span>
                  </Link>
                  <button
                    onClick={clearCart}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#171814]/35 transition-colors hover:text-[#cc2f4a]"
                  >
                    Clear cart
                  </button>
                </div>
              </div>

              <div className="relative mt-8 lg:col-span-5 lg:mt-0 xl:col-span-4">
                <div className="sticky top-32 z-20">
                  <div className="relative bg-[#121310] px-7 py-9 text-[#f1eee5] md:px-8 md:py-10">
                    <div className="relative z-10">
                      <div className="mb-8 flex items-baseline justify-between gap-4">
                        <h3 className="text-3xl font-black uppercase leading-[0.85] tracking-[-0.05em]">
                          Order summary
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f1eee5]/45">
                          {totals.totalSets} / {totals.totalPieces} pcs
                        </span>
                      </div>

                      <div className="mb-8">
                        <MoqProgress totals={totals} tone="dark" />
                      </div>

                      {/* Money ladder: subtotal → GST → grand total (flat pricing) */}
                      <div className="mb-6 space-y-3.5 border-t border-[#f1eee5]/25 pt-6">
                        <LadderRow
                          label="Subtotal"
                          value={formatPrice(totals.subtotal)}
                        />
                        <LadderRow
                          label={`GST ${gst.gstRateLabel}${gst.isMixed ? " (mixed)" : ""}`}
                          value={formatPrice(gst.gstAmount)}
                        />
                      </div>

                      <div className="mb-6 flex items-end justify-between border-t-2 border-[#d8ff4f]/40 pt-5">
                        <span className="pb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#f1eee5]/70">
                          Grand total
                        </span>
                        <span className="text-4xl font-black tracking-[-0.03em]">
                          {formatPrice(gst.grandTotal)}
                        </span>
                      </div>

                      <button
                        onClick={beginWhatsappOrder}
                        className="group mb-6 flex min-h-14 w-full items-center justify-center gap-3 bg-[#d8ff4f] px-4 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#171814] transition-colors duration-300 hover:bg-[#f1eee5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff4f]/70"
                      >
                        <span>{moq.ok ? "Send WhatsApp order" : "MOQ pending"}</span>
                        <MessageCircle className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>

                      <p className="text-center text-[9px] uppercase leading-relaxed tracking-[0.2em] text-[#f1eee5]/40">
                        {GST_CONFIG.note}
                      </p>

                      <div className="mt-4 grid gap-3">
                        {moq.ok ? (
                          <Link
                            href="/checkout"
                            className="flex min-h-12 items-center justify-center gap-3 border border-[#f1eee5]/25 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f1eee5] transition-colors hover:bg-[#f1eee5] hover:text-[#171814]"
                          >
                            Razorpay checkout <CreditCard className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="flex min-h-12 items-center justify-center gap-3 border border-[#f1eee5]/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f1eee5]/35"
                          >
                            Razorpay unlocks at MOQ
                          </button>
                        )}
                        <Link
                          href="/bulk-order"
                          className="flex min-h-12 items-center justify-center gap-3 border border-[#f1eee5]/15 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f1eee5]/70 transition-colors hover:bg-[#f1eee5]/10"
                        >
                          Open bulk linesheet <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-[#171814]/15 border-x border-b border-[#171814]/20 bg-[#f2efe6] text-center">
                    {[
                      ["MOQ", "4 Sets"],
                      ["GST", "Invoice"],
                      ["Dispatch", "All India"],
                    ].map(([key, value]) => (
                      <div key={key} className="px-2 py-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#171814]">
                          {key}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#171814]/45">
                          {value}
                        </p>
                      </div>
                    ))}
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

function LadderRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f1eee5]/55">
        {label}
      </span>
      <span
        className={`text-right text-base font-bold tabular-nums tracking-[-0.01em] ${
          accent ? "text-[#d8ff4f]" : "text-[#f1eee5]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
