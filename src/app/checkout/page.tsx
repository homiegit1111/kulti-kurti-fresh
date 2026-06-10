"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CreditCard, Lock, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/shopify";
import { updateCartBuyerIdentity } from "@/lib/shopify-cart";

type Step = "shipping" | "payment" | "confirmation";

export default function CheckoutPage() {
  const {
    items,
    itemCount,
    subtotal,
    total,
    cartId,
    checkoutUrl,
    shopifyCartEnabled,
  } = useCart();

  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (checkoutUrl) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        window.location.href = checkoutUrl;
      }, 0);
      return () => clearTimeout(timer);
    }

    // Safety net: If we arrived here but checkoutUrl is missing, try to regenerate it!
    if (items.length > 0 && shopifyCartEnabled) {
      let isMounted = true;
      const timer = setTimeout(() => {
        setIsRedirecting(true);
      }, 0);
      import("@/lib/shopify-cart").then(({ createCart }) => {
        const lines = items
          .filter((i) => i.variantId)
          .map((i) => ({
            merchandiseId: i.variantId!,
            quantity: i.quantity,
            attributes: [
              { key: "Size", value: i.size },
              { key: "Color", value: i.color },
            ],
          }));

        if (lines.length > 0) {
          createCart(lines)
            .then((cart) => {
              if (isMounted && cart?.checkoutUrl) {
                window.location.href = cart.checkoutUrl;
              } else if (isMounted) {
                setIsRedirecting(false); // Fallback to custom form if it fails
              }
            })
            .catch(() => {
              if (isMounted) setIsRedirecting(false);
            });
        } else {
          if (isMounted) setIsRedirecting(false);
        }
      });
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [checkoutUrl, items, shopifyCartEnabled]);

  const [currentStep, setCurrentStep] = useState<Step>("shipping");
  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preparedCheckoutUrl, setPreparedCheckoutUrl] = useState<string | null>(
    null,
  );

  const steps: { key: Step; label: string; number: number }[] = [
    { key: "shipping", label: "Shipping", number: 1 },
    { key: "payment", label: "Payment", number: 2 },
    { key: "confirmation", label: "Confirmation", number: 3 },
  ];

  const formatIndianPhone = (phone: string) => {
    const trimmed = phone.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("+")) return trimmed;
    const digits = trimmed.replace(/\D/g, "");
    return digits.length === 10 ? `+91${digits}` : `+${digits}`;
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Prefill Shopify checkout with the contact + delivery details entered here.
    // Shopify checkout remains the source of truth if the customer edits them there.
    if (shopifyCartEnabled && cartId && shippingInfo.email) {
      const updatedCart = await updateCartBuyerIdentity(cartId, {
        email: shippingInfo.email,
        phone: formatIndianPhone(shippingInfo.phone),
        countryCode: "IN",
        address: {
          firstName: shippingInfo.firstName,
          lastName: shippingInfo.lastName,
          phone: formatIndianPhone(shippingInfo.phone),
          address1: shippingInfo.address,
          city: shippingInfo.city,
          province: shippingInfo.state,
          zip: shippingInfo.pincode,
          country: "India",
        },
      });

      if (updatedCart?.checkoutUrl) {
        setPreparedCheckoutUrl(updatedCart.checkoutUrl);
      }
    }

    setIsSubmitting(false);
    setCurrentStep("payment");
  };

  /**
   * Shopify checkout — redirect to Shopify's hosted checkout page.
   * Shopify handles payment, shipping, taxes, confirmation email, order creation.
   */
  const handleShopifyCheckout = () => {
    const url = preparedCheckoutUrl || checkoutUrl;
    if (url) {
      window.location.href = url;
    }
  };

  if (items.length === 0 && !isRedirecting) {
    return (
      <>
        <Navbar />
        <main className="min-h-[70vh] flex flex-col items-center justify-center pt-32 pb-20 px-6 bg-warm-white text-center">
          <div className="w-20 h-20 rounded-full border border-gold/40 flex items-center justify-center mb-8">
            <ShoppingBag className="w-7 h-7 text-charcoal/40" strokeWidth={1} />
          </div>
          <h3 className="font-serif text-3xl md:text-4xl font-light text-charcoal mb-4">
            Your cart is <span className="italic">empty</span>
          </h3>
          <p className="text-sm text-charcoal/50 mb-10 max-w-md leading-relaxed">
            Looks like you haven&apos;t added any beautiful pieces to your
            wardrobe yet.
          </p>
          <Link href="/shop" className="btn-luxe group">
            <span>Explore Collection</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  if (isRedirecting) {
    return (
      <>
        <Navbar />
        <main className="min-h-[70vh] flex flex-col items-center justify-center pt-32 pb-20 px-6">
          <div className="w-12 h-12 border border-gold/30 border-t-gold rounded-full animate-spin mb-8"></div>
          <h1 className="font-serif text-3xl font-light text-charcoal mb-3">
            Taking you to <span className="italic">Secure Checkout</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Please wait while we redirect you to Shopify.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 relative z-10 bg-warm-white pt-28 lg:pt-32 pb-24">
        <div className="px-6 lg:px-20 max-w-6xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-16">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 border flex items-center justify-center text-[11px] font-semibold transition-colors duration-300 ${
                      currentStep === step.key
                        ? "bg-charcoal border-charcoal text-white"
                        : steps.findIndex((s) => s.key === currentStep) > idx
                          ? "border-gold text-gold-dark"
                          : "border-charcoal/15 text-charcoal/35"
                    }`}
                  >
                    {steps.findIndex((s) => s.key === currentStep) > idx ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.22em] font-bold hidden sm:inline ${
                      currentStep === step.key
                        ? "text-charcoal"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-14 h-px bg-charcoal/15" />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {currentStep === "shipping" && (
                  <motion.form
                    key="shipping"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleShippingSubmit}
                    className="space-y-8"
                  >
                    <div className="mb-10">
                      <p className="eyebrow mb-3">Step One</p>
                      <h2 className="font-serif text-3xl md:text-4xl font-light text-charcoal">
                        Shipping <span className="italic">Details</span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="field-label">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingInfo.firstName}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              firstName: e.target.value,
                            })
                          }
                          className="field-luxe"
                        />
                      </div>
                      <div>
                        <label className="field-label">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingInfo.lastName}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              lastName: e.target.value,
                            })
                          }
                          className="field-luxe"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="field-label">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={shippingInfo.email}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              email: e.target.value,
                            })
                          }
                          className="field-luxe"
                        />
                      </div>
                      <div>
                        <label className="field-label">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={shippingInfo.phone}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              phone: e.target.value,
                            })
                          }
                          className="field-luxe"
                          placeholder="+91"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="field-label">
                        Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.address}
                        onChange={(e) =>
                          setShippingInfo({
                            ...shippingInfo,
                            address: e.target.value,
                          })
                        }
                        className="field-luxe"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                      <div>
                        <label className="field-label">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingInfo.city}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              city: e.target.value,
                            })
                          }
                          className="field-luxe"
                        />
                      </div>
                      <div>
                        <label className="field-label">
                          State *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingInfo.state}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              state: e.target.value,
                            })
                          }
                          className="field-luxe"
                        />
                      </div>
                      <div>
                        <label className="field-label">
                          Pincode *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingInfo.pincode}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              pincode: e.target.value,
                            })
                          }
                          className="field-luxe"
                          pattern="[0-9]{6}"
                          maxLength={6}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-luxe w-full mt-10"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Continue to Payment</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {currentStep === "payment" && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="mb-10">
                      <p className="eyebrow mb-3">Step Two</p>
                      <h2 className="font-serif text-3xl md:text-4xl font-light text-charcoal">
                        Payment
                      </h2>
                    </div>

                    <div className="panel-luxe p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="h-5 w-5 text-gold" />
                        <p className="text-sm font-semibold text-charcoal">
                          Pay with Razorpay
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                        You will be redirected to Razorpay&apos;s secure payment
                        gateway to complete your purchase. We accept UPI,
                        Credit/Debit Cards, Net Banking, and Wallets.
                      </p>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {[
                          "UPI",
                          "Visa",
                          "Mastercard",
                          "RuPay",
                          "Net Banking",
                          "Wallets",
                        ].map((method) => (
                          <span
                            key={method}
                            className="inline-flex items-center border border-charcoal/15 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-charcoal"
                          >
                            {method}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <span>
                          Your payment information is encrypted and secure
                        </span>
                      </div>
                    </div>

                    {/* Shopify checkout notice */}
                    <div className="bg-white p-4 border border-gold/25 border-l-2 border-l-gold">
                      <div className="flex items-start gap-3">
                        <Lock className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Shipping, taxes, and final payment are handled
                          securely by Shopify. Clicking &quot;Pay with
                          Shopify&quot; will take you to the secure Shopify
                          checkout page.
                        </p>
                      </div>
                    </div>

                    {/* Shipping summary */}
                    <div className="panel-luxe p-8">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                        Shipping To
                      </p>
                      <p className="text-sm text-charcoal">
                        {shippingInfo.firstName} {shippingInfo.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {shippingInfo.address}, {shippingInfo.city},{" "}
                        {shippingInfo.state} - {shippingInfo.pincode}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {shippingInfo.email} • {shippingInfo.phone}
                      </p>
                      <button
                        onClick={() => setCurrentStep("shipping")}
                        className="link-luxe text-[10px] text-gold-dark font-bold uppercase tracking-[0.18em] mt-4"
                      >
                        Edit Address
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentStep("shipping")}
                        disabled={isSubmitting}
                        className="btn-luxe-outline"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                      <button
                        onClick={handleShopifyCheckout}
                        disabled={!(preparedCheckoutUrl || checkoutUrl)}
                        className="btn-luxe flex-1"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Pay with Shopify</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === "confirmation" && (
                  <motion.div
                    key="confirmation"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center mx-auto mb-8">
                      <Check className="h-7 w-7 text-gold-dark" strokeWidth={1} />
                    </div>
                    <h2 className="font-serif text-4xl font-light text-charcoal mb-4">
                      Order <span className="italic">Confirmed</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
                      Thank you for shopping with Rangat Pehnawa. Your order has
                      been placed successfully.
                    </p>
                    <p className="text-xs text-muted-foreground mb-8">
                      A confirmation email has been sent to {shippingInfo.email}
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Link
                        href="/shop"
                        className="btn-luxe"
                      >
                        Continue Shopping
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Order Summary Sidebar */}
            {currentStep !== "confirmation" && (
              <div className="lg:col-span-1">
                <div className="panel-luxe frame-luxe p-8 sticky top-32">
                  <div className="mb-6 pb-5 border-b border-charcoal/10">
                    <p className="eyebrow eyebrow--bare mb-1.5">Summary</p>
                    <h3 className="font-serif text-2xl font-light text-charcoal">
                      {itemCount} {itemCount === 1 ? "Piece" : "Pieces"}
                    </h3>
                  </div>

                  <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-14 h-18 shrink-0 overflow-hidden bg-warm-gray">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-charcoal text-white text-[9px] rounded-full flex items-center justify-center font-semibold">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-charcoal line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {item.size} / {item.color}
                          </p>
                          <p className="text-xs font-semibold text-charcoal mt-1">
                            {formatPrice(
                              (item.salePrice ?? item.price) * item.quantity,
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-sm border-t border-charcoal/10 pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-serif italic text-sm text-gold-dark">
                        Complimentary
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-4 pt-5 border-t border-gold/40">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/60 pb-1">Total</span>
                    <span className="font-serif text-3xl font-light">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
