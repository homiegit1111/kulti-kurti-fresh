"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/lib/cart-context";

const AUTO_DISMISS_MS = 4200;

/**
 * Single “added to bag” popup — replaces confusing hover mini-cart + auto-open drawer.
 */
export function CartAddedToast() {
  const { addedNotice, dismissAddedNotice, itemCount } = useCart();

  useEffect(() => {
    if (!addedNotice) return;
    const t = window.setTimeout(() => dismissAddedNotice(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [addedNotice, dismissAddedNotice]);

  return (
    <AnimatePresence>
      {addedNotice && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[320] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 sm:bottom-8 sm:left-auto sm:right-6 sm:translate-x-0"
        >
          <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-[#faf7f2] shadow-[0_20px_50px_-18px_rgba(35,25,20,0.4)] dark:border-white/12 dark:bg-[var(--surface-raised)] dark:shadow-[0_20px_50px_-16px_rgba(0,0,0,0.65)]">
            <div className="h-0.5 w-full bg-[var(--gold)]" />
            <div className="flex gap-3 p-3.5">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-charcoal/5 dark:bg-white/5">
                <Image
                  src={addedNotice.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[var(--gold)]">
                  {addedNotice.setsAdded === 1
                    ? "1 set added"
                    : `${addedNotice.setsAdded} sets added`}
                </p>
                <p className="mt-0.5 truncate text-[13px] font-medium text-charcoal dark:text-white">
                  {addedNotice.title}
                </p>
                <p className="mt-0.5 text-[11px] text-charcoal/45 dark:text-white/40">
                  Bag · {itemCount} {itemCount === 1 ? "set" : "sets"}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissAddedNotice}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-charcoal/30 transition-colors hover:text-charcoal dark:text-white/30 dark:hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
            <div className="flex border-t border-charcoal/8 dark:border-white/10">
              <Link
                href="/cart"
                onClick={dismissAddedNotice}
                className="flex h-10 flex-1 items-center justify-center text-[12px] font-semibold text-charcoal transition-colors hover:bg-charcoal/[0.03] dark:text-white dark:hover:bg-white/[0.04]"
              >
                View cart
              </Link>
              <div className="w-px bg-charcoal/8 dark:bg-white/10" />
              <button
                type="button"
                onClick={dismissAddedNotice}
                className="flex h-10 flex-1 items-center justify-center text-[12px] font-medium text-charcoal/50 transition-colors hover:bg-charcoal/[0.03] dark:text-white/45 dark:hover:bg-white/[0.04]"
              >
                Keep shopping
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
