export const B2B_CONFIG = {
  setSize: 4,
  sizeRatio: ["S", "M", "L", "XL"] as const,
  minimumOrderSets: 4,
  minimumStyleSets: 1,
  defaultLineSets: 1,
  // Flat wholesale pricing — no volume-discount ladder for now. A single 0%
  // tier keeps the tier machinery (MOQ, totals, promo-code sync) working while
  // charging everyone the same per set. A 0% tier maps to NO promo code, so
  // nothing discount-related is sent to Medusa. A flat 2–3% cart-value discount
  // is planned later; add it here (or as a post-subtotal adjustment) when ready.
  tiers: [
    { minSets: 4, maxSets: null, discountPercent: 0, label: "Wholesale" },
  ],
  businessTypes: [
    "Boutique",
    "Reseller",
    "Online seller",
    "Distributor",
    "Other",
  ] as const,
  whatsappNumber:
    process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP_NUMBER ||
    "918660452247",
  shopifyCheckoutEnabled:
    process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_ENABLED === "true",
};

export type BusinessType = (typeof B2B_CONFIG.businessTypes)[number];

export const SIZE_RATIO_LABEL = B2B_CONFIG.sizeRatio.join("/");

/**
 * Indian GST on readymade garments / apparel.
 *
 * Established structure: 5% when the per-piece value is at or below the
 * threshold, 12% above it. Charged on the (post-discount) taxable value.
 *
 * ⚠️ VERIFY BEFORE GOING LIVE: rates and the ₹1,000/piece threshold reflect the
 * long-standing garment slab but were NOT confirmed against a live source and
 * may have shifted under GST-council revisions. This is the single source of
 * truth — update these numbers here and the whole cart follows.
 */
export const GST_CONFIG = {
  lowRate: 5,
  highRate: 12,
  thresholdPerPiece: 1000,
  label: "GST",
  note: "GST applied on per-piece value — 5% up to ₹1,000/pc, 12% above. Final invoice at dispatch.",
};
