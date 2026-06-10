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

const doodleFont = {
  fontFamily: '"Kalam", "Caveat", "Comic Sans MS", cursive',
};

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
    <div className="bg-[#fcfbf9] min-h-screen text-charcoal flex flex-col font-sans selection:bg-gold selection:text-white">
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 lg:pt-32 pb-24 overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-300/10 rounded-full blur-[120px]" />
          <div className="absolute right-1/4 bottom-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          {/* ── HEADER ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 md:mb-16 relative"
          >
            <div className="inline-flex items-center gap-3 mb-2">
              <span className="h-[1px] w-6 bg-gold" />
              <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
                Shopping Cart
              </p>
            </div>
            <h1 className="font-serif text-5xl md:text-6xl text-charcoal tracking-tighter">
              Your Curated <span className="italic">Pieces</span>
            </h1>

            {/* Doodle under header */}
            <svg
              className="absolute -bottom-4 left-0 w-48 h-4 text-charcoal/20"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M0,5 Q20,0 40,8 T80,2 T100,6" />
            </svg>
          </motion.div>

          {/* ── EMPTY CART STATE ── */}
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center py-20 flex flex-col items-center justify-center min-h-[50vh]"
            >
              {/* Hand-drawn Shopping Bag */}
              <div className="relative w-40 h-40 mb-8">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full text-charcoal/20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Bag body */}
                  <path d="M20,30 L80,30 L75,90 L25,90 Z" />
                  {/* Bag handles */}
                  <path d="M40,30 C40,15 60,15 60,30" strokeDasharray="3 3" />
                  {/* Doodle scribble on bag */}
                  <path d="M35,50 Q50,45 65,55 Q50,65 35,60" />
                </svg>
                {/* Floating star doodle */}
                <motion.svg
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  viewBox="0 0 24 24"
                  className="absolute -top-2 -right-2 w-8 h-8 text-gold"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </div>

              <h2 className="font-serif text-3xl text-charcoal mb-4">
                Your cart is waiting...
              </h2>
              <p className="text-xl text-charcoal/50 mb-10" style={doodleFont}>
                Let&apos;s find something beautiful to put inside.
              </p>

              <div className="relative inline-block">
                <Link
                  href="/shop"
                  className="relative z-10 px-8 py-4 bg-charcoal text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-black hover:scale-[1.02] transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.1)] flex items-center gap-3"
                >
                  <span>Start Curating</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {/* Scribble Arrow */}
                <svg
                  className="absolute top-10 -right-16 w-16 h-16 text-charcoal/30 rotate-12"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10,80 Q50,20 90,40" />
                  <path d="M75,30 L90,40 L80,55" />
                </svg>
              </div>
            </motion.div>
          ) : (
            /* ── FILLED CART STATE ── */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
              {/* Left Column: Curated Items */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                      transition={{ duration: 0.4 }}
                      className="group flex gap-6 md:gap-8 py-8 border-b border-charcoal/10 relative"
                    >
                      {/* Product Image */}
                      <Link
                        href={`/shop/${item.handle}`}
                        className="relative w-28 md:w-36 aspect-[3/4] shrink-0 bg-[#f4efe6] overflow-hidden shadow-sm"
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="150px"
                        />
                        {/* Fake photo corner shadow */}
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] pointer-events-none" />
                      </Link>

                      {/* Details & Actions */}
                      <div className="flex flex-col flex-1 justify-between py-1">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <Link href={`/shop/${item.handle}`}>
                              <h3 className="text-xl md:text-2xl font-serif text-charcoal group-hover:text-gold transition-colors line-clamp-2 leading-tight">
                                {item.title}
                              </h3>
                            </Link>

                            <div className="flex flex-wrap items-center gap-4 mt-3">
                              <p className="text-[10px] font-bold text-charcoal/50 uppercase tracking-widest bg-white/50 px-2 py-1 border border-charcoal/5 rounded-sm relative">
                                Size:{" "}
                                <span className="text-charcoal">
                                  {item.size}
                                </span>
                                {/* Hover doodle circle */}
                                <svg
                                  className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] text-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                  viewBox="0 0 100 100"
                                  preserveAspectRatio="none"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <ellipse cx="50" cy="50" rx="48" ry="40" />
                                </svg>
                              </p>

                              <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 border border-charcoal/5 rounded-sm">
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-charcoal/10"
                                  style={{
                                    backgroundColor:
                                      COLOR_MAP[item.color] ?? "#ccc",
                                  }}
                                />
                                <span className="text-[10px] font-bold text-charcoal/50 uppercase tracking-widest">
                                  {item.color}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-charcoal/30 hover:text-red-500 transition-colors p-2 -mr-2"
                            title="Remove item"
                          >
                            <X className="h-5 w-5" strokeWidth={1.5} />
                          </button>
                        </div>

                        {/* Bottom Row: Quantity & Price */}
                        <div className="flex items-end justify-between mt-6">
                          {/* Playful Quantity Adjuster */}
                          <div className="flex items-center border-b border-charcoal/20 pb-1">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="w-6 h-6 flex items-center justify-center text-charcoal/50 hover:text-charcoal transition-colors"
                            >
                              <Minus className="h-3 w-3" strokeWidth={2} />
                            </button>
                            <span className="w-8 text-center text-sm font-bold font-serif">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="w-6 h-6 flex items-center justify-center text-charcoal/50 hover:text-charcoal transition-colors"
                            >
                              <Plus className="h-3 w-3" strokeWidth={2} />
                            </button>
                          </div>

                          <div className="text-right">
                            {item.quantity > 1 && (
                              <p className="text-[10px] text-charcoal/40 font-bold tracking-widest uppercase mb-1">
                                {formatPrice(item.salePrice ?? item.price)} each
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
                    className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal/60 hover:text-charcoal transition-colors relative"
                  >
                    <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                    Back to Collection
                    {/* Scribble underline */}
                    <svg
                      className="absolute -bottom-1 left-0 w-full h-1 text-gold opacity-0 group-hover:opacity-100 transition-opacity"
                      viewBox="0 0 100 10"
                      preserveAspectRatio="none"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M0,5 Q50,0 100,5" />
                    </svg>
                  </Link>
                  <button
                    onClick={clearCart}
                    className="text-[10px] font-bold text-charcoal/40 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>

              {/* Right Column: The Editorial Receipt */}
              <div className="lg:col-span-5 xl:col-span-4 relative mt-8 lg:mt-0">
                <div className="sticky top-32 z-20 filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                  {/* Receipt Paper Container */}
                  <div className="bg-white/80 backdrop-blur-xl relative px-8 py-10 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.05)] border border-charcoal/5 overflow-hidden">
                    {/* Faint dot grid on receipt */}
                    <div
                      className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(charcoal 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />

                    <div className="relative z-10">
                      <h3 className="font-serif text-3xl text-charcoal mb-8 text-center italic">
                        Order Summary
                      </h3>

                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-baseline border-b border-charcoal/10 border-dashed pb-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-charcoal/60">
                            Pieces ({itemCount})
                          </span>
                          <span className="font-serif text-lg text-charcoal">
                            {formatPrice(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-charcoal/10 border-dashed pb-2 relative">
                          <span className="text-xs font-bold uppercase tracking-widest text-charcoal/60">
                            Shipping
                          </span>
                          <span className="font-serif text-lg text-gold italic">
                            Complimentary
                          </span>
                          {/* Doodle arrow pointing to complimentary */}
                          <svg
                            className="absolute top-1 right-28 w-6 h-6 text-charcoal/30 hidden md:block"
                            viewBox="0 0 100 100"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M10,50 Q40,20 80,50" />
                            <path d="M70,40 L80,50 L70,60" />
                          </svg>
                        </div>
                        <div className="flex justify-between items-baseline pb-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-charcoal/60">
                            Taxes
                          </span>
                          <span
                            className="text-lg text-charcoal/40"
                            style={doodleFont}
                          >
                            Calculated at checkout
                          </span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-end mb-8 pt-6 border-t-2 border-charcoal relative">
                        <span className="text-sm font-bold uppercase tracking-widest text-charcoal">
                          Total Amount
                        </span>
                        <span className="font-serif text-4xl text-charcoal">
                          {formatPrice(total)}
                        </span>

                        {/* Circle doodle around total */}
                        <svg
                          className="absolute -right-4 -bottom-4 w-32 h-16 text-gold/40 pointer-events-none"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <ellipse cx="50" cy="50" rx="45" ry="30" />
                        </svg>
                      </div>

                      {/* Checkout Button */}
                      {/* Checkout Button */}
                      <button
                        disabled={isSyncing}
                        onClick={async (e) => {
                          e.preventDefault();
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
                        className="group w-full h-14 flex items-center justify-center gap-3 bg-charcoal text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-black hover:scale-[1.02] transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.1)] mb-6 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Syncing…</span>
                          </>
                        ) : (
                          <>
                            <span>Secure Checkout</span>
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      {/* Security Note */}
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-charcoal/50 uppercase tracking-widest mb-4">
                        <Lock className="h-3 w-3" />
                        <span>Secured by Shopify</span>
                      </div>

                      {/* Handwritten Note */}
                      <div className="text-center">
                        <p
                          className="text-xl text-charcoal/60"
                          style={doodleFont}
                        >
                          Thank you for choosing Rangat!
                        </p>
                        <div className="flex justify-center mt-2 opacity-30">
                          {/* Heart scribble */}
                          <svg
                            viewBox="0 0 100 100"
                            className="w-6 h-6 text-charcoal"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M50,80 C50,80 20,50 20,30 C20,10 50,10 50,30 C50,10 80,10 80,30 C80,50 50,80 50,80 Z" />
                          </svg>
                        </div>
                      </div>
                    </div>
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
