"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/commerce/catalog";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calculateWholesaleTotals,
  calculateGstBreakdown,
} from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Cart entry point in the navbar.
 *
 * Click → navigates to the full `/cart` page (the order builder with the
 * complete summary, GST breakdown, MOQ and checkout). On desktop, hovering the
 * trigger reveals a brutalist-editorial preview mini-cart; it does NOT replace
 * the page — every action routes to `/cart`.
 */
export function CartDrawer() {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [suppressReopen, setSuppressReopen] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  const { items, itemCount } = useCart();
  const totals = calculateWholesaleTotals(items);
  const gst = calculateGstBreakdown(items, totals.totalSets);

  // Close the preview on route change and arm the suppression guard. The navbar
  // persists across navigations, so without this the pointer left sitting over
  // the trigger would keep the preview open after landing on /cart. Comparing a
  // state-held previous pathname and calling setState during render is React's
  // recommended reset-on-change pattern (no effect, no cascading renders).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setHoverOpen(false);
    setSuppressReopen(true);
  }

  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (suppressReopen) return; // wait for a fresh leave→enter after navigation
    // Preview mini-cart is desktop-only; touch users go straight to /cart.
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setHoverOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setSuppressReopen(false); // a genuine pointer-leave clears the guard
    hideTimeout.current = setTimeout(() => setHoverOpen(false), 200);
  };

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <div
      className="relative flex h-full items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href="/cart"
        onClick={() => setHoverOpen(false)}
        className="flex items-center gap-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#171814] transition-colors hover:text-[#cc2f4a] focus:outline-none"
        aria-label={`Open cart, ${itemCount} sets`}
      >
        Cart <span className="font-bold text-[#cc2f4a]">[{itemCount}]</span>
      </Link>

      {/* Desktop hover preview — brutalist editorial glance, not the full cart */}
      <AnimatePresence>
        {hoverOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="absolute right-0 top-[100%] z-[100] mt-2 hidden w-[360px] flex-col overflow-hidden border-2 border-[#171814] bg-[#ece9df] shadow-[0_28px_56px_-20px_rgba(0,0,0,0.35)] lg:flex"
          >
            {/* Editorial header: oversized count numeral + label */}
            <div className="relative flex items-end justify-between border-b-2 border-[#171814] px-5 pb-3 pt-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#cc2f4a]">
                  Your selection
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#171814]/45">
                  Wholesale bag
                </p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black leading-[0.8] tracking-[-0.05em] text-[#171814] tabular-nums">
                  {itemCount}
                </span>
                <span className="pb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#171814]/40">
                  sets
                </span>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="relative flex flex-col items-center overflow-hidden px-5 py-12 text-center">
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[9rem] font-black uppercase leading-none tracking-[-0.08em] text-[#171814]/[0.04]">
                  Bag
                </span>
                <p className="relative text-sm font-black uppercase tracking-[-0.01em] text-[#171814]">
                  Your bag is empty.
                </p>
                <Link
                  href="/bulk-order"
                  onClick={() => setHoverOpen(false)}
                  className="relative mt-4 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#cc2f4a]"
                >
                  Start bulk deals
                  <ArrowRight className="h-3 w-3" strokeWidth={2} />
                </Link>
              </div>
            ) : (
              <>
                <div className="custom-scrollbar max-h-[288px] flex-1 overflow-y-auto">
                  {items.slice(0, 3).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: EASE, delay: 0.04 + i * 0.05 }}
                      className="group flex items-stretch gap-3 border-b border-[#171814]/15 px-5 py-3 last:border-b-0"
                    >
                      <div className="relative h-[68px] w-[52px] shrink-0 overflow-hidden bg-[#d8d4c8]">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                          sizes="52px"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between overflow-hidden py-0.5">
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#cc2f4a]">
                            {getStyleCode(item)}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] font-black uppercase leading-[0.95] tracking-[-0.02em] text-[#171814]">
                            {item.title}
                          </p>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#171814]/45">
                            {item.quantity} × {formatPrice(item.salePrice ?? item.price)}
                          </span>
                          <span className="text-[12px] font-black tabular-nums tracking-[-0.02em] text-[#171814]">
                            {formatPrice((item.salePrice ?? item.price) * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {items.length > 3 && (
                    <div className="border-b border-[#171814]/15 px-5 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#171814]/40">
                        + {items.length - 3} more{" "}
                        {items.length - 3 === 1 ? "style" : "styles"} in bag
                      </p>
                    </div>
                  )}
                </div>

                {/* Money ladder + CTA */}
                <div className="border-t-2 border-[#171814] bg-[#f2efe6] px-5 py-4">
                  <div className="space-y-1.5">
                    <PreviewRow
                      label="Subtotal"
                      value={formatPrice(totals.subtotal)}
                    />
                    {totals.discountAmount > 0 && (
                      <PreviewRow
                        label={`Savings ${totals.discountPercent}%`}
                        value={`− ${formatPrice(totals.discountAmount)}`}
                        accent
                      />
                    )}
                    <PreviewRow
                      label={`GST ${gst.gstRateLabel}`}
                      value={formatPrice(gst.gstAmount)}
                    />
                  </div>

                  <div className="mt-3 flex items-end justify-between border-t-2 border-[#171814] pt-3">
                    <span className="pb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#171814]/60">
                      Total
                    </span>
                    <span className="text-2xl font-black tabular-nums tracking-[-0.04em] text-[#171814]">
                      {formatPrice(gst.grandTotal)}
                    </span>
                  </div>

                  <Link
                    href="/cart"
                    onClick={() => setHoverOpen(false)}
                    className="group mt-4 flex h-11 w-full items-center justify-center gap-2 border-2 border-[#171814] bg-[#171814] text-[9px] font-bold uppercase tracking-[0.25em] text-[#f1eee5] transition-colors duration-300 hover:bg-[#cc2f4a] hover:border-[#cc2f4a]"
                  >
                    Open order builder
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      strokeWidth={2}
                    />
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#171814]/50">
        {label}
      </span>
      <span
        className={`text-[12px] font-bold tabular-nums tracking-[-0.01em] ${
          accent ? "text-[#cc2f4a]" : "text-[#171814]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
