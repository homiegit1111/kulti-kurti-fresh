"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, ArrowRight, Mail, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";
import { buildPaymentHelpUrl } from "@/lib/b2b/whatsapp";

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

  const orderLabel = orderName
    ? orderName.startsWith("#")
      ? orderName
      : `#${orderName}`
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />
      <main className="flex-1 pt-28 pb-24 lg:pt-36">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <div className="border border-line/20 bg-surface-2">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left: editorial headline */}
              <div className="border-b border-line/20 px-6 py-14 sm:px-10 lg:border-b-0 lg:border-r lg:py-20">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center border ${
                      confirmed
                        ? "border-line bg-accent-lime"
                        : "border-line/25 bg-transparent"
                    }`}
                  >
                    <CheckCircle2
                      className="h-5 w-5 text-content"
                      strokeWidth={1.5}
                    />
                  </span>
                  <p className="eyebrow eyebrow--bare">
                    {confirmed
                      ? "Wholesale order confirmed"
                      : "Wholesale confirmation pending"}
                  </p>
                </div>

                <h1 className="mt-8 text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                  {confirmed ? (
                    <>
                      Wholesale order
                      <br />
                      placed
                    </>
                  ) : (
                    <>
                      Wholesale order
                      <br />
                      pending
                    </>
                  )}
                </h1>

                <p className="mt-8 max-w-md text-sm leading-6 text-content/60">
                  {orderName
                    ? "Your wholesale order has been logged and is now being prepared for dispatch coordination."
                    : confirmed
                      ? "Your wholesale order has been confirmed and is now being prepared for dispatch coordination."
                      : "Open checkout or WhatsApp to confirm this wholesale order before we reserve stock or clear your cart."}
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href={confirmed ? "/account" : "/checkout"} className="btn-luxe">
                    <Package className="h-3.5 w-3.5" />
                    {confirmed ? "View buyer account" : "Return to checkout"}
                  </Link>
                  {!confirmed && (
                    <a href={buildPaymentHelpUrl()} className="btn-luxe-outline">
                      Payment help on WhatsApp <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Link href="/shop" className="btn-luxe-outline">
                    Back to catalog <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right: detail ledger */}
              <div className="bg-surface-inverse px-6 py-14 text-content-inverse sm:px-10 lg:py-20">
                <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-lime">
                  Order details
                </p>

                <div className="mt-8 divide-y divide-content-inverse/15 border-t border-content-inverse/20">
                  <DetailRow
                    label="Status"
                    value={confirmed ? "Confirmed" : "Pending"}
                    accent={confirmed}
                  />
                  {orderLabel && (
                    <DetailRow label="Order" value={orderLabel} />
                  )}
                  {paymentId && (
                    <DetailRow label="Payment ID" value={paymentId} />
                  )}
                  {medusaOrderId && (
                    <DetailRow label="Order ref" value={medusaOrderId} />
                  )}
                  {email && <DetailRow label="Buyer email" value={email} />}
                </div>

                {confirmed && (
                  <div className="mt-8 flex items-start gap-2 text-xs leading-6 text-content-inverse/55">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      A wholesale confirmation email
                      {email ? (
                        <>
                          {" "}
                          has been sent to{" "}
                          <span className="font-semibold text-content-inverse">
                            {email}
                          </span>
                        </>
                      ) : (
                        " is on its way to your inbox"
                      )}
                      .
                    </span>
                  </div>
                )}

                {confirmed && cleared && (
                  <p className="mt-10 text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/35">
                    Your cart has been cleared
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-4">
      <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
        {label}
      </span>
      <span
        className={`break-all text-right text-sm font-bold tracking-tight ${
          accent ? "text-accent-lime" : "text-content-inverse"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-surface">
          <Navbar />
          <main className="flex flex-1 items-center justify-center pt-32 pb-24">
            <div className="h-8 w-8 animate-spin border-2 border-line border-t-transparent" />
          </main>
          <Footer />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
