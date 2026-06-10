/**
 * Shopify Storefront API — Cart operations (browser-safe, fetch-based).
 *
 * Key difference from a traditional cart: Shopify returns a `checkoutUrl`
 * with every cart mutation. Clicking "Checkout" simply redirects the user
 * to that URL — Shopify handles payment, shipping, taxes, and confirmation.
 */

// ── Config ─────────────────────────────────────────────────────────────────────

const SHOPIFY_DOMAIN = (): string =>
  (process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "").replace(/\/+$/, "");

const STOREFRONT_TOKEN = (): string =>
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || "";

const API_VERSION = (): string =>
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || "2026-04";

export const SHOPIFY_CART_ID_KEY = "rp_shopify_cart_id";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  cost: {
    subtotalAmount: { amount: string; currencyCode: string };
    totalAmount: { amount: string; currencyCode: string };
  };
  merchandise: {
    id: string;
    title: string;
    availableForSale: boolean;
    price: { amount: string; currencyCode: string };
    compareAtPrice: { amount: string; currencyCode: string } | null;
    selectedOptions: { name: string; value: string }[];
    image: { url: string; altText: string | null } | null;
    product: {
      id: string;
      title: string;
      handle: string;
      featuredImage: { url: string; altText: string | null } | null;
    };
  };
  attributes: { key: string; value: string }[];
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: { amount: string; currencyCode: string };
    totalAmount: { amount: string; currencyCode: string };
    totalTaxAmount: { amount: string; currencyCode: string } | null;
  };
  lines: { nodes: ShopifyCartLine[] };
}

// ── Shared order type ──────────────────────────────────────────────────────────

export interface ShopifyOrder {
  id: string;
  name: string; // e.g. "#1001"
  orderNumber: number;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  currentTotalPrice: { amount: string; currencyCode: string };
  lineItems: {
    nodes: {
      title: string;
      quantity: number;
      originalTotalPrice: { amount: string; currencyCode: string };
      variant: {
        image: { url: string } | null;
      } | null;
    }[];
  };
}

// ── GraphQL cart fragment ──────────────────────────────────────────────────────

const CART_FRAGMENT = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
  }
  lines(first: 100) {
    nodes {
      id
      quantity
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
      merchandise {
        ... on ProductVariant {
          id
          title
          availableForSale
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
          image { url altText }
          product {
            id
            title
            handle
            featuredImage { url altText }
          }
        }
      }
      attributes { key value }
    }
  }
`;

// ── GraphQL mutations ──────────────────────────────────────────────────────────

const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message code }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message code }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message code }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message code }
    }
  }
`;

const CART_BUYER_IDENTITY_MUTATION = `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message code }
    }
  }
`;

const GET_CART_QUERY = `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) { ${CART_FRAGMENT} }
  }
`;

// ── Internal fetch helper ──────────────────────────────────────────────────────

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function cartFetch<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const domain = SHOPIFY_DOMAIN();
  const token = STOREFRONT_TOKEN();

  if (!domain) return null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) headers["X-Shopify-Storefront-Access-Token"] = token;

    const res = await fetch(
      `https://${domain}/api/${API_VERSION()}/graphql.json`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
      },
    );

    if (!res.ok) return null;
    const json = (await res.json()) as GqlResponse<T>;
    if (json.errors?.length) {
      if (process.env.NODE_ENV === "development") {
        console.error("[shopify-cart]", json.errors[0]?.message);
      }
      return null;
    }
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ── Cart operations ────────────────────────────────────────────────────────────

export async function createCart(
  lines: {
    merchandiseId: string;
    quantity: number;
    attributes?: { key: string; value: string }[];
  }[] = [],
): Promise<ShopifyCart | null> {
  const data = await cartFetch<{ cartCreate: { cart: ShopifyCart } }>(
    CART_CREATE_MUTATION,
    { input: { lines } },
  );
  return data?.cartCreate?.cart ?? null;
}

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await cartFetch<{ cart: ShopifyCart | null }>(GET_CART_QUERY, {
    cartId,
  });
  return data?.cart ?? null;
}

export async function getOrCreateCart(): Promise<ShopifyCart | null> {
  if (typeof window === "undefined") return null;

  const existingId = localStorage.getItem(SHOPIFY_CART_ID_KEY);
  if (existingId) {
    const cart = await getCart(existingId);
    if (cart) return cart;
    localStorage.removeItem(SHOPIFY_CART_ID_KEY);
  }

  const newCart = await createCart();
  if (newCart) localStorage.setItem(SHOPIFY_CART_ID_KEY, newCart.id);
  return newCart;
}

export async function cartLinesAdd(
  cartId: string,
  lines: {
    merchandiseId: string;
    quantity: number;
    attributes?: { key: string; value: string }[];
  }[],
): Promise<ShopifyCart | null> {
  const data = await cartFetch<{ cartLinesAdd: { cart: ShopifyCart } }>(
    CART_LINES_ADD_MUTATION,
    { cartId, lines },
  );
  return data?.cartLinesAdd?.cart ?? null;
}

export async function cartLinesUpdate(
  cartId: string,
  lines: { id: string; quantity: number }[],
): Promise<ShopifyCart | null> {
  const data = await cartFetch<{ cartLinesUpdate: { cart: ShopifyCart } }>(
    CART_LINES_UPDATE_MUTATION,
    { cartId, lines },
  );
  return data?.cartLinesUpdate?.cart ?? null;
}

export async function cartLinesRemove(
  cartId: string,
  lineIds: string[],
): Promise<ShopifyCart | null> {
  const data = await cartFetch<{ cartLinesRemove: { cart: ShopifyCart } }>(
    CART_LINES_REMOVE_MUTATION,
    { cartId, lineIds },
  );
  return data?.cartLinesRemove?.cart ?? null;
}

export type ShopifyBuyerAddress = {
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  city: string;
  province: string;
  zip: string;
  country?: string;
};

export async function updateCartBuyerIdentity(
  cartId: string,
  input: {
    email: string;
    phone?: string;
    countryCode?: string;
    address?: ShopifyBuyerAddress;
  },
): Promise<ShopifyCart | null> {
  const buyerIdentity: Record<string, unknown> = {
    email: input.email,
    countryCode: input.countryCode ?? "IN",
  };

  if (input.phone) buyerIdentity.phone = input.phone;

  if (input.address) {
    buyerIdentity.deliveryAddressPreferences = [
      {
        deliveryAddress: {
          firstName: input.address.firstName,
          lastName: input.address.lastName,
          phone: input.address.phone,
          address1: input.address.address1,
          city: input.address.city,
          province: input.address.province,
          zip: input.address.zip,
          country: input.address.country ?? "India",
        },
        oneTimeUse: true,
      },
    ];
  }

  const data = await cartFetch<{
    cartBuyerIdentityUpdate: { cart: ShopifyCart };
  }>(CART_BUYER_IDENTITY_MUTATION, {
    cartId,
    buyerIdentity,
  });
  return data?.cartBuyerIdentityUpdate?.cart ?? null;
}

export async function updateCartBuyerEmail(
  cartId: string,
  email: string,
  countryCode = "IN",
): Promise<ShopifyCart | null> {
  return updateCartBuyerIdentity(cartId, { email, countryCode });
}

/** True when Shopify Storefront API can be reached. */
export function isShopifyCartEnabled(): boolean {
  return Boolean(SHOPIFY_DOMAIN());
}
