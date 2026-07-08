"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, ArrowRight, Mail } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";

/**
 * Post-payment confirmation page.
 *
 * The cart is cleared only after a payment/order system returns an explicit
 * confirmation marker. A direct page visit must not drop a buyer's draft cart.
 */
function OrderConfirmationContent() {
  const params = useSearchParams();
  const { clearCart } = useCart();
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);

  // Read common return params from a payment or order system.
  const orderName =
    params.get("order") ||
    params.get("order_name") ||
    params.get("order_number") ||
    "";
  const email = params.get("email") || "";
  const paymentId =
    params.get("payment_id") || params.get("razorpay_payment_id") || "";
  const medusaOrderId = params.get("medusa_order_id") || "";
  const confirmed =
    params.get("confirmed") === "true" ||
    Boolean(orderName || paymentId || medusaOrderId);

  useEffect(() => {
    // Guard against double-invocation (React strict mode) clearing twice.
    if (!confirmed) return;
    if (clearedRef.current) return;
    clearedRef.current = true;
    clearCart();
    setCleared(true);
  }, [clearCart, confirmed]);

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-warm-white pt-32 pb-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="panel-luxe frame-luxe overflow-hidden">
            <div className="h-1 bg-gold" />
            <div className="px-8 py-12 lg:px-12 lg:py-16 text-center">
              <div className="w-20 h-20 rounded-full border border-gold/40 flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-9 h-9 text-gold-dark" strokeWidth={1} />
              </div>

              <p className="eyebrow eyebrow--bare mb-4">
                {confirmed ? "Wholesale order confirmed" : "Wholesale confirmation pending"}
              </p>
              <h1 className="font-serif text-4xl lg:text-5xl font-light text-charcoal mb-6">
                {confirmed ? "Your order is " : "Confirmation "}
                <span className="italic">{confirmed ? "confirmed" : "pending"}</span>
              </h1>

              {orderName ? (
                <p className="text-charcoal/70 font-sans text-sm leading-relaxed max-w-md mx-auto mb-2">
                  Order{" "}
                  <span className="font-semibold text-charcoal">
                    {orderName.startsWith("#") ? orderName : `#${orderName}`}
                  </span>{" "}
                  has been confirmed successfully.
                </p>
              ) : (
                <p className="text-charcoal/70 font-sans text-sm leading-relaxed max-w-md mx-auto mb-2">
                  {confirmed
                    ? "Your wholesale order has been confirmed and is now being prepared for dispatch coordination."
                    : "Open checkout or WhatsApp to confirm this wholesale order before we reserve stock or clear your cart."}
                </p>
              )}

              {confirmed && (
                <div className="flex items-center justify-center gap-2 text-charcoal/60 text-xs mb-10">
                  <Mail className="w-3.5 h-3.5" />
                  <span>
                    A wholesale confirmation email
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
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href={confirmed ? "/account" : "/checkout"}
                  className="btn-luxe"
                >
                  <Package className="w-3.5 h-3.5" />
                  {confirmed ? "View Buyer Account" : "Return to Checkout"}
                </Link>
                <Link
                  href="/shop"
                  className="btn-luxe-outline"
                >
                  Back to Catalog <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {confirmed && cleared && (
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