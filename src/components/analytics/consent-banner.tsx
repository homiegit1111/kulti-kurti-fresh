"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  hasConsentDecision,
  isAnalyticsConfigured,
  setConsent,
} from "@/lib/analytics";

/**
 * Cookie/consent banner — gates GA4 Consent Mode.
 *
 * Only renders when GA is configured AND the visitor hasn't decided yet.
 * Accept → consent granted (analytics + ads). Decline → stays denied (the
 * Consent Mode default), so GA4 still receives cookieless pings but stores
 * nothing identifying.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAnalyticsConfigured() && !hasConsentDecision()) {
      // Small delay so it doesn't fight the page's entrance animation.
      const t = window.setTimeout(() => setVisible(true), 800);
      return () => window.clearTimeout(t);
    }
  }, []);

  const decide = (choice: "granted" | "denied") => {
    setConsent(choice);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          role="dialog"
          aria-label="Privacy & cookies"
          className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl rounded-2xl border border-white/10 bg-charcoal/95 backdrop-blur-md px-6 py-5 text-warm-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:left-6 sm:bottom-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-white/70 font-serif">
              We use cookies to understand how our atelier is explored and to
              refine your experience. See our{" "}
              <Link
                href="/privacy"
                className="text-gold underline underline-offset-2 hover:text-white transition-colors"
              >
                privacy policy
              </Link>
              .
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => decide("denied")}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-full"
              >
                Decline
              </button>
              <button
                onClick={() => decide("granted")}
                className="rounded-full bg-gold px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
