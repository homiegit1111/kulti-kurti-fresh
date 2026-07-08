"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/commerce/catalog";
import { Minus, Plus, X, ArrowRight, Loader2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { calculateWholesaleTotals } from "@/lib/b2b/pricing";
import { validateCartMOQ } from "@/lib/b2b/validation";
import { buildWholesaleWhatsAppUrl } from "@/lib/b2b/whatsapp";
import { getStyleCode } from "@/lib/b2b/style-code";
import { MoqProgress } from "@/components/b2b/moq-progress";
import {
  trackBeginWhatsappOrder,
  trackMoqBlockedCheckout,
} from "@/lib/analytics";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const {
    items,
    itemCount,
    removeItem,
    updateQuantity,
    isSyncing,
    syncError,
  } = useCart();
  const totals = calculateWholesaleTotals(items);
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

  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    // Only show hover state on desktop (assuming standard min-width > 1024px, we'll let CSS handle it via hidden lg:block but state is simple)
    if (window.innerWidth >= 1024) {
      setHoverOpen(true);
    }
  };

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setHoverOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div 
        className="relative flex items-center h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SheetTrigger
          onClick={(e) => {
            e.stopPropagation();
            setHoverOpen(false);
            setOpen(true);
          }}
          className="text-[10px] uppercase tracking-widest font-semibold text-charcoal hover:text-gold transition-colors flex items-center gap-1 focus:outline-none py-4"
          aria-label="Open cart"
        >
          Cart <span className="text-gold font-bold">[{itemCount}]</span>
        </SheetTrigger>

        {/* Hover mini-cart for desktop */}
        <AnimatePresence>
          {hoverOpen && !open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-[100%] right-0 w-[320px] bg-warm-white/95 backdrop-blur-2xl border border-charcoal/10 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.15)] overflow-hidden z-[100] hidden lg:flex flex-col mt-2"
            >
              <div className="p-4 border-b border-charcoal/10 flex justify-between items-center bg-white">
                <span className="font-serif text-lg tracking-tight text-charcoal flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-gold" strokeWidth={1.5} /> Your Selection
                </span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-charcoal/40 uppercase">
                  {itemCount} Sets
                </span>
              </div>

              <div className="flex-1 max-h-[300px] overflow-y-auto px-4 py-2 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center">
                    <ShoppingBag className="w-6 h-6 text-charcoal/25 mb-2" />
                    <p className="text-sm font-serif text-charcoal/60">Your bag is empty.</p>
                    <Link
                      href="/bulk-order"
                      onClick={() => setHoverOpen(false)}
                      className="mt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-gold-dark"
                    >
                      Start bulk deals
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 py-2">
                    {items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex gap-3 group items-center">
                        <div className="relative w-12 h-16 shrink-0 overflow-hidden bg-warm-gray">
                          <Image src={item.image} alt={item.title} fill className="object-cover" sizes="48px" />
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <p className="text-[11px] font-semibold text-charcoal truncate">{item.title}</p>
                          <p className="text-[9px] text-charcoal/50 uppercase tracking-widest mt-0.5">
                            {getStyleCode(item)} | {item.quantity} sets
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-charcoal font-medium">{item.quantity} sets x {formatPrice(item.salePrice ?? item.price)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[9px] text-center text-charcoal/40 font-bold uppercase tracking-widest mt-2">
                        + {items.length - 3} more items
                      </p>
                    )}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="p-4 bg-white border-t border-charcoal/10 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold tracking-[0.2em] text-charcoal/50 uppercase">Selection total</span>
                    <span className="font-serif text-lg text-charcoal">{formatPrice(totals.subtotal)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoverOpen(false);
                      setOpen(true);
                    }}
                    className="w-full h-11 bg-charcoal text-white text-[9px] font-bold uppercase tracking-[0.25em] hover:bg-gold-dark transition-colors duration-300 flex items-center justify-center gap-2"
                  >
                    View Cart <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Floating cart panel */}
      <SheetContent className="w-full sm:max-w-md bg-transparent border-none p-0 flex flex-col z-[100] shadow-none">
        
        {/* Floating Inner Container */}
        <div className="h-full w-full overflow-hidden flex flex-col relative bg-warm-white border-l border-charcoal/10 shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
          
          <SheetHeader className="px-6 py-6 sm:px-8 sm:py-8 bg-transparent z-10 relative">
            <SheetTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 border border-gold/40 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-charcoal/80" strokeWidth={1.5} />
                  </div>
                  {itemCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gold rounded-full border-2 border-warm-white"
                    />
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-serif text-2xl font-light tracking-tight text-charcoal leading-none">
                    Your <span className="italic">Selection</span>
                  </span>
                  <span className="text-[9px] font-bold font-sans tracking-[0.25em] text-charcoal/40 uppercase mt-1.5">
                    {itemCount} {itemCount === 1 ? "Set" : "Sets"} /{" "}
                    {totals.totalPieces} pcs
                  </span>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 hide-scrollbar relative z-10 pb-6">
            {items.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="mb-8 flex h-24 w-24 items-center justify-center border border-charcoal/10 bg-white">
                  <ShoppingBag className="h-7 w-7 text-charcoal/35" strokeWidth={1.4} />
                </div>
                <h3 className="font-serif text-3xl font-light text-charcoal mb-3">
                  Your bag is <span className="italic">empty</span>
                </h3>
                <p className="font-serif italic text-lg text-charcoal/45 mb-10">
                  Add {B2B_CONFIG.minimumOrderSets} kurti sets to unlock ordering.
                </p>
                <Link
                  href="/bulk-order"
                  onClick={() => setOpen(false)}
                  className="btn-luxe group"
                >
                  <span className="relative z-10">Open Bulk Deals</span>
                  <ArrowRight className="h-3 w-3 relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: index * 0.05 } }}
                      exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                      className="group flex gap-4 p-3 bg-white border border-charcoal/10 hover:border-charcoal/20 items-center relative overflow-hidden transition-colors duration-300"
                    >
                      <Link
                        href={`/shop/${item.handle}`}
                        onClick={() => setOpen(false)}
                        className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 overflow-hidden bg-warm-gray"
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 640px) 80px, 96px"
                        />
                        <div className="absolute inset-0 bg-charcoal/5 mix-blend-overlay group-hover:bg-transparent transition-colors duration-500" />
                      </Link>

                      <div className="flex flex-col flex-1 h-full py-2 pr-2">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <Link
                            href={`/shop/${item.handle}`}
                            onClick={() => setOpen(false)}
                            className="font-serif text-sm sm:text-base text-charcoal hover:text-gold-dark transition-colors line-clamp-2 leading-tight pr-4"
                          >
                            {item.title}
                          </Link>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute top-3 right-3 text-charcoal/25 hover:text-charcoal transition-colors p-1.5 z-10 lg:opacity-0 lg:group-hover:opacity-100"
                            aria-label="Remove item"
                          >
                            <X className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </div>

                        <p className="text-[9px] font-bold text-charcoal/40 uppercase tracking-[0.15em] mb-auto">
                          {getStyleCode(item)} - Ratio set - {item.quantity * B2B_CONFIG.setSize} pcs
                        </p>

                        <div className="flex items-end justify-between mt-4">
                          <div className="flex items-center border border-charcoal/15">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="text-charcoal/50 hover:text-charcoal w-7 h-7 flex items-center justify-center transition-colors hover:bg-charcoal/5"
                            >
                              <Minus className="h-2.5 w-2.5" strokeWidth={2} />
                            </button>
                            <span className="text-[10px] font-sans font-bold w-7 text-center text-charcoal border-x border-charcoal/15 leading-7">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="text-charcoal/50 hover:text-charcoal w-7 h-7 flex items-center justify-center transition-colors hover:bg-charcoal/5"
                            >
                              <Plus className="h-2.5 w-2.5" strokeWidth={2} />
                            </button>
                          </div>
                          <p className="font-serif text-base text-charcoal">
                            {formatPrice((item.salePrice ?? item.price) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="p-6 sm:p-8 bg-white border-t border-charcoal/10 z-20 relative mt-auto">
              <div className="flex justify-between items-end mb-6 border-b border-charcoal/10 pb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/60 mb-0.5">
                    Subtotal
                  </span>
                  <p className="text-[10px] text-charcoal/50 font-medium">
                    MOQ {B2B_CONFIG.minimumOrderSets} sets before WhatsApp order
                  </p>
                </div>
                <span className="font-serif text-3xl font-light tracking-tight text-charcoal">
                  {formatPrice(totals.subtotal)}
                </span>
              </div>

              {syncError && (
                <p
                  role="alert"
                  className="mb-4 text-[11px] font-medium text-destructive bg-destructive/5 border border-destructive/20 border-l-2 border-l-destructive px-3 py-2"
                >
                  {syncError}
                </p>
              )}

              <div className="mb-4">
                <MoqProgress totals={totals} />
              </div>

              <button
                disabled={isSyncing}
                onClick={(e) => {
                  e.preventDefault();
                  beginWhatsappOrder();
                }}
                className="group relative w-full h-14 bg-charcoal text-white text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-gold-dark transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-4"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin relative z-10 text-gold" />
                    <span className="relative z-10 tracking-widest">Syncing...</span>
                  </>
                ) : (
                  <>
                    <span className="relative z-10 pt-0.5">
                      {moq.ok ? "Send WhatsApp Order" : "MOQ Pending"}
                    </span>
                    <ArrowRight className="relative z-10 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={1.5} />
                  </>
                )}
              </button>
              {moq.ok && (
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  className="mt-3 flex h-12 items-center justify-center border border-charcoal/15 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal hover:bg-charcoal hover:text-white"
                >
                  Razorpay Checkout
                </Link>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
