import { isShopifyConfigured } from "@/lib/shopify";
import { mockCommerceAdapter } from "./mock-adapter";
import { legacyShopifyCommerceAdapter } from "./shopify-legacy-adapter";
import {
  isSupabaseCommerceConfigured,
  supabaseCommerceAdapter,
} from "./supabase-adapter";
import type { CommerceAdapter, CommerceBackend } from "./types";

function requestedBackend(): CommerceBackend | null {
  const value = process.env.NEXT_PUBLIC_COMMERCE_BACKEND;
  if (
    value === "mock" ||
    value === "shopify" ||
    value === "supabase"
  ) {
    return value;
  }
  // "medusa" is retired; treat any legacy value as unset so auto-detect runs.
  return null;
}

export function getCommerceAdapter(): CommerceAdapter {
  const requested = requestedBackend();

  if (requested === "supabase") {
    return isSupabaseCommerceConfigured()
      ? supabaseCommerceAdapter
      : mockCommerceAdapter;
  }

  if (requested === "shopify") {
    return isShopifyConfigured()
      ? legacyShopifyCommerceAdapter
      : mockCommerceAdapter;
  }

  if (requested === "mock") return mockCommerceAdapter;

  // Auto-detect: Supabase is the primary backend now.
  if (isSupabaseCommerceConfigured()) return supabaseCommerceAdapter;
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
