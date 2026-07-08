import { isShopifyConfigured } from "@/lib/shopify";
import { isMedusaConfigured, medusaCommerceAdapter } from "./medusa-adapter";
import { mockCommerceAdapter } from "./mock-adapter";
import { legacyShopifyCommerceAdapter } from "./shopify-legacy-adapter";
import type { CommerceAdapter, CommerceBackend } from "./types";

function requestedBackend(): CommerceBackend | null {
  const value = process.env.NEXT_PUBLIC_COMMERCE_BACKEND;
  if (value === "mock" || value === "shopify" || value === "medusa") {
    return value;
  }
  return null;
}

export function getCommerceAdapter(): CommerceAdapter {
  const requested = requestedBackend();

  if (requested === "medusa") {
    return isMedusaConfigured() ? medusaCommerceAdapter : mockCommerceAdapter;
  }

  if (requested === "shopify") {
    return isShopifyConfigured()
      ? legacyShopifyCommerceAdapter
      : mockCommerceAdapter;
  }

  if (requested === "mock") return mockCommerceAdapter;

  if (isMedusaConfigured()) return medusaCommerceAdapter;
  if (isShopifyConfigured()) return legacyShopifyCommerceAdapter;
  return mockCommerceAdapter;
}

export type {
  CommerceAdapter,
  CommerceBackend,
  CommerceBuyer,
  CommerceCartLine,
  CommerceCheckoutDraft,
  CommerceCheckoutResult,
  CommerceCollection,
  CommerceProduct,
} from "./types";

export {
  getWholesaleSetPrice,
  toMedusaProductSeedDraft,
  toMedusaProductSeedDrafts,
  type MedusaProductSeedDraft,
  type MedusaProductSeedPrice,
  type MedusaProductSeedVariant,
  type MedusaProductStatus,
} from "./medusa-product-sync";
