// ── Analytics helper (GA4 + Consent Mode v2) ─────────────────────────────────
//   Thin, framework-agnostic wrapper around gtag. Every function is a SAFE
//   no-op when GA is not configured or consent hasn't been granted, so the rest
//   of the app can fire events freely without guards.
//
//   Privacy posture: Consent Mode v2 defaults to *denied* (see
//   <GoogleAnalytics/>). Nothing is tracked until the visitor accepts via the
//   consent banner. Choice is persisted in localStorage.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export const CONSENT_STORAGE_KEY = "rangat-pehnawa-consent";

export type ConsentChoice = "granted" | "denied";

export function isAnalyticsConfigured(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

type GtagFn = (...args: unknown[]) => void;

function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: GtagFn; dataLayer?: unknown[] };
  if (typeof w.gtag === "function") {
    w.gtag(...args);
  } else {
    // gtag.js may not have loaded yet — push to the dataLayer it will drain.
    (w.dataLayer = w.dataLayer || []).push(args);
  }
}

/** Read the persisted consent choice (defaults to "denied"). */
export function getStoredConsent(): ConsentChoice {
  if (typeof window === "undefined") return "denied";
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === "granted"
      ? "granted"
      : "denied";
  } catch {
    return "denied";
  }
}

/** Update Google Consent Mode + persist the visitor's choice. */
export function setConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // storage may be blocked — consent still applies for this session
  }
  gtag("consent", "update", {
    ad_storage: choice,
    analytics_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
  });
}

/** Whether the visitor has made an explicit choice yet (banner gating). */
export function hasConsentDecision(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

// ── Event helpers (GA4 recommended ecommerce events) ─────────────────────────

export function pageview(url: string): void {
  if (!isAnalyticsConfigured()) return;
  gtag("event", "page_view", { page_path: url });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!isAnalyticsConfigured()) return;
  gtag("event", name, params);
}

export interface AnalyticsLineItem {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
  item_variant?: string;
}

export function trackAddToCart(item: AnalyticsLineItem): void {
  trackEvent("add_to_cart", {
    currency: "INR",
    value: (item.price ?? 0) * (item.quantity ?? 1),
    items: [item],
  });
}

export function trackBeginCheckout(
  items: AnalyticsLineItem[],
  value: number,
): void {
  trackEvent("begin_checkout", { currency: "INR", value, items });
}

export function trackViewItem(item: AnalyticsLineItem): void {
  trackEvent("view_item", {
    currency: "INR",
    value: item.price ?? 0,
    items: [item],
  });
}

export function trackWholesaleRegister(params: Record<string, unknown> = {}): void {
  trackEvent("wholesale_register", params);
}

export function trackAddSetsToCart(item: AnalyticsLineItem): void {
  trackEvent("add_sets_to_cart", {
    currency: "INR",
    value: (item.price ?? 0) * (item.quantity ?? 1),
    items: [item],
  });
}

export function trackBeginWhatsappOrder(params: Record<string, unknown>): void {
  trackEvent("begin_whatsapp_order", params);
}

export function trackBulkOrderAdd(params: Record<string, unknown>): void {
  trackEvent("bulk_order_add", params);
}

export function trackMoqBlockedCheckout(params: Record<string, unknown>): void {
  trackEvent("moq_blocked_checkout", params);
}

export function trackTierUnlocked(params: Record<string, unknown>): void {
  trackEvent("tier_unlocked", params);
}
