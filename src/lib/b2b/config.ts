export const B2B_CONFIG = {
  setSize: 4,
  sizeRatio: ["S", "M", "L", "XL"] as const,
  minimumOrderSets: 4,
  minimumStyleSets: 1,
  defaultLineSets: 1,
  tiers: [
    { minSets: 4, maxSets: 7, discountPercent: 0, label: "Starter wholesale" },
    { minSets: 8, maxSets: 19, discountPercent: 5, label: "Growth buyer" },
    { minSets: 20, maxSets: null, discountPercent: 10, label: "Bulk partner" },
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
