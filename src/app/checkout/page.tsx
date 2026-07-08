"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MoqProgress } from "@/components/b2b/moq-progress";
import { WholesaleTrustBar } from "@/components/b2b/wholesale-trust-bar";
import { useCart } from "@/lib/cart-context";
import { isAuthEnabled } from "@/lib/auth/client";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { calculateLineTotal, calculateWholesaleTotals } from "@/lib/b2b/pricing";
import { validateCartMOQ } from "@/lib/b2b/validation";
import { buildPaymentHelpUrl, buildWholesaleWhatsAppUrl } from "@/lib/b2b/whatsapp";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice } from "@/lib/commerce/catalog";
import {
  trackBeginWhatsappOrder,
  trackEvent,
  trackMoqBlockedCheckout,
} from "@/lib/analytics";

type BuyerForm = {
  buyerName: string;
  businessName: string;
  businessType: string;
  city: string;
  whatsappPhone: string;
  email: string;
  gstin: string;
  wantsGstInvoice: boolean;
  buyerReference: string;
  accountSource: "anonymous_checkout" | "checkout_form" | "wholesale_profile";
};

type WholesaleProfileBuyer = {
  email?: string;
  name?: string;
  businessName?: string;
  businessType?: string;
  city?: string;
  phone?: string;
  gstin?: string;
  buyerReference?: string;
  accountSource?: "anonymous_checkout" | "checkout_form" | "wholesale_profile";
};

type RazorpayResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  notes?: Record<string, string>;
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
};

type CommerceCheckoutResponse = {
  ok?: boolean;
  orderId?: string;
  reason?: string;
  error?: string;
};

type RazorpayVerifyResponse = {
  ok?: boolean;
  verified?: boolean;
  error?: string;
  message?: string;
  paymentId?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const initialBuyer: BuyerForm = {
  buyerName: "",
  businessName: "",
  businessType: "",
  city: "",
  whatsappPhone: "",
  email: "",
  gstin: "",
  wantsGstInvoice: true,
  buyerReference: "",
  accountSource: "checkout_form",
};

export default function CheckoutPage() {
  const { items } = useCart();
  const [buyer, setBuyer] = useState<BuyerForm>(initialBuyer);
  const [status, setStatus] = useState("");
  const [loadingPayment, setLoadingPayment] = useState(false);
  const totals = calculateWholesaleTotals(items);
  const moq = validateCartMOQ(items);

  const updateBuyer = <K extends keyof BuyerForm>(
    key: K,
    value: BuyerForm[K],
  ) => setBuyer((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!isAuthEnabled) return;

    fetch("/api/wholesale-profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { buyer?: WholesaleProfileBuyer | null } | null) => {
        const profileBuyer = data?.buyer;
        if (!profileBuyer) return;

        setBuyer((current) => ({
          ...current,
          businessName: current.businessName || profileBuyer.businessName || "",
          businessType: current.businessType || profileBuyer.businessType || "",
          city: current.city || profileBuyer.city || "",
          whatsappPhone: current.whatsappPhone || profileBuyer.phone || "",
          gstin: current.gstin || profileBuyer.gstin || "",
          buyerReference: current.buyerReference || profileBuyer.buyerReference || "",
          accountSource: profileBuyer.accountSource || "wholesale_profile",
        }));
      })
      .catch(() => {});
  }, []);
  const buyerInfo = {
    buyerName: buyer.buyerName,
    businessName: buyer.businessName,
    city: buyer.city,
    whatsappPhone: buyer.whatsappPhone,
    email: buyer.email,
    gstin: buyer.gstin,
    wantsGstInvoice: buyer.wantsGstInvoice,
    shippingCity: buyer.city,
  };

  const beginWhatsappOrder = () => {
    if (!moq.ok) {
      trackMoqBlockedCheckout({
        total_sets: moq.totalSets,
        remaining_sets: moq.remainingSets,
        source: "checkout_page",
      });
      setStatus(`You need ${moq.remainingSets} more sets to place a wholesale order.`);
      return;
    }
    trackBeginWhatsappOrder({
      total_sets: totals.totalSets,
      total_pieces: totals.totalPieces,
      value: totals.subtotal,
      source: "checkout_page",
    });
    window.location.href = buildWholesaleWhatsAppUrl(items, buyerInfo);
  };

  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function createCommerceCheckoutDraft(): Promise<string | null> {
    const res = await fetch("/api/commerce/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...buyer, items }),
    });
    const data = (await res.json().catch(() => ({}))) as CommerceCheckoutResponse;

    if (res.ok && data.ok && data.orderId) {
      setStatus("Wholesale cart reserved in Medusa. Starting secure payment...");
      return data.orderId;
    }

    if (res.status === 409 || res.status === 501 || res.status === 424) {
      setStatus(
        data.reason ||
          "Medusa cart is not available for this order yet. Continuing with Razorpay/WhatsApp fallback.",
      );
      return null;
    }

    if (!res.ok) {
      throw new Error(data.error || data.reason || "Could not prepare wholesale checkout.");
    }

    return null;
  }

  async function verifyRazorpayPayment(
    response: RazorpayResponse,
    medusaCartId: string | null,
    intentToken: string,
  ): Promise<RazorpayVerifyResponse> {
    const res = await fetch("/api/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...response,
        medusaCartId,
        intentToken,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as RazorpayVerifyResponse;

    if (!res.ok || !data.ok || !data.verified) {
      throw new Error(
        data.error ||
          "Payment was received by Razorpay, but server verification failed. Please contact us on WhatsApp before dispatch.",
      );
    }

    return data;
  }

  async function beginRazorpayPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    if (!moq.ok) {
      setStatus(`You need ${moq.remainingSets} more sets to place a wholesale order.`);
      trackMoqBlockedCheckout({
        total_sets: moq.totalSets,
        remaining_sets: moq.remainingSets,
        source: "razorpay_checkout",
      });
      return;
    }

    setLoadingPayment(true);
    try {
      const medusaCartId = await createCommerceCheckoutDraft();
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buyer, items, medusaCartId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        error?: string;
        message?: string;
        intentToken?: string;
      };

      if (!res.ok) throw new Error(data.error || "Could not start Razorpay payment.");
      if (!data.configured) {
        setStatus(data.message || "Razorpay is not configured. Confirm on WhatsApp for a payment link.");
        return;
      }
      if (!data.keyId || !data.orderId || !data.amount || !data.intentToken) {
        throw new Error("Razorpay order response is incomplete.");
      }
      const intentToken = data.intentToken;

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Razorpay checkout could not load. Please use WhatsApp payment help.");
      }

      trackEvent("begin_razorpay_checkout", {
        total_sets: totals.totalSets,
        total_pieces: totals.totalPieces,
        value: totals.subtotal,
      });

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "Rangat Pehnawa",
        description: `${totals.totalSets} set wholesale order`,
        order_id: data.orderId,
        prefill: {
          name: buyer.buyerName || buyer.businessName,
          contact: buyer.whatsappPhone,
        },
        notes: {
          business_name: buyer.businessName,
          city: buyer.city,
          total_sets: String(totals.totalSets),
          ...(medusaCartId ? { medusa_cart_id: medusaCartId } : {}),
        },
        theme: { color: "#C9A96E" },
        handler: async (response) => {
          setLoadingPayment(true);
          setStatus("Payment received by Razorpay. Verifying signature...");
          try {
            const verified = await verifyRazorpayPayment(
              response,
              medusaCartId,
              intentToken,
            );
            setStatus(
              verified.message ||
                `Payment verified. Payment ID: ${verified.paymentId || response.razorpay_payment_id || "received"}. We will confirm dispatch details on WhatsApp.`,
            );
          } catch (error) {
            setStatus(
              error instanceof Error
                ? error.message
                : "Payment verification failed. Please contact us on WhatsApp before dispatch.",
            );
          } finally {
            setLoadingPayment(false);
          }
        },
        modal: {
          ondismiss: () => setStatus("Payment window closed. You can retry or ask for a Razorpay payment link on WhatsApp."),
        },
      });
      checkout.open();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payment could not start.");
    } finally {
      setLoadingPayment(false);
    }
  }

  async function placeCodOrder() {
    setStatus("");
    if (!moq.ok) {
      setStatus(`You need ${moq.remainingSets} more sets to place a wholesale order.`);
      trackMoqBlockedCheckout({
        total_sets: moq.totalSets,
        remaining_sets: moq.remainingSets,
        source: "cod_checkout",
      });
      return;
    }

    setLoadingPayment(true);
    try {
      const medusaCartId = await createCommerceCheckoutDraft();
      if (!medusaCartId) {
        throw new Error(
          "Could not reserve a Medusa cart for this order. Please confirm on WhatsApp.",
        );
      }

      setStatus("Placing your wholesale order (Cash on Delivery)...");
      const res = await fetch("/api/commerce/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: medusaCartId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        orderId?: string;
        displayId?: number;
        message?: string;
        reason?: string;
      };

      if (!res.ok || !data.ok || !data.orderId) {
        throw new Error(
          data.reason ||
            "Order could not be completed. Please confirm on WhatsApp before dispatch.",
        );
      }

      trackEvent("place_cod_order", {
        total_sets: totals.totalSets,
        total_pieces: totals.totalPieces,
        value: totals.subtotal,
        order_id: data.orderId,
      });
      setStatus(
        data.message ||
          `Order #${data.displayId ?? data.orderId} placed. We will confirm dispatch on WhatsApp.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Order could not be placed.",
      );
    } finally {
      setLoadingPayment(false);
    }
  }

  const medusaBackend = process.env.NEXT_PUBLIC_COMMERCE_BACKEND === "medusa";

  return (
    <div className="flex min-h-screen flex-col bg-warm-white text-charcoal font-sans">
      <Navbar />
      <main className="flex-1 pt-28 lg:pt-36 pb-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
          <header className="mb-10 border-b border-charcoal/10 pb-8">
            <p className="eyebrow mb-3">Wholesale Checkout</p>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-serif text-4xl font-light tracking-tight sm:text-5xl lg:text-6xl">
                  Confirm order, then pay securely.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-charcoal/55">
                  WhatsApp confirmation is always available. Razorpay checkout
                  works when payment keys are configured, while mock/keyless
                  mode falls back cleanly to a payment-link request.
                </p>
              </div>
              <a href={buildPaymentHelpUrl()} className="btn-luxe-outline w-fit">
                Payment Help <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>
          </header>

          <WholesaleTrustBar className="mb-10" />

          {items.length === 0 ? (
            <section className="mx-auto max-w-2xl border border-charcoal/10 bg-white px-6 py-20 text-center frame-luxe">
              <ShoppingBag className="mx-auto mb-6 h-10 w-10 text-charcoal/25" strokeWidth={1} />
              <p className="eyebrow eyebrow--bare mb-3">No Sets Yet</p>
              <h2 className="font-serif text-4xl font-light">
                Build a wholesale cart before checkout.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-charcoal/55">
                MOQ starts at {B2B_CONFIG.minimumOrderSets} sets. Add styles
                from the catalog or use the bulk linesheet for faster entry.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/shop" className="btn-luxe">Open Catalog</Link>
                <Link href="/bulk-order" className="btn-luxe-outline">Bulk Order</Link>
              </div>
            </section>
          ) : (
            <div className="grid gap-10 lg:grid-cols-12">
              <section className="lg:col-span-7">
                <div className="border border-charcoal/10 bg-white">
                  <div className="border-b border-charcoal/10 p-6">
                    <p className="eyebrow eyebrow--bare mb-2">Order Summary</p>
                    <h2 className="font-serif text-3xl font-light">
                      {totals.totalSets} sets / {totals.totalPieces} pieces
                    </h2>
                  </div>
                  <div className="divide-y divide-charcoal/10">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 sm:p-6">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-warm-gray">
                          <Image src={item.image} alt={item.title} fill className="object-cover" sizes="80px" />
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold-dark">
                                {getStyleCode(item)}
                              </p>
                              <h3 className="font-serif text-xl text-charcoal">
                                {item.title}
                              </h3>
                            </div>
                            <p className="font-serif text-lg text-charcoal">
                              {formatPrice(calculateLineTotal(item, totals.totalSets))}
                            </p>
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal/45">
                            {item.quantity} sets - {item.quantity * B2B_CONFIG.setSize} pcs - {SIZE_RATIO_LABEL}
                          </p>
                          <p className="text-xs text-charcoal/50">
                            {formatPrice(item.salePrice ?? item.price)}/set
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="lg:col-span-5">
                <form onSubmit={beginRazorpayPayment} className="sticky top-32 space-y-6">
                  <div className="border border-charcoal/10 bg-charcoal p-6 text-warm-white sm:p-8 frame-luxe">
                    <p className="eyebrow eyebrow--bare mb-2">MOQ & Tier</p>
                    <h2 className="font-serif text-3xl font-light">
                      {totals.appliedTier?.label || "MOQ pending"}
                    </h2>
                    <div className="mt-6">
                      <MoqProgress totals={totals} tone="dark" />
                    </div>
                    <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                      <Summary label="Base subtotal" value={formatPrice(totals.baseSubtotal)} />
                      <Summary label="Savings" value={`${totals.discountPercent}% / ${formatPrice(totals.discountAmount)}`} />
                      <Summary label="Final total" value={formatPrice(totals.subtotal)} strong />
                    </div>
                  </div>

                  <div className="border border-charcoal/10 bg-white p-6 sm:p-8">
                    <p className="eyebrow mb-4">Buyer Details</p>
                    <div className="grid gap-5">
                      <Field label="Buyer name" value={buyer.buyerName} onChange={(value) => updateBuyer("buyerName", value)} />
                      <Field label="Business name" value={buyer.businessName} onChange={(value) => updateBuyer("businessName", value)} />
                      <Field label="City" value={buyer.city} onChange={(value) => updateBuyer("city", value)} />
                      <Field label="WhatsApp phone" value={buyer.whatsappPhone} onChange={(value) => updateBuyer("whatsappPhone", value)} />
                      <Field label="Email" type="email" value={buyer.email} onChange={(value) => updateBuyer("email", value)} />
                      <Field label="GSTIN optional" value={buyer.gstin} onChange={(value) => updateBuyer("gstin", value)} />
                      <label className="flex items-center gap-3 text-xs text-charcoal/60">
                        <input
                          type="checkbox"
                          checked={buyer.wantsGstInvoice}
                          onChange={(event) => updateBuyer("wantsGstInvoice", event.target.checked)}
                          className="h-4 w-4 accent-charcoal"
                        />
                        GST invoice required
                      </label>
                    </div>

                    {status && (
                      <p className="mt-6 border border-gold/30 border-l-2 border-l-gold bg-warm-white px-4 py-3 text-xs leading-relaxed text-charcoal/65">
                        {status}
                      </p>
                    )}

                    <div className="mt-8 grid gap-3">
                      <button
                        type="submit"
                        disabled={loadingPayment || !moq.ok}
                        className="btn-luxe disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {loadingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Pay with Razorpay
                      </button>
                      {medusaBackend && (
                        <button
                          type="button"
                          onClick={placeCodOrder}
                          disabled={loadingPayment || !moq.ok}
                          className="btn-luxe-outline disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {loadingPayment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShoppingBag className="h-3.5 w-3.5" />
                          )}
                          Place order (Cash on Delivery)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={beginWhatsappOrder}
                        className="btn-luxe-outline"
                      >
                        Confirm on WhatsApp <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-luxe"
      />
    </div>
  );
}

function Summary({
  label,
  value,
  strong,
}: {
  label: string;
  type?: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
        {label}
      </span>
      <span className={strong ? "font-serif text-3xl text-white" : "font-serif text-lg text-white/80"}>
        {value}
      </span>
    </div>
  );
}
