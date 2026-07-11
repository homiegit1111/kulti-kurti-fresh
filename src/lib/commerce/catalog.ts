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

const CATALOG_TIMEOUT_MS = 4500;

async function withCatalogTimeout<T>(
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), CATALOG_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getProducts(
  limit = 12,
  category?: string,
): Promise<CommerceProduct[]> {
  const adapter = getCommerceAdapter();
  const input: ProductQuery = { limit, category };
  // In a real Supabase deployment an unavailable catalog must be visibly
  // unavailable. Falling back to mock products here would let checkout price
  // demo data when the production database is down or misconfigured.
  const fallback = adapter.backend === "supabase"
    ? []
    : MOCK_PRODUCTS.filter(
        (product) => !category || category === "All" || product.category === category,
      ).slice(0, limit);
  const products = await withCatalogTimeout(adapter.getProducts(input), fallback);

  if (products.length > 0 || adapter.backend === "mock") return products;
  return fallback;
}

export async function getProductByHandle(
  handle: string,
): Promise<CommerceProduct | null> {
  const adapter = getCommerceAdapter();
  const fallback = adapter.backend === "supabase"
    ? null
    : MOCK_PRODUCTS.find((item) => item.handle === handle) ?? null;
  const product = await withCatalogTimeout(
    adapter.getProductByHandle(handle),
    fallback,
  );

  if (product || adapter.backend === "mock") return product;
  return fallback;
}

export async function getCollections(): Promise<CommerceCollection[]> {
  const adapter = getCommerceAdapter();
  const collections = await withCatalogTimeout(
    adapter.getCollections(),
    adapter.backend === "supabase" ? [] : MOCK_COLLECTIONS,
  );

  if (collections.length > 0 || adapter.backend === "mock") return collections;
  return adapter.backend === "supabase" ? [] : MOCK_COLLECTIONS;
}

export async function getProductsByCollection(
  handle: string,
  limit = 20,
): Promise<CommerceProduct[]> {
  const adapter = getCommerceAdapter();
  const fallback = adapter.backend === "supabase" ? [] : MOCK_PRODUCTS.slice(0, limit);
  const products = await withCatalogTimeout(
    adapter.getProductsByCollection(handle, limit),
    fallback,
  );

  if (products.length > 0 || adapter.backend === "mock") return products;
  return fallback;
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
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const fallback = adapter.backend === "supabase"
    ? []
    : MOCK_PRODUCTS.filter(
        (product) =>
          product.title.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q) ||
          product.description.toLowerCase().includes(q),
      );
  const products = await withCatalogTimeout(adapter.searchProducts(query), fallback);

  if (products.length > 0 || adapter.backend === "mock") return products;
  return fallback;
}
