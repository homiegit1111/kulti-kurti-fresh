"use client";

import { useEffect, useState, useId, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
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

// ── Validation regexes ──────────────────────────────────────────────────────
//
// WhatsApp phone: optional +91 / 91 / 0 prefix (with optional spaces/dashes),
// followed by exactly 10 digits where the first digit is 6-9.
const PHONE_RE = /^(?:\+91[-\s]?|91[-\s]?|0)?[6-9]\d{9}$/;

// GSTIN: 2-digit state code (01-38) + 5 uppercase letters + 4 digits + 1
// uppercase letter (PAN pattern) + 1 alphanumeric + literal "Z" + 1
// alphanumeric. Total: 15 characters, always uppercase.
// State code digits: first digit 0-3, second digit 0-9 (covers 01-38).
const GSTIN_RE = /^[0-3]\d[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

// Email: RFC-friendly permissive pattern — local@domain.tld.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Validator helpers ────────────────────────────────────────────────────────
function validatePhone(v: string): string {
  if (!v) return "";
  return PHONE_RE.test(v.replace(/[\s\-]/g, ""))
    ? ""
    : "Enter a 10-digit mobile number";
}

function validateGstin(v: string): string {
  if (!v) return "";
  return GSTIN_RE.test(v) ? "" : "GSTIN looks off — expected 15 characters like 29ABCDE1234F1Z5";
}

function validateEmail(v: string): string {
  if (!v) return "";
  return EMAIL_RE.test(v) ? "" : "Check the email format";
}

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
      .then((raw) => {
        const data = raw as { buyer?: WholesaleProfileBuyer | null } | null;
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
    window.location.assign(buildWholesaleWhatsAppUrl(items, buyerInfo));
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
        theme: { color: "#121310" },
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
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />
      <main className="flex-1 pt-28 pb-24 lg:pt-36">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <motion.header
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 border-b-2 border-line pb-8"
          >
            <p className="eyebrow mb-4">Wholesale checkout</p>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-[clamp(3rem,9vw,7rem)] font-black uppercase leading-[0.82] tracking-[-0.06em]">
                  Checkout
                </h1>
                <p className="mt-6 max-w-2xl text-sm leading-6 text-content/60">
                  WhatsApp confirmation is always available. Razorpay checkout
                  works when payment keys are configured, while mock/keyless
                  mode falls back cleanly to a payment-link request.
                </p>
              </div>
              <a href={buildPaymentHelpUrl()} className="btn-luxe-outline w-fit">
                Payment help <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.header>

          <WholesaleTrustBar className="mb-10" />

          {items.length === 0 ? (
            <section className="mx-auto max-w-2xl border border-line/20 bg-surface-2 px-6 py-20 text-center">
              <ShoppingBag className="mx-auto mb-6 h-10 w-10 text-content/30" strokeWidth={1} />
              <p className="eyebrow eyebrow--bare mb-4 justify-center">No sets yet</p>
              <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-black uppercase leading-[0.85] tracking-[-0.05em]">
                Build a cart
                <br />
                before checkout
              </h2>
              <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-content/60">
                MOQ starts at {B2B_CONFIG.minimumOrderSets} sets. Add styles
                from the catalog or use the bulk linesheet for faster entry.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/shop" className="btn-luxe">Open catalog</Link>
                <Link href="/bulk-order" className="btn-luxe-outline">Bulk order</Link>
              </div>
            </section>
          ) : (
            <div className="grid gap-10 lg:grid-cols-12">
              <section className="lg:col-span-7">
                <div className="border border-line/20 bg-surface-2">
                  <div className="flex items-baseline justify-between gap-4 border-b border-line/20 p-6">
                    <div>
                      <p className="eyebrow eyebrow--bare mb-3">Order summary</p>
                      <h2 className="text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em] sm:text-4xl">
                        {totals.totalSets} sets
                      </h2>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">
                      {totals.totalPieces} pieces
                    </p>
                  </div>
                  <div className="divide-y divide-line/15">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 sm:p-6">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-[#d4d0c5]">
                          <Image src={item.image} alt={item.title} fill className="object-cover" sizes="80px" />
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-red">
                                {getStyleCode(item)}
                              </p>
                              <h3 className="mt-1 text-lg font-bold leading-tight tracking-[-0.02em] text-content">
                                {item.title}
                              </h3>
                            </div>
                            <p className="text-lg font-black tracking-[-0.02em] text-content">
                              {formatPrice(calculateLineTotal(item, totals.totalSets))}
                            </p>
                          </div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content/45">
                            {item.quantity} sets - {item.quantity * B2B_CONFIG.setSize} pcs - {SIZE_RATIO_LABEL}
                          </p>
                          <p className="text-xs text-content/55">
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
                  <div className="border border-line/20 bg-surface-inverse p-6 text-content-inverse sm:p-8">
                    <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-lime">
                      Order status
                    </p>
                    <h2 className="mt-3 text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                      {moq.ok ? "Ready to order" : "MOQ pending"}
                    </h2>
                    <div className="mt-6">
                      <MoqProgress totals={totals} tone="dark" />
                    </div>
                    <div className="mt-8 space-y-3 border-t border-content-inverse/20 pt-6">
                      {totals.discountAmount > 0 && (
                        <>
                          <Summary
                            label="Gross"
                            value={formatPrice(totals.baseSubtotal)}
                          />
                          <Summary
                            label={`Tier discount ${totals.discountPercent}%`}
                            value={`−${formatPrice(totals.discountAmount)}`}
                          />
                        </>
                      )}
                      <Summary label="Final total" value={formatPrice(totals.subtotal)} strong />
                    </div>
                  </div>

                  <div className="border border-line/20 bg-surface-2 p-6 sm:p-8">
                    <p className="eyebrow mb-6">Buyer details</p>
                    <div className="grid gap-5">
                      <Field label="Buyer name" value={buyer.buyerName} onChange={(value) => updateBuyer("buyerName", value)} />
                      <Field label="Business name" value={buyer.businessName} onChange={(value) => updateBuyer("businessName", value)} />
                      <Field label="City" value={buyer.city} onChange={(value) => updateBuyer("city", value)} />
                      <Field
                        label="WhatsApp phone"
                        value={buyer.whatsappPhone}
                        onChange={(value) => updateBuyer("whatsappPhone", value)}
                        validate={validatePhone}
                      />
                      <Field
                        label="Email"
                        type="email"
                        value={buyer.email}
                        onChange={(value) => updateBuyer("email", value)}
                        validate={validateEmail}
                      />
                      <Field
                        label="GSTIN optional"
                        value={buyer.gstin}
                        onChange={(value) => {
                          const upped = value.toUpperCase();
                          updateBuyer("gstin", upped);
                          return upped;
                        }}
                        validate={validateGstin}
                      />
                      <label className="flex items-center gap-3 text-xs text-content/60">
                        <input
                          type="checkbox"
                          checked={buyer.wantsGstInvoice}
                          onChange={(event) => updateBuyer("wantsGstInvoice", event.target.checked)}
                          className="h-4 w-4 accent-[#121310]"
                        />
                        GST invoice required
                      </label>
                    </div>

                    {status && (
                      <p className="mt-6 border border-line/20 border-l-2 border-l-accent-red bg-surface px-4 py-3 text-xs leading-6 text-content/65">
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

// ── Field component ──────────────────────────────────────────────────────────
//
// Backward-compatible: all existing call sites (label/type/value/onChange only)
// continue to work unchanged. Optional `validate` prop enables the touched-field
// inline validation pattern:
//   - Validates on blur (first touch).
//   - Re-validates on every subsequent change once the field has been touched.
//   - Never validates on the very first keystroke.
//   - onChange may return a transformed string (e.g. uppercased) so the
//     controlled input stays in sync without a double-setState cycle.
function Field({
  label,
  type = "text",
  value,
  onChange,
  validate,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => string | void;
  validate?: (value: string) => string;
}) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const msgId = useId();

  // Derive what to actually display in the input. When onChange returns a
  // transformed string (e.g. uppercased GSTIN) we want the input to show that
  // transformed value, not the raw keystroke. The parent state holds it; we
  // just read `value` from props on the next render.
  const handleChange = (raw: string) => {
    const next = onChange(raw) ?? raw;
    if (touched && validate) {
      setError(validate(next));
    }
  };

  const handleBlur = () => {
    if (!touched) setTouched(true);
    if (validate) {
      setError(validate(value));
    }
  };

  const isValid = touched && validate !== undefined && error === "" && value !== "";

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={handleBlur}
          className={[
            "field-luxe pr-6",
            touched && error
              ? "border-b-accent-red focus:border-b-accent-red focus:shadow-[0_2px_0_0_var(--color-accent-red)]"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={touched && !!error ? "true" : undefined}
          aria-describedby={touched && error ? msgId : undefined}
        />
        {/* Lime valid tick — only shown when touched, non-empty, and passes validation */}
        {isValid && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-1 w-1 rounded-none bg-accent-lime"
            title="Valid"
          />
        )}
      </div>
      {/* Error message — visually 11px, micro-label voice, red */}
      {touched && error && (
        <p
          id={msgId}
          role="alert"
          className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-red"
        >
          {error}
        </p>
      )}
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
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content-inverse/45">
        {label}
      </span>
      <span
        className={
          strong
            ? "text-3xl font-black tracking-[-0.03em] text-accent-lime"
            : "text-lg font-bold tracking-[-0.02em] text-content-inverse/80"
        }
      >
        {value}
      </span>
    </div>
  );
}
