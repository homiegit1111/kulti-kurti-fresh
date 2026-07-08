import type {
  CommerceAdapter,
  CommerceCheckoutCartSummary,
  CommerceCollection,
  CommerceCheckoutDraft,
  CommerceCheckoutResult,
  CommerceOrderCompletionResult,
  CommerceProduct,
  ProductQuery,
} from "./types";
import { buyerIdentityMetadata } from "./buyer-identity";

type MedusaImage = { url?: string };
type MedusaMetadata = Record<string, unknown>;
type MedusaPrice = { amount?: number; calculated_amount?: number };
type MedusaVariant = {
  id?: string;
  title?: string;
  prices?: MedusaPrice[];
  calculated_price?: MedusaPrice;
  options?: { option?: { title?: string }; value?: string }[];
  sku?: string;
  metadata?: MedusaMetadata;
};
type MedusaProduct = {
  id?: string;
  title?: string;
  handle?: string;
  description?: string | null;
  thumbnail?: string | null;
  images?: MedusaImage[];
  variants?: MedusaVariant[];
  metadata?: MedusaMetadata;
  collection?: { handle?: string };
  type?: { value?: string };
};
type MedusaCollection = {
  id?: string;
  title?: string;
  handle?: string;
  metadata?: { image?: string; description?: string };
};
type MedusaCartLineItem = {
  id?: string;
  quantity?: number;
  variant_id?: string;
  title?: string;
  metadata?: Record<string, unknown>;
};
type MedusaCartCustomer = {
  id?: string;
  email?: string;
};
type MedusaAddress = {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  city?: string | null;
  country_code?: string | null;
  postal_code?: string | null;
  phone?: string | null;
};
type MedusaCart = {
  id?: string;
  items?: MedusaCartLineItem[];
  subtotal?: number;
  item_subtotal?: number;
  total?: number;
  currency_code?: string;
  customer?: MedusaCartCustomer | null;
  email?: string | null;
  completed_at?: string | null;
  shipping_address?: MedusaAddress | null;
  shipping_methods?: { id?: string; shipping_option_id?: string }[];
  metadata?: Record<string, unknown> | null;
};
type MedusaShippingOption = {
  id?: string;
  name?: string;
  amount?: number;
};
type MedusaPaymentCollection = {
  id?: string;
  payment_sessions?: { id?: string; provider_id?: string }[];
};
type MedusaOrder = {
  id?: string;
  display_id?: number;
  status?: string;
  payment_status?: string;
  total?: number;
  currency_code?: string;
};
type MedusaCompleteResponse = {
  type?: "order" | "cart";
  order?: MedusaOrder;
  cart?: MedusaCart;
  error?: string;
  message?: string;
};
type MedusaMutationResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

const MEDUSA_PRODUCT_FIELDS =
  "id,title,handle,description,thumbnail,metadata,*images,*variants,*type,*collection";

const MEDUSA_URL = () =>
  (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    ""
  ).replace(/\/+$/, "");

const MEDUSA_PUBLISHABLE_KEY = () =>
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const MEDUSA_REGION_ID = () =>
  process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || process.env.MEDUSA_REGION_ID || "";
const MEDUSA_SALES_CHANNEL_ID = () =>
  process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID ||
  process.env.MEDUSA_SALES_CHANNEL_ID ||
  "";
const MEDUSA_INTERNAL_SECRET = () =>
  process.env.RANGAT_MEDUSA_INTERNAL_SECRET ||
  process.env.MEDUSA_INTERNAL_API_SECRET ||
  "";

function medusaStoreQuery(
  query?: Record<string, string | number | undefined>,
): Record<string, string | number | undefined> {
  const regionId = MEDUSA_REGION_ID();
  return {
    ...(regionId ? { region_id: regionId } : {}),
    ...query,
  };
}

export function isMedusaConfigured(): boolean {
  return Boolean(MEDUSA_URL());
}

async function medusaFetch<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<T | null> {
  const baseUrl = MEDUSA_URL();
  if (!baseUrl) return null;

  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const publishableKey = MEDUSA_PUBLISHABLE_KEY();
  if (publishableKey) headers["x-publishable-api-key"] = publishableKey;

  try {
    const res = await fetch(url, { headers, next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function medusaFetchNoStore<T>(path: string): Promise<T | null> {
  const baseUrl = MEDUSA_URL();
  if (!baseUrl) return null;

  const headers: Record<string, string> = { Accept: "application/json" };
  const publishableKey = MEDUSA_PUBLISHABLE_KEY();
  if (publishableKey) headers["x-publishable-api-key"] = publishableKey;

  try {
    const res = await fetch(`${baseUrl}${path}`, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getMedusaCart(cartId: string): Promise<MedusaCart | null> {
  const data = await medusaFetchNoStore<{ cart?: MedusaCart }>(
    `/store/carts/${encodeURIComponent(cartId)}`,
  );
  return data?.cart ?? null;
}

function manualShippingAddressFromCart(cart: MedusaCart): MedusaAddress {
  const buyerName = metadataString(cart.metadata ?? undefined, "buyer_name") ?? "";
  const [first, ...rest] = buyerName.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: first || "Wholesale",
    last_name: rest.join(" ") || "Buyer",
    address_1:
      metadataString(cart.metadata ?? undefined, "business_name") || "Wholesale dispatch",
    city: metadataString(cart.metadata ?? undefined, "city") || "Jaipur",
    country_code: "in",
    postal_code: "302001",
    phone: metadataString(cart.metadata ?? undefined, "phone") || "",
  };
}

async function ensureManualPaymentSession(
  cartId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const collection = await medusaStoreMutation<{
    payment_collection?: MedusaPaymentCollection;
  }>("/store/payment-collections", { cart_id: cartId });

  const collectionId = collection.data?.payment_collection?.id;
  if (!collection.ok || !collectionId) {
    return {
      ok: false,
      status: collection.status,
      error: collection.error || "Could not create a payment collection for the cart.",
    };
  }

  const session = await medusaStoreMutation<{
    payment_collection?: MedusaPaymentCollection;
  }>(`/store/payment-collections/${collectionId}/payment-sessions`, {
    provider_id: "pp_system_default",
  });

  if (!session.ok) {
    return {
      ok: false,
      status: session.status,
      error:
        session.error ||
        "Could not initialize the manual (pp_system_default) payment session.",
    };
  }

  return { ok: true };
}

async function medusaStoreMutation<T>(
  path: string,
  body?: Record<string, unknown>,
): Promise<MedusaMutationResult<T>> {
  const baseUrl = MEDUSA_URL();
  if (!baseUrl) {
    return { ok: false, status: 0, error: "Medusa backend URL is not configured." };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const publishableKey = MEDUSA_PUBLISHABLE_KEY();
  if (publishableKey) headers["x-publishable-api-key"] = publishableKey;

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data.message || data.error || `Medusa Store API returned ${res.status}.`,
      };
    }

    return { ok: true, status: res.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Medusa Store API request failed.",
    };
  }
}

type MedusaCustomerLinkResult = {
  ok: boolean;
  status: number;
  code?: string;
  customerId?: string;
  customerEmail?: string;
  error?: string;
};

async function linkMedusaWholesaleCustomer(
  cartId: string,
  draft: CommerceCheckoutDraft,
): Promise<MedusaCustomerLinkResult> {
  const baseUrl = MEDUSA_URL();
  const secret = MEDUSA_INTERNAL_SECRET();
  if (!baseUrl || !secret) {
    return {
      ok: false,
      status: 0,
      code: "CUSTOMER_LINK_SKIPPED",
      error: "Medusa internal customer linking is not configured.",
    };
  }

  try {
    const publishableKey = MEDUSA_PUBLISHABLE_KEY();
    const res = await fetch(`${baseUrl}/store/rangat/customer-link`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
        "x-rangat-internal-secret": secret,
      },
      body: JSON.stringify({
        cartId,
        buyer: draft.buyer ?? {},
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      customer?: { id?: string; email?: string };
    };

    return {
      ok: res.ok,
      status: res.status,
      code: data.code,
      customerId: data.customer?.id,
      customerEmail: data.customer?.email,
      error: data.message || (!res.ok ? `Medusa customer link returned ${res.status}.` : undefined),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      code: "CUSTOMER_LINK_FAILED",
      error:
        error instanceof Error
          ? error.message
          : "Medusa customer link request failed.",
    };
  }
}

function summarizeMedusaCart(cart?: MedusaCart): CommerceCheckoutCartSummary | undefined {
  if (!cart?.id) return undefined;
  const items = cart.items ?? [];
  return {
    id: cart.id,
    lineCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
    subtotal: normalizeAmount(cart.subtotal ?? cart.item_subtotal),
    total: normalizeAmount(cart.total),
    currencyCode: cart.currency_code?.toUpperCase(),
    customerId: cart.customer?.id,
  };
}
function normalizeAmount(value?: number): number {
  if (!Number.isFinite(value)) return 0;
  const amount = Number(value);
  return amount > 10000 ? Math.round(amount / 100) : Math.round(amount);
}

function variantSizeMap(variants: MedusaVariant[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const variant of variants) {
    const size =
      variant.options?.find((option) =>
        option.option?.title?.toLowerCase().includes("size"),
      )?.value ?? variant.title;
    if (size && variant.id) map[size] = variant.id;
  }
  return map;
}

function metadataString(
  metadata: MedusaMetadata | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function mapMedusaProduct(product: MedusaProduct): CommerceProduct {
  const variants = product.variants ?? [];
  const firstVariant = variants[0];
  const variantIds = variantSizeMap(variants);
  const category = metadataString(product.metadata, "category") ?? product.type?.value ?? "Kurtis";
  const color =
    metadataString(product.metadata, "color_family") ??
    metadataString(firstVariant?.metadata, "color") ??
    "ivory";
  const rawSalePrice =
    firstVariant?.calculated_price?.calculated_amount ??
    firstVariant?.calculated_price?.amount ??
    firstVariant?.prices?.[0]?.amount;
  const price = normalizeAmount(rawSalePrice);
  const images = [
    product.thumbnail,
    ...(product.images ?? []).map((image) => image.url),
  ].filter((url): url is string => Boolean(url));

  return {
    id: product.id ?? product.handle ?? "medusa-product",
    title: product.title ?? "Untitled wholesale style",
    handle: product.handle ?? product.id ?? "untitled-style",
    description: product.description ?? "",
    price,
    salePrice: null,
    image: images[0] ?? "/images/product-1.png",
    images: images.length ? images : ["/images/product-1.png"],
    colors: [color],
    isNew: false,
    category,
    sizes: Object.keys(variantIds).length ? Object.keys(variantIds) : ["S", "M", "L", "XL"],
    variantId: firstVariant?.id,
    variantIds: Object.keys(variantIds).length ? variantIds : undefined,
    collectionHandle: product.collection?.handle,
    availableForSale: true,
  };
}

function medusaCheckoutPreflight(
  draft: CommerceCheckoutDraft,
): CommerceCheckoutResult | null {
  if (!isMedusaConfigured()) {
    return {
      ok: false,
      reason: "Medusa backend URL is not configured.",
    };
  }

  if (!MEDUSA_REGION_ID()) {
    return {
      ok: false,
      reason:
        "Medusa region id is required before creating Store API carts. Set NEXT_PUBLIC_MEDUSA_REGION_ID or MEDUSA_REGION_ID.",
    };
  }

  const missingVariantLines = draft.lines.filter((line) => !line.variantId);
  if (missingVariantLines.length > 0) {
    return {
      ok: false,
      reason: `Medusa cart creation requires Medusa variant ids for every line. Missing: ${missingVariantLines
        .map((line) => line.handle)
        .join(", ")}`,
    };
  }

  return null;
}

export const medusaCommerceAdapter: CommerceAdapter = {
  backend: "medusa",

  async getProducts(input?: ProductQuery) {
    const data = await medusaFetch<{ products?: MedusaProduct[] }>(
      "/store/products",
      medusaStoreQuery({
        limit: input?.limit ?? 12,
        q: input?.category,
        fields: MEDUSA_PRODUCT_FIELDS,
      }),
    );
    return data?.products?.map(mapMedusaProduct) ?? [];
  },

  async getProductByHandle(handle) {
    const data = await medusaFetch<{ products?: MedusaProduct[] }>(
      "/store/products",
      medusaStoreQuery({ handle, limit: 1, fields: MEDUSA_PRODUCT_FIELDS }),
    );
    const product = data?.products?.[0];
    return product ? mapMedusaProduct(product) : null;
  },

  async getCollections(): Promise<CommerceCollection[]> {
    const data = await medusaFetch<{ collections?: MedusaCollection[] }>(
      "/store/collections",
    );
    return (
      data?.collections?.map((collection) => ({
        id: collection.id ?? collection.handle ?? "medusa-collection",
        title: collection.title ?? "Wholesale Collection",
        handle: collection.handle ?? collection.id ?? "wholesale-collection",
        image: collection.metadata?.image ?? "/images/collection-summer.png",
        itemCount: 0,
        description: collection.metadata?.description ?? "",
      })) ?? []
    );
  },

  async getProductsByCollection(handle, limit = 20) {
    const data = await medusaFetch<{ products?: MedusaProduct[] }>(
      "/store/products",
      medusaStoreQuery({
        collection_handle: handle,
        limit,
        fields: MEDUSA_PRODUCT_FIELDS,
      }),
    );
    return data?.products?.map(mapMedusaProduct) ?? [];
  },

  async searchProducts(query) {
    if (!query.trim()) return [];
    const data = await medusaFetch<{ products?: MedusaProduct[] }>(
      "/store/products",
      medusaStoreQuery({
        q: query.trim(),
        limit: 20,
        fields: MEDUSA_PRODUCT_FIELDS,
      }),
    );
    return data?.products?.map(mapMedusaProduct) ?? [];
  },

  async createCheckoutSession(draft) {
    const preflight = medusaCheckoutPreflight(draft);
    if (preflight) return preflight;

    const salesChannelId = MEDUSA_SALES_CHANNEL_ID();
    const expectedQuantity = draft.lines.reduce((sum, line) => sum + line.quantity, 0);
    const cartResponse = await medusaStoreMutation<{ cart?: MedusaCart }>(
      "/store/carts",
      {
        region_id: MEDUSA_REGION_ID(),
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        email: draft.buyer?.email || undefined,
        metadata: {
          source: draft.source,
          ...buyerIdentityMetadata(draft.buyer),
          business_name: draft.buyer?.businessName ?? "",
          buyer_name: draft.buyer?.name ?? "",
          city: draft.buyer?.city ?? "",
          phone: draft.buyer?.phone ?? "",
          gstin: draft.buyer?.gstin ?? "",
          expected_line_count: draft.lines.length,
          expected_total_sets: expectedQuantity,
        },
      },
    );

    const cartId = cartResponse.data?.cart?.id;
    if (!cartResponse.ok || !cartId) {
      return {
        ok: false,
        reason:
          cartResponse.error ||
          "Medusa cart could not be created. Verify backend URL, publishable key, region, CORS, and database status.",
        diagnostics: {
          medusa_status: cartResponse.status,
          expected_line_count: draft.lines.length,
          expected_total_sets: expectedQuantity,
        },
      };
    }

    let latestCart = cartResponse.data?.cart;
    const customerLink = await linkMedusaWholesaleCustomer(cartId, draft);
    for (const line of draft.lines) {
      const lineResponse = await medusaStoreMutation<{ cart?: MedusaCart }>(
        `/store/carts/${cartId}/line-items`,
        {
          variant_id: line.variantId,
          quantity: line.quantity,
          metadata: line.metadata ?? {},
        },
      );

      latestCart = lineResponse.data?.cart ?? latestCart;

      if (!lineResponse.ok || !lineResponse.data?.cart?.id) {
        return {
          ok: false,
          orderId: cartId,
          cart: summarizeMedusaCart(latestCart),
          reason:
            lineResponse.error ||
            `Medusa cart was created, but line ${line.handle} could not be added.`,
          diagnostics: {
            medusa_status: lineResponse.status,
            failed_line_handle: line.handle,
            failed_variant_id: line.variantId ?? null,
            expected_line_count: draft.lines.length,
            expected_total_sets: expectedQuantity,
            customer_link_ok: customerLink.ok,
            customer_link_status: customerLink.status,
            customer_link_code: customerLink.code ?? null,
            medusa_customer_id: customerLink.customerId ?? null,
          },
        };
      }
    }

    const cart = summarizeMedusaCart(latestCart);
    if (cart && cart.totalQuantity !== expectedQuantity) {
      return {
        ok: false,
        orderId: cartId,
        cart,
        reason: "Medusa cart quantity does not match the wholesale checkout draft.",
        diagnostics: {
          expected_total_sets: expectedQuantity,
          actual_total_sets: cart.totalQuantity,
          expected_line_count: draft.lines.length,
          actual_line_count: cart.lineCount,
          customer_link_ok: customerLink.ok,
          customer_link_status: customerLink.status,
          customer_link_code: customerLink.code ?? null,
          medusa_customer_id: customerLink.customerId ?? null,
        },
      };
    }

    return {
      ok: true,
      orderId: cartId,
      cart,
      diagnostics: {
        expected_line_count: draft.lines.length,
        expected_total_sets: expectedQuantity,
        customer_link_ok: customerLink.ok,
        customer_link_status: customerLink.status,
        customer_link_code: customerLink.code ?? null,
        medusa_customer_id: customerLink.customerId ?? cart?.customerId ?? null,
      },
      message:
        "Medusa cart created. Payment collection and Razorpay provider wiring are the next Phase 2 step.",
    };
  },

  async completeManualOrder(cartId): Promise<CommerceOrderCompletionResult> {
    if (!isMedusaConfigured()) {
      return { ok: false, cartId, reason: "Medusa backend URL is not configured." };
    }

    const cart = await getMedusaCart(cartId);
    if (!cart?.id) {
      return { ok: false, cartId, reason: "Medusa cart could not be loaded." };
    }
    if (cart.completed_at) {
      return {
        ok: false,
        cartId,
        reason: "This cart has already been completed into an order.",
      };
    }
    if (!cart.items?.length) {
      return { ok: false, cartId, reason: "Cart has no line items to order." };
    }

    if (!cart.shipping_address?.country_code) {
      const address = manualShippingAddressFromCart(cart);
      const update = await medusaStoreMutation<{ cart?: MedusaCart }>(
        `/store/carts/${cartId}`,
        { shipping_address: address, billing_address: address },
      );
      if (!update.ok) {
        return {
          ok: false,
          cartId,
          reason: update.error || "Could not set a shipping address on the cart.",
          diagnostics: { medusa_status: update.status },
        };
      }
    }

    if (!cart.shipping_methods?.length) {
      const options = await medusaFetchNoStore<{
        shipping_options?: MedusaShippingOption[];
      }>(`/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`);
      const option = options?.shipping_options?.[0];
      if (!option?.id) {
        return {
          ok: false,
          cartId,
          reason:
            "No shipping option is available for this cart. Confirm the sales channel has a stock location with a matching fulfillment service zone.",
        };
      }
      const shipping = await medusaStoreMutation<{ cart?: MedusaCart }>(
        `/store/carts/${cartId}/shipping-methods`,
        { option_id: option.id },
      );
      if (!shipping.ok) {
        return {
          ok: false,
          cartId,
          reason: shipping.error || "Could not add a shipping method to the cart.",
          diagnostics: { medusa_status: shipping.status, shipping_option_id: option.id },
        };
      }
    }

    const paymentSession = await ensureManualPaymentSession(cartId);
    if (!paymentSession.ok) {
      return {
        ok: false,
        cartId,
        reason: paymentSession.error,
        diagnostics: { medusa_status: paymentSession.status },
      };
    }

    const completion = await medusaStoreMutation<MedusaCompleteResponse>(
      `/store/carts/${cartId}/complete`,
    );
    if (!completion.ok) {
      return {
        ok: false,
        cartId,
        reason: completion.error || "Medusa cart completion failed.",
        diagnostics: { medusa_status: completion.status },
      };
    }

    const payload = completion.data;
    if (payload?.type !== "order" || !payload.order?.id) {
      return {
        ok: false,
        cartId,
        reason:
          payload?.error ||
          payload?.message ||
          "Cart completion did not produce an order. It may need review in the Medusa admin.",
        diagnostics: { completion_type: payload?.type ?? null },
      };
    }

    const order = payload.order;
    return {
      ok: true,
      cartId,
      orderId: order.id,
      displayId: order.display_id,
      status: order.status,
      paymentStatus: order.payment_status,
      total: normalizeAmount(order.total),
      currencyCode: order.currency_code?.toUpperCase(),
      message: `Order #${order.display_id ?? order.id} placed. Payment is marked pending for manual collection (COD).`,
    };
  },
};
