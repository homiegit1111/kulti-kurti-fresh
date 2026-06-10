// ── Checkout helpers ─────────────────────────────────────────────────────────
//   Centralises the "start checkout" hand-off to Shopify's hosted checkout so
//   every entry point (cart drawer, cart page, Shop Pay button) fires the same
//   GA4 begin_checkout event with consistent payloads.

import { trackBeginCheckout, type AnalyticsLineItem } from "@/lib/analytics";
import type { CartItem } from "@/lib/cart-context";

export function cartItemsToAnalytics(items: CartItem[]): AnalyticsLineItem[] {
  return items.map((i) => ({
    item_id: i.productId,
    item_name: i.title,
    price: i.salePrice ?? i.price,
    quantity: i.quantity,
    item_variant: i.size,
  }));
}

/**
 * Fire begin_checkout for the current bag. Safe no-op without analytics.
 * Call this immediately before redirecting to Shopify checkout.
 */
export function trackCheckoutStart(items: CartItem[], subtotal: number): void {
  if (items.length === 0) return;
  trackBeginCheckout(cartItemsToAnalytics(items), subtotal);
}

/** True when the merchant has explicitly enabled the Shop Pay express button. */
export function isShopPayEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOP_PAY_ENABLED === "true";
}
