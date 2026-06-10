import { isShopifyConfigured } from "./shopify";

const SHOPIFY_DOMAIN = (): string =>
  (process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "").replace(/\/+$/, "");

const STOREFRONT_TOKEN = (): string =>
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || "";

const API_VERSION = (): string =>
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || "2024-04";

const endpoint = () =>
  `https://${SHOPIFY_DOMAIN()}/api/${API_VERSION()}/graphql.json`;

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export async function shopifyAuthFetch<T>(
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
      cache: "no-store", // Never cache auth calls
    });

    if (!res.ok) return null;

    const json = (await res.json()) as GqlResponse<T>;
    if (json.errors?.length) {
      if (process.env.NODE_ENV === "development") {
        console.error("[shopify auth]", json.errors[0]?.message);
      }
      throw new Error(json.errors[0]?.message || "Shopify API Error");
    }
    return json.data ?? null;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Failed to communicate with Shopify");
  }
}

// ── Mutations & Queries ────────────────────────────────────────────────────────

const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        firstName
        lastName
        email
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

const CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

const CUSTOMER_QUERY = `
  query customer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
    }
  }
`;

// ── Exported Methods ───────────────────────────────────────────────────────────

export async function registerCustomer(input: Record<string, unknown>) {
  const data = await shopifyAuthFetch<{ customerCreate?: { customerUserErrors?: any[], customer?: any } }>(CUSTOMER_CREATE_MUTATION, { input });
  
  const errors = data?.customerCreate?.customerUserErrors;
  if (errors && errors.length > 0) {
    throw new Error(errors[0].message);
  }
  
  return data?.customerCreate?.customer;
}

export async function loginCustomer(input: Record<string, unknown>) {
  const data = await shopifyAuthFetch<{ customerAccessTokenCreate?: { customerUserErrors?: any[], customerAccessToken?: any } }>(CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION, { input });
  
  const errors = data?.customerAccessTokenCreate?.customerUserErrors;
  if (errors && errors.length > 0) {
    throw new Error(errors[0].message);
  }
  
  return data?.customerAccessTokenCreate?.customerAccessToken;
}

export async function getCustomer(customerAccessToken: string) {
  const data = await shopifyAuthFetch<{ customer?: any }>(CUSTOMER_QUERY, { customerAccessToken });
  return data?.customer;
}
