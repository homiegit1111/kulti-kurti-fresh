"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { getOrCreateCart } from "@/lib/shopify-cart";
import { isShopPayEnabled, trackCheckoutStart } from "@/lib/checkout";

/**
 * Shop Pay express checkout button.
 *
 * Shop Pay (and Shopify's other accelerated wallets) live on Shopify's hosted
 * checkout. Enabling Shop Pay is a store-side setting:
 *   Shopify Admin → Settings → Payments → Shop Pay → Activate.
 * Once active, this button gives shoppers a one-tap express lane straight to
 * that checkout (skipping the on-site cart review), where Shop Pay is the
 * accelerated option.
 *
 * Gated behind NEXT_PUBLIC_SHOP_PAY_ENABLED="true" so it only appears after the
 * merchant has actually turned Shop Pay on — avoids dead-ending shoppers.
 * Renders nothing when disabled, when Shopify isn't configured, or when the bag
 * is empty.
 */
export function ShopPayButton({ className = "" }: { className?: string }) {
  const { items, subtotal, checkoutUrl, shopifyCartEnabled } = useCart();
  const [loading, setLoading] = useState(false);

  if (!isShopPayEnabled() || !shopifyCartEnabled || items.length === 0) {
    return null;
  }

  const go = async () => {
    setLoading(true);
    trackCheckoutStart(items, subtotal);
    try {
      let url = checkoutUrl;
      if (!url) {
        const cart = await getOrCreateCart();
        url = cart?.checkoutUrl ?? null;
      }
      if (url) {
        window.location.href = url;
        return;
      }
      // Fallback to the on-site checkout if Shopify didn't return a URL.
      window.location.href = "/checkout";
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={go}
      disabled={loading}
      aria-label="Express checkout with Shop Pay"
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#5a31f4] text-white transition-all hover:bg-[#4a27d4] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a31f4]/50 ${className}`}
    >
      {loading ? (
        <span className="text-xs font-semibold tracking-wide">One moment…</span>
      ) : (
        <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
          Buy with <ShopPayWordmark />
        </span>
      )}
    </button>
  );
}

/** Inline "Shop Pay" wordmark (avoids shipping an external asset). */
function ShopPayWordmark() {
  return (
    <span className="font-bold">
      Shop<span className="opacity-90"> Pay</span>
    </span>
  );
}
