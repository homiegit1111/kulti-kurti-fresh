// Server-only Shopify Admin API helpers.
//
// Must ONLY be imported from:
//   - Next.js API route handlers (src/app/api/...)
//   - Server Components or Server Actions
//
// Never import this from a "use client" component — it reads private tokens.

// ── Config ─────────────────────────────────────────────────────────────────────

const SHOPIFY_DOMAIN = (): string =>
  (process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "").replace(/\/+$/, "");

const ADMIN_TOKEN = (): string =>
  (process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || "").trim();

const ADMIN_CLIENT_ID = (): string =>
  (process.env.SHOPIFY_ADMIN_CLIENT_ID || "").trim();

const ADMIN_CLIENT_SECRET = (): string =>
  (process.env.SHOPIFY_ADMIN_CLIENT_SECRET || "").trim();

const API_VERSION = (): string =>
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || "2026-04";

let cachedAdminToken: { token: string; expiresAt: number } | null = null;

/** True when either a fixed Admin token or client credentials are configured. */
export const isShopifyAdminConfigured = (): boolean =>
  Boolean(
    SHOPIFY_DOMAIN() &&
    (ADMIN_TOKEN() || (ADMIN_CLIENT_ID() && ADMIN_CLIENT_SECRET())),
  );

// ── Shared types ───────────────────────────────────────────────────────────────

export type ShopifyAdminCustomer = {
  id: number;
  gid: string; // e.g. "gid://shopify/Customer/123"
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  state: string;
  tags: string;
  created_at: string;
};

export type ShopifyAdminOrder = {
  id: number;
  name: string; // e.g. "#1001"
  order_number: number;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  created_at: string;
  line_items: {
    id: number;
    title: string;
    quantity: number;
    price: string;
    variant_title: string | null;
    sku: string | null;
  }[];
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  } | null;
};

// ── Error class ────────────────────────────────────────────────────────────────

export class ShopifyAdminError extends Error {
  readonly status: number;
  readonly details: unknown;
  constructor(msg: string, status: number, details?: unknown) {
    super(msg);
    this.name = "ShopifyAdminError";
    this.status = status;
    this.details = details;
  }
}

// ── Internal REST fetch ────────────────────────────────────────────────────────

async function getAdminAccessToken(): Promise<string> {
  const fixedToken = ADMIN_TOKEN();
  if (fixedToken) return fixedToken;

  const domain = SHOPIFY_DOMAIN();
  const clientId = ADMIN_CLIENT_ID();
  const clientSecret = ADMIN_CLIENT_SECRET();

  if (!domain || !clientId || !clientSecret) {
    throw new ShopifyAdminError(
      "Shopify Admin API is not configured. Set SHOPIFY_ADMIN_API_ACCESS_TOKEN or SHOPIFY_ADMIN_CLIENT_ID/SHOPIFY_ADMIN_CLIENT_SECRET.",
      500,
    );
  }

  const now = Date.now();
  if (cachedAdminToken && cachedAdminToken.expiresAt > now + 60_000) {
    return cachedAdminToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  let res: Response;
  try {
    res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch (networkErr) {
    const msg =
      networkErr instanceof Error ? networkErr.message : "Network error";
    throw new ShopifyAdminError(`Cannot get Shopify Admin token: ${msg}`, 503);
  }

  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  } | null;

  if (!res.ok || !json?.access_token) {
    throw new ShopifyAdminError(
      json?.error || `Shopify Admin token request failed: ${res.status}`,
      res.status,
      json,
    );
  }

  cachedAdminToken = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 86_399) * 1000,
  };

  return cachedAdminToken.token;
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAdminAccessToken();
  const domain = SHOPIFY_DOMAIN();

  if (!domain) {
    throw new ShopifyAdminError(
      "Shopify Admin API is not configured. Set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN.",
      500,
    );
  }

  const headers = new Headers(init.headers as HeadersInit);
  headers.set("Accept", "application/json");
  headers.set("X-Shopify-Access-Token", token);
  if (init.body) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`https://${domain}/admin/api/${API_VERSION()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (networkErr) {
    const msg =
      networkErr instanceof Error ? networkErr.message : "Network error";
    throw new ShopifyAdminError(`Cannot reach Shopify Admin: ${msg}`, 503);
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!res.ok) {
    const errMsg =
      typeof body === "object" && body !== null
        ? ((body as Record<string, unknown>).errors as string) ||
          `Shopify Admin ${res.status}`
        : `Shopify Admin ${res.status}`;
    throw new ShopifyAdminError(errMsg, res.status, body);
  }

  return body as T;
}

// ── Customer helpers ───────────────────────────────────────────────────────────

/**
 * Find a Shopify customer by exact email.
 * Returns the first match or null.
 */
export async function findShopifyCustomerByEmail(
  email: string,
): Promise<ShopifyAdminCustomer | null> {
  const data = await adminFetch<{
    customers: ShopifyAdminCustomer[];
  }>(`/customers/search.json?query=email:${encodeURIComponent(email)}&limit=1`);

  return data.customers?.[0] ?? null;
}

/**
 * Create a new Shopify customer.
 * Returns the created customer.
 */
export async function createShopifyCustomer(opts: {
  email: string;
  firstName?: string;
  lastName?: string;
  supabaseUserId?: string;
}): Promise<ShopifyAdminCustomer> {
  const data = await adminFetch<{ customer: ShopifyAdminCustomer }>(
    "/customers.json",
    {
      method: "POST",
      body: JSON.stringify({
        customer: {
          email: opts.email.toLowerCase().trim(),
          first_name: opts.firstName || "",
          last_name: opts.lastName || "",
          tags: opts.supabaseUserId
            ? `supabase_id:${opts.supabaseUserId}`
            : "storefront",
          verified_email: true,
          accepts_marketing: false,
        },
      }),
    },
  );

  return data.customer;
}

/**
 * Find or create a Shopify customer for a Supabase-authenticated user.
 * This is idempotent — safe to call on every login.
 */
export async function ensureShopifyCustomer(opts: {
  email: string;
  firstName?: string;
  lastName?: string;
  supabaseUserId: string;
}): Promise<ShopifyAdminCustomer> {
  const existing = await findShopifyCustomerByEmail(opts.email);
  if (existing) return existing;

  try {
    return await createShopifyCustomer(opts);
  } catch (err) {
    if (
      err instanceof ShopifyAdminError &&
      (err.status === 422 ||
        String(err.details).toLowerCase().includes("taken"))
    ) {
      // Race condition — find again
      const retry = await findShopifyCustomerByEmail(opts.email);
      if (retry) return retry;
    }
    throw err;
  }
}

// ── Order helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch all orders for a customer by their Shopify customer ID.
 * Returns empty array on error.
 */
export async function getOrdersByCustomerId(
  customerId: number,
  limit = 20,
): Promise<ShopifyAdminOrder[]> {
  try {
    const data = await adminFetch<{ orders: ShopifyAdminOrder[] }>(
      `/orders.json?customer_id=${customerId}&status=any&limit=${limit}&fields=id,name,order_number,financial_status,fulfillment_status,total_price,currency,created_at,line_items,shipping_address`,
    );
    return data.orders ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch orders for a customer by email (Admin search).
 * Slower than by ID — use this when we don't have the customer ID yet.
 */
export async function getOrdersByEmail(
  email: string,
  limit = 20,
): Promise<ShopifyAdminOrder[]> {
  try {
    const customer = await findShopifyCustomerByEmail(email);
    if (!customer) return [];
    return getOrdersByCustomerId(customer.id, limit);
  } catch {
    return [];
  }
}
