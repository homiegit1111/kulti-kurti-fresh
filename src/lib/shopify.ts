/**
 * Shopify Storefront API — data helpers for Rangat Pehnawa.
 *
 * All queries hit the Shopify GraphQL Storefront API.
 * Falls back to MOCK_PRODUCTS / MOCK_COLLECTIONS when Shopify is not configured,
 * so the site never breaks during development.
 *
 * Exports the exact same names as the old medusa.ts so every UI component
 * continues to work without any import path changes.
 */

// ── Config ─────────────────────────────────────────────────────────────────────

const SHOPIFY_DOMAIN = (): string =>
  (process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "").replace(/\/+$/, "");

const STOREFRONT_TOKEN = (): string =>
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || "";

const API_VERSION = (): string =>
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || "2026-04";

const endpoint = () =>
  `https://${SHOPIFY_DOMAIN()}/api/${API_VERSION()}/graphql.json`;

/** True when Shopify Storefront API can be reached.
 *
 * Shopify 2026-04 supports tokenless Storefront access for products,
 * collections, search, and cart. A Storefront token is still useful for
 * token-gated features like metafields, menus, and customer APIs.
 */
export const isShopifyConfigured = (): boolean => Boolean(SHOPIFY_DOMAIN());

// ── GraphQL client ─────────────────────────────────────────────────────────────

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  if (!isShopifyConfigured()) return null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const token = STOREFRONT_TOKEN();
    if (token) headers["X-Shopify-Storefront-Access-Token"] = token;

    const res = await fetch(endpoint(), {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 60 }, // 1-min ISR cache
    });

    if (!res.ok) return null;

    const json = (await res.json()) as GqlResponse<T>;
    if (json.errors?.length) {
      if (process.env.NODE_ENV === "development") {
        console.error("[shopify]", json.errors[0]?.message);
      }
      return null;
    }
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ── Shared product type (same as before, Shopify-backed now) ──────────────────

export interface MockProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  price: number;
  salePrice: number | null;
  image: string;
  images: string[];
  colors: string[];
  isNew: boolean;
  category: string;
  sizes: string[];
  /** Shopify variant GID for the first/default variant */
  variantId?: string;
  /** size-label → Shopify variant GID */
  variantIds?: Record<string, string>;
  /** Handle of the Shopify collection this product belongs to */
  collectionHandle?: string;
  /** Whether this product is available for purchase */
  availableForSale?: boolean;
}

// ── Color map ──────────────────────────────────────────────────────────────────

export const COLOR_MAP: Record<string, string> = {
  sage: "#B2BFA8",
  ivory: "#FFFFF0",
  blush: "#F5C6C6",
  navy: "#1B2A4A",
  gold: "#C9A96E",
  terracotta: "#C75B3A",
  cream: "#FFFDD0",
  forest: "#2D5A27",
  copper: "#B87333",
  pearl: "#F0EAD6",
  silver: "#C0C0C0",
  mustard: "#E1AD01",
  brown: "#6F4E37",
  white: "#FFFFFF",
  black: "#000000",
  pink: "#FFC0CB",
  red: "#FF4444",
  blue: "#4444FF",
  green: "#44AA44",
  yellow: "#FFD700",
  orange: "#FF8C00",
  purple: "#800080",
};

// ── Mock fallback data ─────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "prod_01",
    title: "Sage Chanderi Kurta Set",
    handle: "sage-chanderi-kurta",
    description:
      "A serene sage-toned Chanderi kurta set featuring intricate handblock prints. Crafted from pure Chanderi silk-cotton blend with gold zari accents.",
    price: 4299,
    salePrice: 3499,
    image: "/images/product-1.png",
    images: ["/images/product-1.png", "/images/product-2.png"],
    colors: ["sage", "ivory"],
    isNew: true,
    category: "Kurtis",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "prod_02",
    title: "Ivory Silk Anarkali Suit",
    handle: "ivory-anarkali",
    description:
      "An ethereal ivory Anarkali suit in pure mulberry silk with delicate chikankari embroidery.",
    price: 6999,
    salePrice: null,
    image: "/kurti-ivory.png",
    images: ["/kurti-ivory.png", "/kurti-blush.png"],
    colors: ["ivory", "blush"],
    isNew: false,
    category: "Kurtis",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "prod_03",
    title: "Navy Mirror Work Kurta Set",
    handle: "navy-mirror-work-kurta",
    description:
      "A statement navy kurta set featuring traditional mirror work from Rajasthan.",
    price: 5499,
    salePrice: 4199,
    image: "/images/product-3.png",
    images: ["/images/product-3.png", "/images/product-4.png"],
    colors: ["navy", "gold"],
    isNew: false,
    category: "Kurtis",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "prod_04",
    title: "Terracotta Block Print Saree",
    handle: "terracotta-block-print",
    description:
      "A warm terracotta saree with traditional Bagru handblock prints.",
    price: 3799,
    salePrice: null,
    image: "/images/product-4.png",
    images: ["/images/product-4.png", "/images/product-3.png"],
    colors: ["terracotta", "cream"],
    isNew: true,
    category: "Sarees",
    sizes: ["FS"],
  },
  {
    id: "prod_05",
    title: "Blush Silk Lehenga Ensemble",
    handle: "blush-silk-ensemble",
    description:
      "A dreamy blush pink lehenga in pure Banarasi silk with gold zardozi work.",
    price: 8999,
    salePrice: null,
    image: "/images/product-1.png",
    images: ["/images/product-1.png", "/images/product-2.png"],
    colors: ["blush", "gold"],
    isNew: false,
    category: "Lehengas",
    sizes: ["S", "M", "L"],
  },
  {
    id: "prod_06",
    title: "Forest Embroidered Co-ord Set",
    handle: "forest-embroidered-set",
    description:
      "A sophisticated forest green co-ord set with copper threadwork embroidery.",
    price: 5299,
    salePrice: 4499,
    image: "/images/product-2.png",
    images: ["/images/product-2.png", "/images/product-3.png"],
    colors: ["forest", "copper"],
    isNew: true,
    category: "Co-ords",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "prod_07",
    title: "Pearl Georgette Kurta Set",
    handle: "pearl-georgette-kurta",
    description:
      "An elegant pearl-white georgette kurta set with silver sequin detailing.",
    price: 4799,
    salePrice: null,
    image: "/images/product-3.png",
    images: ["/images/product-3.png", "/images/product-1.png"],
    colors: ["pearl", "silver"],
    isNew: false,
    category: "Kurtis",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "prod_08",
    title: "Mustard Cotton Anarkali Suit",
    handle: "mustard-cotton-anarkali",
    description:
      "A vibrant mustard Anarkali suit in handloom cotton with ajrakh block prints.",
    price: 3299,
    salePrice: null,
    image: "/images/product-4.png",
    images: ["/images/product-4.png", "/images/product-2.png"],
    colors: ["mustard", "brown"],
    isNew: false,
    category: "Kurtis",
    sizes: ["XS", "S", "M", "L"],
  },
];

export const MOCK_COLLECTIONS = [
  {
    id: "col_coords",
    title: "Co-ords",
    handle: "co-ords",
    image: "/images/product-2.png",
    itemCount: 2,
    description:
      "Matching top-and-bottom co-ord sets, styled for effortless, put-together looks.",
  },
  {
    id: "col_2pcs",
    title: "2 Pcs Set",
    handle: "2-pcs-set",
    image: "/images/collection-minimal.png",
    itemCount: 3,
    description:
      "Kurta paired with a coordinated bottom — the boutique reseller's everyday bestseller.",
  },
  {
    id: "col_dupatta",
    title: "Dupatta Set",
    handle: "dupatta-set",
    image: "/images/premium_dupatta.png",
    itemCount: 3,
    description:
      "Complete three-piece ensembles finished with a flowing dupatta for festive racks.",
  },
];

// ── Price helper ───────────────────────────────────────────────────────────────

export function formatPrice(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

// ── Shopify GraphQL fragments & queries ────────────────────────────────────────

const PRODUCT_FIELDS = `
  id
  title
  handle
  description
  productType
  createdAt
  availableForSale
  priceRange {
    minVariantPrice { amount currencyCode }
  }
  compareAtPriceRange {
    minVariantPrice { amount currencyCode }
  }
  featuredImage { url altText }
  images(first: 8) {
    nodes { url altText }
  }
  variants(first: 30) {
    nodes {
      id
      title
      availableForSale
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      selectedOptions { name value }
    }
  }
  collections(first: 1) {
    nodes { handle }
  }
`;

const PRODUCTS_QUERY = `
  query Products($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
      nodes { ${PRODUCT_FIELDS} }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`;

const COLLECTIONS_QUERY = `
  query Collections($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        title
        handle
        description
        image { url altText }
        products(first: 1) { nodes { id } }
      }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `
  query CollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      image { url altText }
      products(first: $first) {
        nodes { ${PRODUCT_FIELDS} }
      }
    }
  }
`;

// ── Internal: Shopify → MockProduct mapper ─────────────────────────────────────

interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  compareAtPrice: { amount: string; currencyCode: string } | null;
  selectedOptions: { name: string; value: string }[];
}

interface ShopifyProductRaw {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  createdAt: string;
  availableForSale: boolean;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  compareAtPriceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage: { url: string; altText: string | null } | null;
  images: { nodes: { url: string; altText: string | null }[] };
  variants: { nodes: ShopifyVariant[] };
  collections: { nodes: { handle: string }[] };
}

function mapShopifyProduct(p: ShopifyProductRaw): MockProduct {
  const variants = p.variants.nodes ?? [];
  const images = p.images.nodes.map((img) => img.url);

  // Price (Shopify gives it as a decimal string, e.g. "3499.00")
  const priceStr = p.priceRange.minVariantPrice.amount;
  const price = parseFloat(priceStr);

  // Sale price — only if compareAtPrice > price
  const compareStr = p.compareAtPriceRange.minVariantPrice.amount;
  const comparePrice = parseFloat(compareStr);
  const salePrice = comparePrice > price ? price : null;
  const displayPrice = comparePrice > price ? comparePrice : price;

  // Build size → variantId map from the "Size" option
  const variantIds: Record<string, string> = {};
  const colorsSet = new Set<string>();

  for (const v of variants) {
    const sizeOpt = v.selectedOptions.find(
      (o) => o.name.toLowerCase() === "size",
    );
    const colorOpt = v.selectedOptions.find(
      (o) => o.name.toLowerCase() === "color",
    );

    if (sizeOpt?.value) {
      variantIds[sizeOpt.value] = v.id;
    } else if (!sizeOpt && v.title && v.title !== "Default Title") {
      // Some stores use variant title directly as size
      variantIds[v.title] = v.id;
    }

    if (colorOpt?.value) {
      colorsSet.add(colorOpt.value.toLowerCase());
    }
  }

  const sizes =
    Object.keys(variantIds).length > 0
      ? Object.keys(variantIds)
      : ["S", "M", "L", "XL"];

  const colors = colorsSet.size > 0 ? Array.from(colorsSet) : ["ivory"];

  const collectionHandle = p.collections.nodes[0]?.handle ?? undefined;
  const firstVariantId = variants[0]?.id ?? undefined;

  // Check newness — within the last 14 days
  const isNew =
    new Date(p.createdAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description || "",
    price: displayPrice,
    salePrice,
    image: p.featuredImage?.url ?? images[0] ?? "/images/product-1.png",
    images: images.length > 0 ? images : ["/images/product-1.png"],
    colors,
    isNew,
    category: p.productType || "Kurtis",
    sizes,
    variantId: firstVariantId,
    variantIds: Object.keys(variantIds).length > 0 ? variantIds : undefined,
    collectionHandle,
    availableForSale: p.availableForSale,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function getProducts(
  limit = 12,
  category?: string,
): Promise<MockProduct[]> {
  const queryStr =
    category && category !== "All" ? `product_type:${category}` : undefined;

  const data = await shopifyFetch<{ products: { nodes: ShopifyProductRaw[] } }>(
    PRODUCTS_QUERY,
    { first: limit, query: queryStr, sortKey: "CREATED_AT", reverse: true },
  );

  if (data?.products?.nodes?.length) {
    return data.products.nodes.map(mapShopifyProduct);
  }

  // Fallback
  let filtered = MOCK_PRODUCTS;
  if (category && category !== "All") {
    filtered = filtered.filter((p) => p.category === category);
  }
  return filtered.slice(0, limit);
}

export async function getProductByHandle(
  handle: string,
): Promise<MockProduct | null> {
  const data = await shopifyFetch<{ product: ShopifyProductRaw | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle },
  );

  if (data?.product) return mapShopifyProduct(data.product);

  // Fallback
  return MOCK_PRODUCTS.find((p) => p.handle === handle) ?? null;
}

export async function getCollections(): Promise<typeof MOCK_COLLECTIONS> {
  const data = await shopifyFetch<{
    collections: {
      nodes: {
        id: string;
        title: string;
        handle: string;
        description: string;
        image: { url: string } | null;
        products: { nodes: { id: string }[] };
      }[];
    };
  }>(COLLECTIONS_QUERY, { first: 10 });

  if (data?.collections?.nodes?.length) {
    return data.collections.nodes.map((c) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      image: c.image?.url ?? "/images/collection-summer.png",
      itemCount: c.products.nodes.length,
      description: c.description || "",
    }));
  }

  return MOCK_COLLECTIONS;
}

export async function getProductsByCollection(
  handleOrId: string,
  limit = 20,
): Promise<MockProduct[]> {
  // handleOrId could be a collection handle or a GID — we use handle
  const data = await shopifyFetch<{
    collection: {
      id: string;
      products: { nodes: ShopifyProductRaw[] };
    } | null;
  }>(COLLECTION_PRODUCTS_QUERY, { handle: handleOrId, first: limit });

  if (data?.collection?.products?.nodes?.length) {
    return data.collection.products.nodes.map(mapShopifyProduct);
  }

  return MOCK_PRODUCTS.slice(0, limit);
}

export async function getCollectionByHandle(handle: string) {
  const data = await shopifyFetch<{
    collection: {
      id: string;
      title: string;
      handle: string;
      description: string;
      image: { url: string; altText: string | null } | null;
      products: { nodes: ShopifyProductRaw[] };
    } | null;
  }>(COLLECTION_PRODUCTS_QUERY, { handle, first: 24 });

  if (data?.collection) {
    return {
      collection: {
        id: data.collection.id,
        title: data.collection.title,
        handle: data.collection.handle,
        image: data.collection.image?.url ?? "/images/collection-summer.png",
        itemCount: data.collection.products.nodes.length,
        description: data.collection.description || "",
      },
      products: data.collection.products.nodes.map(mapShopifyProduct),
    };
  }

  return null;
}

export async function searchProducts(query: string): Promise<MockProduct[]> {
  if (!query.trim()) return [];

  const data = await shopifyFetch<{ products: { nodes: ShopifyProductRaw[] } }>(
    PRODUCTS_QUERY,
    { first: 20, query: query.trim() },
  );

  if (data?.products?.nodes?.length) {
    return data.products.nodes.map(mapShopifyProduct);
  }

  // Fallback to mock search
  const q = query.toLowerCase();
  return MOCK_PRODUCTS.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
}
