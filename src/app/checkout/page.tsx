"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CreditCard, Lock, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/medusa";
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
        <main className="min-h-[70vh] flex flex-col items-center justify-center pt-32 pb-20 px-6">
          <div className="w-20 h-20 bg-warm-gray rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-charcoal"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <ShoppingBag className="w-16 h-16 text-charcoal/20" strokeWidth={1} />
            <h3 className="font-serif text-2xl text-charcoal mt-6 mb-2">
              Your cart is empty
            </h3>
          </div>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            Looks like you haven&apos;t added any beautiful pieces to your
            wardrobe yet.
          </p>
          <Link
            href="/shop"
            className="group h-12 px-8 flex items-center justify-center gap-3 bg-charcoal text-white text-xs font-bold uppercase tracking-[0.2em] rounded-full hover:bg-black transition-colors"
          >
            <span>Explore Collection</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
          <div className="w-12 h-12 border-4 border-charcoal/20 border-t-charcoal rounded-full animate-spin mb-6"></div>
          <h1 className="font-serif text-2xl text-charcoal mb-2">
            Taking you to Secure Checkout...
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      currentStep === step.key
                        ? "bg-charcoal text-white"
                        : steps.findIndex((s) => s.key === currentStep) > idx
                          ? "bg-gold text-white"
                          : "bg-charcoal/10 text-muted-foreground"
                    }`}
                  >
                    {steps.findIndex((s) => s.key === currentStep) > idx ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`text-xs uppercase tracking-widest font-semibold hidden sm:inline ${
                      currentStep === step.key
                        ? "text-charcoal"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-12 h-px bg-charcoal/20" />
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
                    className="space-y-6"
                  >
                    <h2 className="font-serif text-2xl text-charcoal mb-6">
                      Shipping Details
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                          className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                          className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                          className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                          className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                          placeholder="+91"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                        className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                          className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                          className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
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
                          className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                          pattern="[0-9]{6}"
                          maxLength={6}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 flex items-center justify-center gap-3 bg-charcoal text-white text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors mt-8 disabled:opacity-70"
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
                    <h2 className="font-serif text-2xl text-charcoal mb-6">
                      Payment
                    </h2>

                    <div className="bg-warm-gray p-6 border border-charcoal/10">
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
                    <div className="bg-warm-gray/50 p-4 border border-charcoal/5 rounded-sm">
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
                    <div className="bg-white p-6 border border-charcoal/10">
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
                        className="text-[10px] text-gold uppercase tracking-wider mt-3 hover:underline"
                      >
                        Edit Address
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentStep("shipping")}
                        disabled={isSubmitting}
                        className="h-12 px-6 flex items-center gap-2 border border-charcoal/20 text-xs font-semibold uppercase tracking-widest text-charcoal hover:bg-charcoal/5 transition-colors disabled:opacity-70"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                      <button
                        onClick={handleShopifyCheckout}
                        disabled={!(preparedCheckoutUrl || checkoutUrl)}
                        className="flex-1 h-12 flex items-center justify-center gap-3 bg-charcoal text-white text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors disabled:opacity-50"
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
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="font-serif text-3xl text-charcoal mb-3">
                      Order Confirmed! 🎉
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
                        className="inline-flex items-center gap-2 bg-charcoal text-white px-8 py-4 text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors"
                      >
                        Continue Shopping
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Order Summary Sidebar */}
            {currentStep !== "confirmation" && (
              <div className="lg:col-span-1">
                <div className="bg-warm-gray p-6 sticky top-32">
                  <h3 className="font-serif text-lg text-charcoal mb-6 pb-4 border-b border-charcoal/10">
                    Order Summary ({itemCount})
                  </h3>

                  <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-14 h-18 shrink-0 overflow-hidden bg-white">
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
                      <span className="text-green-600 text-xs uppercase tracking-wider font-medium">
                        Free
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between mt-4 pt-4 border-t border-charcoal/10">
                    <span className="font-serif text-lg">Total</span>
                    <span className="font-serif text-lg font-semibold">
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
