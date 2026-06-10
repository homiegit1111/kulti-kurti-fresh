"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, ArrowRight, Mail } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";

/**
 * Post-checkout confirmation page.
 *
 * Set this as the checkout return URL in Shopify (Settings → Checkout →
 * "Order status page" additional scripts / or the app's return_to), e.g.
 *   https://www.rangatpehnawa.com/order-confirmation?order={{ order_name }}&email={{ email }}
 *
 * It works with zero params too: it always clears the local cart (the order is
 * now Shopify's) and shows a graceful thank-you. Any order/email params passed
 * back are surfaced for a personalised confirmation.
 */
function OrderConfirmationContent() {
  const params = useSearchParams();
  const { clearCart } = useCart();
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);

  // Read the common return params Shopify (or our checkout) may append.
  const orderName =
    params.get("order") ||
    params.get("order_name") ||
    params.get("order_number") ||
    "";
  const email = params.get("email") || "";

  useEffect(() => {
    // Guard against double-invocation (React strict mode) clearing twice.
    if (clearedRef.current) return;
    clearedRef.current = true;
    clearCart();
    setCleared(true);
  }, [clearCart]);

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-warm-white pt-32 pb-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white border border-charcoal/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)] rounded-2xl overflow-hidden">
            <div className="h-2 bg-gold" />
            <div className="px-8 py-12 lg:px-12 lg:py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-10 h-10 text-gold" strokeWidth={1.5} />
              </div>

              <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/40 font-bold mb-4">
                Thank you for your order
              </p>
              <h1 className="font-serif text-4xl lg:text-5xl text-charcoal mb-6">
                Your order is{" "}
                <span className="italic text-gold">confirmed</span>
              </h1>

              {orderName ? (
                <p className="text-charcoal/70 font-sans text-sm leading-relaxed max-w-md mx-auto mb-2">
                  Order{" "}
                  <span className="font-semibold text-charcoal">
                    {orderName.startsWith("#") ? orderName : `#${orderName}`}
                  </span>{" "}
                  has been placed successfully.
                </p>
              ) : (
                <p className="text-charcoal/70 font-sans text-sm leading-relaxed max-w-md mx-auto mb-2">
                  Your order has been placed successfully and is now being
                  prepared with care.
                </p>
              )}

              <div className="flex items-center justify-center gap-2 text-charcoal/60 text-xs mb-10">
                <Mail className="w-3.5 h-3.5" />
                <span>
                  A confirmation email
                  {email ? (
                    <>
                      {" "}
                      has been sent to{" "}
                      <span className="font-medium text-charcoal">{email}</span>
                    </>
                  ) : (
                    " is on its way to your inbox"
                  )}
                  .
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 bg-charcoal text-white text-[10px] font-bold uppercase tracking-widest px-8 py-4 rounded-full hover:bg-black transition-all"
                >
                  <Package className="w-4 h-4" /> View My Orders
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 text-charcoal/70 text-[10px] font-bold uppercase tracking-widest px-8 py-4 rounded-full border border-charcoal/15 hover:border-gold/40 hover:text-charcoal transition-all"
                >
                  Continue Shopping <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {cleared && (
                <p className="mt-10 text-[10px] uppercase tracking-widest text-charcoal/30 font-medium">
                  Your cart has been cleared
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <main className="flex-1 min-h-[80vh] flex items-center justify-center bg-warm-white pt-32 pb-24">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </main>
          <Footer />
        </>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
