import {
  getCollectionByHandle,
  getCollections,
  getProductByHandle,
  getProducts,
  getProductsByCollection,
  searchProducts,
} from "@/lib/shopify";
import type { CommerceAdapter, CommerceCollection } from "./types";

export const legacyShopifyCommerceAdapter: CommerceAdapter = {
  backend: "shopify",

  async getProducts(input) {
    return getProducts(input?.limit, input?.category);
  },

  async getProductByHandle(handle) {
    return getProductByHandle(handle);
  },

  async getCollections(): Promise<CommerceCollection[]> {
    return getCollections();
  },

  async getProductsByCollection(handle, limit) {
    const collection = await getCollectionByHandle(handle);
    if (collection?.products?.length) return collection.products.slice(0, limit);
    return getProductsByCollection(handle, limit);
  },

  async searchProducts(query) {
    return searchProducts(query);
  },

  async createCheckoutSession() {
    return {
      ok: false,
      reason:
        "Hosted Shopify checkout is intentionally disabled for B2B Phase 1/2.",
    };
  },
};
