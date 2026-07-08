import {
  COLOR_MAP,
  MOCK_COLLECTIONS,
  MOCK_PRODUCTS,
  formatPrice,
} from "@/lib/shopify";
import { getCommerceAdapter } from "./index";
import type {
  CommerceCollection,
  CommerceProduct,
  ProductQuery,
} from "./types";

export { COLOR_MAP, MOCK_COLLECTIONS, MOCK_PRODUCTS, formatPrice };
export type { CommerceCollection, CommerceProduct };

// Backward-compatible name while the storefront migrates from Shopify-shaped
// product helpers to commerce-neutral helpers.
export type MockProduct = CommerceProduct;

export async function getProducts(
  limit = 12,
  category?: string,
): Promise<CommerceProduct[]> {
  const adapter = getCommerceAdapter();
  const input: ProductQuery = { limit, category };
  const products = await adapter.getProducts(input);

  if (products.length > 0 || adapter.backend === "mock") return products;
  return MOCK_PRODUCTS.filter(
    (product) => !category || category === "All" || product.category === category,
  ).slice(0, limit);
}

export async function getProductByHandle(
  handle: string,
): Promise<CommerceProduct | null> {
  const adapter = getCommerceAdapter();
  const product = await adapter.getProductByHandle(handle);

  if (product || adapter.backend === "mock") return product;
  return MOCK_PRODUCTS.find((fallback) => fallback.handle === handle) ?? null;
}

export async function getCollections(): Promise<CommerceCollection[]> {
  const adapter = getCommerceAdapter();
  const collections = await adapter.getCollections();

  if (collections.length > 0 || adapter.backend === "mock") return collections;
  return MOCK_COLLECTIONS;
}

export async function getProductsByCollection(
  handle: string,
  limit = 20,
): Promise<CommerceProduct[]> {
  const adapter = getCommerceAdapter();
  const products = await adapter.getProductsByCollection(handle, limit);

  if (products.length > 0 || adapter.backend === "mock") return products;
  return MOCK_PRODUCTS.slice(0, limit);
}

export async function getCollectionByHandle(handle: string): Promise<{
  collection: CommerceCollection;
  products: CommerceProduct[];
} | null> {
  const collections = await getCollections();
  const collection = collections.find(
    (candidate) => candidate.handle === handle || candidate.id === handle,
  );

  if (!collection) return null;

  const products = await getProductsByCollection(collection.handle, 24);
  return { collection, products };
}

export async function searchProducts(query: string): Promise<CommerceProduct[]> {
  const adapter = getCommerceAdapter();
  const products = await adapter.searchProducts(query);

  if (products.length > 0 || adapter.backend === "mock") return products;

  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_PRODUCTS.filter(
    (product) =>
      product.title.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q),
  );
}
