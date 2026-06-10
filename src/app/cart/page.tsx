"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Minus,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Lock,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";
import { formatPrice, COLOR_MAP } from "@/lib/shopify";
import { trackCheckoutStart } from "@/lib/checkout";
import { ShopPayButton } from "@/components/checkout/shop-pay-button";

export default function CartPage() {
  const {
    items,
    itemCount,
    subtotal,
    total,
    removeItem,
    updateQuantity,
    clearCart,
    checkoutUrl,
    isSyncing,
    shopifyCartEnabled,
  } = useCart();

  return (
    <div className="bg-warm-white min-h-screen text-charcoal flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 lg:pt-36 pb-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          {/* ── HEADER ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 md:mb-16 flex flex-wrap items-end justify-between gap-6 border-b border-charcoal/10 pb-8"
          >
            <div>
              <p className="eyebrow mb-3">The Cart</p>
              <h1 className="font-serif text-5xl md:text-6xl text-charcoal font-light tracking-tight">
                Your <span className="italic">Selection</span>
              </h1>
            </div>
            {items.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/40">
                {itemCount} {itemCount === 1 ? "Piece" : "Pieces"}
              </p>
            )}
          </motion.div>

          {/* ── EMPTY CART STATE ── */}
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="py-24 flex flex-col items-center justify-center text-center"
            >
              <p className="font-serif text-[100px] md:text-[140px] leading-none text-charcoal/[0.06] select-none mb-[-30px] md:mb-[-44px]">
                Empty
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-charcoal font-light mb-4 relative">
                Nothing here — <span className="italic">yet.</span>
              </h2>
              <p className="text-sm text-charcoal/50 max-w-sm leading-relaxed mb-10">
                Your cart is waiting for its first piece. Explore the
                collection and find something worth keeping.
              </p>
              <Link href="/shop" className="btn-luxe group">
                <span>Explore the Collection</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>
          ) : (
            /* ── FILLED CART STATE ── */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
              {/* Left Column: Line items */}
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
                      {/* Product Image */}
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

                      {/* Details & Actions */}
                      <div className="flex flex-col flex-1 justify-between py-1">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <Link href={`/shop/${item.handle}`}>
                              <h3 className="text-xl md:text-2xl font-serif font-light text-charcoal line-clamp-2 leading-tight">
                                <span className="link-luxe">{item.title}</span>
                              </h3>
                            </Link>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                              <p className="text-[10px] font-bold text-charcoal/45 uppercase tracking-[0.2em]">
                                Size —{" "}
                                <span className="text-charcoal">
                                  {item.size}
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
                                  {item.color}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-charcoal/30 hover:text-charcoal transition-colors p-2 -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                            title="Remove item"
                            aria-label={`Remove ${item.title} from cart`}
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>

                        {/* Bottom Row: Quantity & Price */}
                        <div className="flex items-end justify-between mt-6">
                          <div className="flex items-center border border-charcoal/15">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              aria-label="Decrease quantity"
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
                              aria-label="Increase quantity"
                              className="w-9 h-9 flex items-center justify-center text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                            >
                              <Plus className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          </div>

                          <div className="text-right">
                            {item.quantity > 1 && (
                              <p className="text-[10px] text-charcoal/40 font-semibold tracking-[0.15em] uppercase mb-1">
                                {formatPrice(item.salePrice ?? item.price)}{" "}
                                each
                              </p>
                            )}
                            <p className="text-xl font-serif text-charcoal">
                              {formatPrice(
                                (item.salePrice ?? item.price) * item.quantity,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Footer Links */}
                <div className="flex items-center justify-between mt-10">
                  <Link
                    href="/shop"
                    className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform duration-300" />
                    <span className="link-luxe">Continue Shopping</span>
                  </Link>
                  <button
                    onClick={clearCart}
                    className="text-[10px] font-bold text-charcoal/35 hover:text-charcoal uppercase tracking-[0.2em] transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>

              {/* Right Column: Order summary */}
              <div className="lg:col-span-5 xl:col-span-4 relative mt-8 lg:mt-0">
                <div className="sticky top-32 z-20">
                  <div className="bg-charcoal text-warm-white relative px-8 py-10 md:px-10 md:py-12 frame-luxe">
                    <div className="relative z-10">
                      <p className="eyebrow eyebrow--bare mb-2">Summary</p>
                      <h3 className="font-serif text-3xl font-light mb-10">
                        Order <span className="italic">Total</span>
                      </h3>

                      <div className="space-y-5 mb-10">
                        <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                            Pieces ({itemCount})
                          </span>
                          <span className="font-serif text-lg">
                            {formatPrice(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                            Shipping
                          </span>
                          <span className="font-serif text-lg italic text-gold-light">
                            Complimentary
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline pb-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                            Taxes
                          </span>
                          <span className="text-xs text-white/45">
                            Calculated at checkout
                          </span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-end mb-10 pt-6 border-t border-gold/40">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 pb-1">
                          Total
                        </span>
                        <span className="font-serif text-4xl font-light">
                          {formatPrice(total)}
                        </span>
                      </div>

                      {/* Shop Pay express lane (appears only when enabled) */}
                      <ShopPayButton className="mb-3" />

                      {/* Checkout Button */}
                      <button
                        disabled={isSyncing}
                        onClick={async (e) => {
                          e.preventDefault();
                          trackCheckoutStart(items, subtotal);
                          if (checkoutUrl) {
                            window.location.href = checkoutUrl;
                          } else if (shopifyCartEnabled) {
                            const { getOrCreateCart } =
                              await import("@/lib/shopify-cart");

                            const cart = await getOrCreateCart();
                            if (cart?.checkoutUrl) {
                              window.location.href = cart.checkoutUrl;
                            }
                          } else {
                            window.location.href = "/checkout";
                          }
                        }}
                        className="group w-full h-14 flex items-center justify-center gap-3 bg-warm-white text-charcoal text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-gold hover:text-charcoal transition-colors duration-400 mb-6 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Syncing…</span>
                          </>
                        ) : (
                          <>
                            <span>Proceed to Checkout</span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                          </>
                        )}
                      </button>

                      {/* Security Note */}
                      <div className="flex items-center justify-center gap-1.5 text-[9px] text-white/40 uppercase tracking-[0.25em]">
                        <Lock className="h-3 w-3" />
                        <span>Secure Checkout</span>
                      </div>
                    </div>
                  </div>

                  {/* Service notes */}
                  <div className="grid grid-cols-3 divide-x divide-charcoal/10 border-x border-b border-charcoal/10 bg-white text-center">
                    {[
                      ["COD", "Available"],
                      ["Free Ship", "₹2,999+"],
                      ["Returns", "7 Days"],
                    ].map(([k, v]) => (
                      <div key={k} className="py-4 px-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-charcoal">
                          {k}
                        </p>
                        <p className="text-[9px] uppercase tracking-[0.14em] text-charcoal/45 mt-1">
                          {v}
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
