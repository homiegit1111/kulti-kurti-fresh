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
import { formatPrice } from "@/lib/shopify";
import { trackCheckoutStart } from "@/lib/checkout";
import { ShopPayButton } from "@/components/checkout/shop-pay-button";
import { Minus, Plus, X, ArrowRight, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const doodleFont = {
  fontFamily: '"Kalam", "Caveat", "Comic Sans MS", cursive',
};

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const {
    items,
    itemCount,
    subtotal,
    removeItem,
    updateQuantity,
    checkoutUrl,
    isSyncing,
    shopifyCartEnabled,
    syncError,
  } = useCart();

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

        {/* ── Hover Mini-Cart (Desktop Only) ── */}
        <AnimatePresence>
          {hoverOpen && !open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-[100%] right-0 w-[320px] bg-[#FAFAF9]/90 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden z-[100] hidden lg:flex flex-col mt-2 before:absolute before:inset-0 before:bg-[url('https://grainy-gradients.vercel.app/noise.svg')] before:opacity-[0.03] before:pointer-events-none"
            >
              <div className="p-4 border-b border-charcoal/5 flex justify-between items-center bg-white/40">
                <span className="font-serif text-lg tracking-tight text-charcoal flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-gold" /> Curations
                </span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-charcoal/40 uppercase">
                  {itemCount} Items
                </span>
              </div>

              <div className="flex-1 max-h-[300px] overflow-y-auto px-4 py-2 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center">
                    <Sparkles className="w-6 h-6 text-charcoal/20 mb-2" />
                    <p className="text-sm font-serif text-charcoal/60">Your bag is empty.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 py-2">
                    {items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex gap-3 group items-center">
                        <div className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-charcoal/5">
                          <Image src={item.image} alt={item.title} fill className="object-cover" sizes="48px" />
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <p className="text-[11px] font-semibold text-charcoal truncate">{item.title}</p>
                          <p className="text-[9px] text-charcoal/50 uppercase tracking-widest mt-0.5">
                            {item.size} | {item.color}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-charcoal font-medium">{item.quantity} × {formatPrice(item.salePrice ?? item.price)}</span>
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
                <div className="p-4 bg-white/60 border-t border-white/50 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold tracking-[0.2em] text-charcoal/50 uppercase">Subtotal</span>
                    <span className="font-serif text-lg text-charcoal">{formatPrice(subtotal)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoverOpen(false);
                      setOpen(true);
                    }}
                    className="w-full h-10 bg-charcoal text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    View Cart <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* ── Ultra-Modern Floating Panel Design ── */}
      <SheetContent className="w-full sm:max-w-md bg-transparent border-none p-0 flex flex-col z-[100] shadow-none">
        
        {/* Floating Inner Container */}
        <div className="h-full w-full sm:h-[calc(100%-2rem)] sm:my-4 sm:mr-4 sm:rounded-[2.5rem] overflow-hidden flex flex-col relative bg-[#FAFAF9]/80 backdrop-blur-[60px] border border-white/60 shadow-[0_30px_100px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(255,255,255,0.5)]">
          
          {/* ── Ethereal Fluid Background ── */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay z-20" />
            <motion.div 
              animate={{ x: ["0%", "15%", "0%"], y: ["0%", "10%", "0%"], scale: [1, 1.2, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-20 -left-20 w-[120%] h-[50%] bg-gradient-to-br from-[#E8D9C8]/40 to-transparent rounded-full blur-[80px] z-0"
            />
            <motion.div 
              animate={{ x: ["0%", "-10%", "0%"], y: ["0%", "-15%", "0%"], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[-10%] -right-20 w-[120%] h-[60%] bg-gradient-to-tl from-[#E2DFD2]/50 to-transparent rounded-full blur-[100px] z-0"
            />
          </div>

          <SheetHeader className="px-6 py-6 sm:px-8 sm:py-8 bg-transparent z-10 relative">
            <SheetTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center shadow-sm border border-white">
                    <ShoppingBag className="w-4 h-4 text-charcoal/80" strokeWidth={1.5} />
                  </div>
                  {itemCount > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full border-2 border-[#FAFAF9] flex items-center justify-center"
                    />
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-serif text-2xl tracking-tight text-charcoal leading-none">
                    Curations
                  </span>
                  <span className="text-[9px] font-bold font-sans tracking-[0.2em] text-charcoal/40 uppercase mt-1">
                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'} Selected
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
                <div className="relative w-32 h-32 mb-8">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-dashed border-charcoal/20 rounded-full"
                  />
                  <div className="absolute inset-2 rounded-full bg-white/40 backdrop-blur-md border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-charcoal/20 absolute top-6 right-6" />
                    <ShoppingBag className="w-8 h-8 text-charcoal/40" strokeWidth={1} />
                  </div>
                </div>
                <h3 className="font-serif text-3xl text-charcoal mb-3">
                  Your bag is empty
                </h3>
                <p className="text-base text-charcoal/50 mb-10" style={doodleFont}>
                  Fill it with something beautiful.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="group relative px-8 py-4 bg-charcoal text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-black transition-all flex items-center gap-3 overflow-hidden"
                >
                  <span className="relative z-10">Start Curating</span>
                  <ArrowRight className="h-3 w-3 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </button>
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
                      className="group flex gap-4 p-2.5 bg-white/40 hover:bg-white/70 backdrop-blur-lg border border-white/60 rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] items-center relative overflow-hidden transition-colors duration-500"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 -translate-x-[100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-out pointer-events-none" />

                      <Link
                        href={`/shop/${item.handle}`}
                        onClick={() => setOpen(false)}
                        className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 rounded-[1rem] overflow-hidden"
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
                            className="font-serif text-sm sm:text-base text-charcoal hover:text-gold transition-colors line-clamp-2 leading-tight pr-4"
                          >
                            {item.title}
                          </Link>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute top-3 right-3 text-charcoal/20 hover:text-red-500 hover:bg-red-50/50 backdrop-blur-sm transition-all p-1.5 rounded-full z-10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                            aria-label="Remove item"
                          >
                            <X className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </div>

                        <p className="text-[9px] font-bold text-charcoal/40 uppercase tracking-[0.15em] mb-auto">
                          {item.size && `Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                        </p>

                        <div className="flex items-end justify-between mt-4">
                          <div className="flex items-center bg-white/50 border border-white/80 rounded-full p-0.5 shadow-sm backdrop-blur-sm">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="text-charcoal/50 hover:text-charcoal p-1.5 transition-colors hover:bg-white rounded-full"
                            >
                              <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                            </button>
                            <span className="text-[10px] font-sans font-bold w-6 text-center text-charcoal">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="text-charcoal/50 hover:text-charcoal p-1.5 transition-colors hover:bg-white rounded-full"
                            >
                              <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                            </button>
                          </div>
                          <p className="font-serif text-sm font-semibold text-charcoal tracking-wide bg-white/30 px-3 py-1.5 rounded-full border border-white/50">
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
            <div className="p-6 sm:p-8 bg-white/60 backdrop-blur-3xl border-t border-white/80 z-20 relative mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-end mb-6 border-b border-charcoal/5 pb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-widest text-charcoal mb-0.5">
                    Subtotal
                  </span>
                  <p className="text-[10px] text-charcoal/50 font-medium">
                    Shipping & taxes calculated at checkout
                  </p>
                </div>
                <span className="font-sans font-medium text-2xl tracking-tight text-charcoal">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {syncError && (
                <p
                  role="alert"
                  className="mb-4 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  {syncError}
                </p>
              )}

              <ShopPayButton className="mb-3" />

              <button
                disabled={isSyncing}
                onClick={async (e) => {
                  e.preventDefault();
                  trackCheckoutStart(items, subtotal);
                  if (checkoutUrl) {
                    window.location.href = checkoutUrl;
                  } else if (shopifyCartEnabled) {
                    const { getOrCreateCart } = await import("@/lib/shopify-cart");
                    const cart = await getOrCreateCart();
                    if (cart?.checkoutUrl) {
                      window.location.href = cart.checkoutUrl;
                    }
                  } else {
                    window.location.href = "/checkout";
                  }
                }}
                className="group relative w-full h-14 bg-charcoal text-white text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] rounded-full hover:bg-black transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-4"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin relative z-10 text-gold" />
                    <span className="relative z-10 tracking-widest">Syncing…</span>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                    <span className="relative z-10 pt-0.5">Secure Checkout</span>
                    <div className="relative z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-gold group-hover:text-charcoal transition-all duration-300">
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                    </div>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
