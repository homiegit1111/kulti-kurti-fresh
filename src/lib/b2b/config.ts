export const B2B_CONFIG = {
  setSize: 4,
  sizeRatio: ["S", "M", "L", "XL"] as const,
  minimumOrderSets: 4,
  minimumStyleSets: 1,
  defaultLineSets: 1,
  // ⚠️ DECISION NEEDED — see docs/ADMIN_STUDIO.md § "The volume ladder".
  //
  // This list used to declare a single flat 0% tier, while
  // public.create_commerce_checkout independently hardcoded 5% at 8+ sets and
  // 10% at 20+ sets. The database wins, because it computes the charged total —
  // so buyers were QUOTED full price and CHARGED up to 10% less.
  //
  // These values now mirror the ladder seeded into public.commerce_pricing_tiers
  // by supabase/20260726_configurable_pricing_and_sales.sql: that is, what the
  // database was already charging. The quote now agrees with the charge, which is
  // an improvement either way — but it does NOT settle which ladder was
  // intended. Decide, set it in Admin Studio → Pricing (a flat 0% ladder is one
  // edit), and mirror your choice here.
  //
  // The database ladder is authoritative for money. This copy exists only so
  // client components can render tiers synchronously.
  tiers: [
    { minSets: 4, maxSets: 7, discountPercent: 0, label: "Wholesale" },
    { minSets: 8, maxSets: 19, discountPercent: 5, label: "Volume 8+ sets" },
    { minSets: 20, maxSets: null, discountPercent: 10, label: "Volume 20+ sets" },
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

/**
 * Typical boutique markup on wholesale, used to ILLUSTRATE a reseller's margin.
 * It is an assumption about the buyer's own shop, never a claim about ours, so
 * anything rendered from it must be labelled as typical/illustrative and stay
 * editable where the buyer can change it (see reseller-margin-estimator).
 *
 * Single source: the estimator and the homepage rack both read this, so one edit
 * moves every margin figure on the site.
 */
export const TYPICAL_RESALE_MULTIPLIER = 1.45;

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
