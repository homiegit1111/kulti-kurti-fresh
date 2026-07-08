import {
  MOCK_COLLECTIONS,
  MOCK_PRODUCTS,
  type MockProduct,
} from "@/lib/shopify";
import type {
  CommerceAdapter,
  CommerceCollection,
  CommerceProduct,
  ProductQuery,
} from "./types";

function filterProducts(input?: ProductQuery): MockProduct[] {
  const limit = input?.limit ?? 12;
  const category = input?.category;
  const products =
    category && category !== "All"
      ? MOCK_PRODUCTS.filter((product) => product.category === category)
      : MOCK_PRODUCTS;

  return products.slice(0, limit);
}

export const mockCommerceAdapter: CommerceAdapter = {
  backend: "mock",

  async getProducts(input) {
    return filterProducts(input);
  },

  async getProductByHandle(handle) {
    return MOCK_PRODUCTS.find((product) => product.handle === handle) ?? null;
  },

  async getCollections(): Promise<CommerceCollection[]> {
    return MOCK_COLLECTIONS;
  },

  async getProductsByCollection(_handle, limit = 20): Promise<CommerceProduct[]> {
    return MOCK_PRODUCTS.slice(0, limit);
  },

  async searchProducts(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return MOCK_PRODUCTS.filter(
      (product) =>
        product.title.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q),
    );
  },

  async createCheckoutSession() {
    return {
      ok: false,
      reason: "Mock commerce does not create payment sessions.",
    };
  },
};
