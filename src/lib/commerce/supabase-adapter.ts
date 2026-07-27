import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { calculateWholesaleTotals } from "@/lib/b2b/pricing";
import { effectiveSetPrice } from "./sale-price";
import type { CartItem } from "@/lib/cart-context";
import type {
  CommerceAdapter,
  CommerceCheckoutCartSummary,
  CommerceCheckoutDraft,
  CommerceCheckoutResult,
  CommerceCollection,
  CommerceOrderCompletionResult,
  CommercePaymentAttemptResult,
  CommercePaidOrderInput,
  CommerceProduct,
  ProductQuery,
} from "./types";

/**
 * Supabase-backed commerce adapter — replaces Medusa as the source of truth for
 * catalog + orders. Runs SERVER-SIDE only (uses the service-role client).
 *
 * SECURITY MODEL (the reason a hand-rolled backend is safe here):
 *  1. Prices live only in `commerce_product_variants.set_price_inr`, a table with
 *     no client write policy (RLS) — a client physically cannot mutate a price.
 *  2. `createCheckoutSession` RE-DERIVES every line's price from the catalog,
 *     ignoring whatever unitPrice the draft carried, recomputes the wholesale
 *     tier discount server-side, and SNAPSHOTS the resulting total into the order
 *     row. That snapshot — never a client number, never a later live re-read — is
 *     the authoritative charged amount.
 *  3. `completePaidOrder` reconciles the captured payment against the snapshot
 *     and relies on a unique(payment_transaction_id) index + a status-guarded
 *     conditional update as the double-charge / replay guard.
 *
 * Amounts: catalog + order totals are whole rupees (INR major units). Paise (×100)
 * appears only at the payment-reconciliation boundary, matching the Razorpay/
 * PhonePe captured-amount convention.
 */

const PLACEHOLDER_IMAGE = "/images/product-1.png";

type VariantRow = {
  id: string;
  size: string;
  sku: string | null;
  set_price_inr: number;
  /** Optional sale price. The window that activates it lives on the product. */
  sale_price_inr?: number | null;
  inventory_quantity: number;
  manage_inventory: boolean;
  allow_backorder: boolean;
  position: number;
  archived_at?: string | null;
};

type ProductRow = {
  id: string;
  handle: string;
  title: string;
  description: string;
  thumbnail: string | null;
  images: string[];
  category: string;
  color_family: string;
  is_new: boolean;
  status: string;
  collection_handle: string | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  badge_label?: string | null;
  variants: VariantRow[] | null;
};

type CollectionRow = {
  subtitle?: string | null;
  body?: string | null;
  status?: string | null;
  id: string;
  handle: string;
  title: string;
  image: string | null;
  description: string;
};

const PRODUCT_SELECT =
  "id,handle,title,description,thumbnail,images,category,color_family,is_new,status,collection_handle," +
  "sale_starts_at,sale_ends_at,badge_label," +
  "variants:commerce_product_variants(id,size,sku,set_price_inr,sale_price_inr,inventory_quantity,manage_inventory,allow_backorder,position,archived_at)";

export function isSupabaseCommerceConfigured(): boolean {
  // Server-side adapter: needs the service-role client for both catalog reads
  // (RLS-bypassing, but we always filter status='published' ourselves) and the
  // service-role checkout/order writes.
  return isServiceRoleConfigured();
}

function client(): SupabaseClient | null {
  return createServiceRoleClient();
}

/** A variant is buyable per the same rule the Medusa adapter used. */
function isVariantInStock(v: VariantRow): boolean {
  if (v.archived_at) return false;
  if (v.manage_inventory === false) return true;
  if (v.allow_backorder === true) return true;
  return (v.inventory_quantity ?? 0) > 0;
}

function mapProductRow(row: ProductRow): CommerceProduct {
  const variants = [...(row.variants ?? [])].filter((variant) => !variant.archived_at).sort(
    (a, b) => a.position - b.position,
  );
  // Representative set price = lowest variant price, matching how the storefront
  // treats a wholesale style's "set price". getBaseSetPrice(product) then agrees
  // with this at re-pricing time.
  const priceCandidates = variants
    .map((v) => v.set_price_inr)
    .filter((n) => Number.isFinite(n) && n > 0);
  const price = priceCandidates.length ? Math.min(...priceCandidates) : 0;

  // Sale pricing. The sale WINDOW is a product-level property; the sale PRICE is
  // per variant, because a 3XL and an S do not have to be discounted equally.
  //
  // This must stay in step with public.create_commerce_checkout, which prices
  // each line through the same rule (see
  // supabase/20260726_configurable_pricing_and_sales.sql). Until that pair
  // existed, a sale set in the admin was charged but never displayed — the
  // buyer saw the list price and was debited less, and the two numbers on the
  // invoice disagreed.
  const saleWindow = {
    startsAt: row.sale_starts_at ?? null,
    endsAt: row.sale_ends_at ?? null,
  };
  const effectiveCandidates = variants
    .filter((v) => Number.isFinite(v.set_price_inr) && v.set_price_inr > 0)
    .map((v) => effectiveSetPrice(v.set_price_inr, v.sale_price_inr, saleWindow));
  const lowestEffective = effectiveCandidates.length
    ? Math.min(...effectiveCandidates)
    : 0;
  // salePrice stays null unless it is genuinely below the list price, because
  // getBaseSetPrice() reads `salePrice ?? price` and a redundant value would
  // print a struck-through "was" identical to the "now".
  const salePrice = lowestEffective > 0 && lowestEffective < price ? lowestEffective : null;

  const images = [row.thumbnail, ...(row.images ?? [])].filter(
    (u): u is string => Boolean(u),
  );

  const variantIds: Record<string, string> = {};
  const variantPrices: Record<string, number> = {};
  for (const v of variants) {
    if (v.size && v.id) variantIds[v.size] = v.id;
    // The EFFECTIVE price, so per-size re-pricing in the cart matches what
    // checkout will charge for that exact variant.
    if (v.id) {
      variantPrices[v.id] = effectiveSetPrice(
        v.set_price_inr,
        v.sale_price_inr,
        saleWindow,
      );
    }
  }

  const product: CommerceProduct = {
    id: row.id,
    title: row.title,
    handle: row.handle,
    description: row.description ?? "",
    price,
    salePrice,
    image: images[0] ?? PLACEHOLDER_IMAGE,
    images: images.length ? images : [PLACEHOLDER_IMAGE],
    colors: [row.color_family || "ivory"],
    isNew: Boolean(row.is_new),
    category: row.category || "Kurtis",
    sizes: Object.keys(variantIds).length
      ? Object.keys(variantIds)
      : [...B2B_CONFIG.sizeRatio],
    variantId: variants[0]?.id,
    variantIds: Object.keys(variantIds).length ? variantIds : undefined,
    variantPrices: Object.keys(variantPrices).length ? variantPrices : undefined,
    collectionHandle: row.collection_handle ?? undefined,
    availableForSale: variants.length > 0 && variants.some(isVariantInStock),
  };
  return product;
}

async function fetchPublishedProducts(
  db: SupabaseClient,
  opts: { category?: string; handle?: string; collectionHandle?: string; limit?: number },
): Promise<CommerceProduct[]> {
  let q = db
      .from("commerce_products")
      .select(PRODUCT_SELECT)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("rank", { ascending: true });

  if (opts.handle) q = q.eq("handle", opts.handle);
  if (opts.collectionHandle) q = q.eq("collection_handle", opts.collectionHandle);
  if (opts.category && opts.category !== "All") q = q.eq("category", opts.category);
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as ProductRow[]).map(mapProductRow);
}

/** Reconstruct minimal CartItems for the wholesale tier calculation. */
function toCartItems(
  lines: CommerceCheckoutDraft["lines"],
  unitPrices: number[],
): CartItem[] {
  return lines.map((line, index) => ({
    id: String(line.metadata?.local_line_id ?? line.productId),
    productId: line.productId,
    title: line.title,
    handle: line.handle,
    image: String(line.metadata?.image ?? ""),
    price: unitPrices[index] as number,
    salePrice: null,
    size: String(line.metadata?.size ?? SIZE_RATIO_LABEL),
    color: String(line.metadata?.color ?? "default"),
    quantity: line.quantity,
    variantId: line.variantId,
  })) as CartItem[];
}

function summarize(
  orderId: string,
  lineCount: number,
  totalSets: number,
  totalInr: number,
): CommerceCheckoutCartSummary {
  return {
    id: orderId,
    lineCount,
    totalQuantity: totalSets,
    subtotal: totalInr,
    total: totalInr,
    currencyCode: "INR",
  };
}

type SupabaseAdapterWithLegacy = CommerceAdapter & {
  legacyCreateCheckoutSession(
    draft: CommerceCheckoutDraft,
  ): Promise<CommerceCheckoutResult>;
  legacyBeginPaymentAttempt(
    cartId: string,
    provider: "razorpay" | "phonepe",
  ): Promise<{ ok: boolean; orderId?: string; reason?: string }>;
  legacyAttachPaymentOrder(cartId: string, providerOrderId: string): Promise<boolean>;
  legacyReleasePaymentAttempt(cartId: string): Promise<void>;
  legacyCompletePaidOrder(
    input: CommercePaidOrderInput,
  ): Promise<CommerceOrderCompletionResult>;
};

export const supabaseCommerceAdapter: SupabaseAdapterWithLegacy = {
  backend: "supabase",

  async getProducts(input?: ProductQuery) {
    const db = client();
    if (!db) return [];
    return fetchPublishedProducts(db, {
      category: input?.category,
      limit: input?.limit ?? 12,
    });
  },

  async getProductByHandle(handle) {
    const db = client();
    if (!db) return null;
    const products = await fetchPublishedProducts(db, { handle, limit: 1 });
    return products[0] ?? null;
  },

  async getCollections(): Promise<CommerceCollection[]> {
    const db = client();
    if (!db) return [];
    const { data, error } = await db
      .from("commerce_collections")
      .select("id,handle,title,image,description,subtitle,body,status")
      // This client is the SERVICE ROLE client, so it bypasses RLS — the
      // "published only" policy on commerce_collections does not apply to it.
      // The filter therefore has to be explicit, or a collection the owner is
      // still drafting in Admin Studio would appear on the storefront the moment
      // it is created.
      .eq("status", "published")
      .order("rank", { ascending: true });
    if (error || !data) return [];

    // itemCount = published products linked to the collection.
    const collections = data as CollectionRow[];
    const results: CommerceCollection[] = [];
    for (const c of collections) {
      const { count } = await db
        .from("commerce_products")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .is("deleted_at", null)
        .eq("collection_handle", c.handle);
      results.push({
        id: c.id,
        title: c.title,
        handle: c.handle,
        image: c.image ?? "/images/collection-summer.png",
        itemCount: count ?? 0,
        description: c.description ?? "",
        subtitle: c.subtitle ?? "",
        body: c.body ?? "",
      });
    }
    return results;
  },

  async getProductsByCollection(handle, limit = 20) {
    const db = client();
    if (!db) return [];
    return fetchPublishedProducts(db, { collectionHandle: handle, limit });
  },

  async searchProducts(query) {
    const db = client();
    if (!db) return [];
    // Sanitise before building a PostgREST .or() filter. Commas, parentheses,
    // backslashes, percent and star all have meaning in a PostgREST filter
    // string, so raw interpolation would let a caller inject extra filter
    // conditions (filter injection). Strip them to a plain search term; ilike
    // wildcards are added by us, not the user.
    const q = query
      .trim()
      .replace(/[,()\\%*:]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    if (!q) return [];
    const { data, error } = await db
      .from("commerce_products")
      .select(PRODUCT_SELECT)
      .eq("status", "published")
      .is("deleted_at", null)
      .or(`title.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(20);
    if (error || !data) return [];
    return (data as unknown as ProductRow[]).map(mapProductRow);
  },

  async createCheckoutSession(draft): Promise<CommerceCheckoutResult> {
    const db = client();
    if (!db) {
      return { ok: false, reason: "Supabase commerce backend is not configured." };
    }
    if (!draft.clerkUserId || !draft.checkoutIdempotencyKey) {
      return { ok: false, reason: "A signed-in buyer and secure checkout key are required." };
    }
    if (!draft.lines.length || draft.lines.some((line) => !line.variantId)) {
      return { ok: false, reason: "Every checkout line must select an available variant." };
    }

    const { data, error } = await db.rpc("create_commerce_checkout", {
      p_clerk_user_id: draft.clerkUserId,
      p_buyer: draft.buyer ?? {},
      p_lines: draft.lines.map((line) => ({
        variant_id: line.variantId,
        quantity: line.quantity,
        metadata: line.metadata ?? {},
      })),
      p_idempotency_key: draft.checkoutIdempotencyKey,
      p_hold_minutes: 30,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      return {
        ok: false,
        reason: error?.message || "Could not create a secure inventory hold.",
      };
    }
    const totalInr = Math.round(Number(row.amount_paise) / 100);
    return {
      ok: true,
      orderId: String(row.order_id),
      cart: summarize(
        String(row.order_id),
        draft.lines.length,
        draft.lines.reduce((sum, line) => sum + line.quantity, 0),
        totalInr,
      ),
      diagnostics: {
        cart_total: totalInr,
        inventory_hold_expires_at: String(row.expires_at),
      },
      message: "Order draft and inventory hold created securely.",
    };
  },

  async legacyCreateCheckoutSession(draft: CommerceCheckoutDraft): Promise<CommerceCheckoutResult> {
    const db = client();
    if (!db) {
      return { ok: false, reason: "Supabase commerce backend is not configured." };
    }
    if (!draft.lines.length) {
      return { ok: false, reason: "Cart is empty." };
    }

    // ── Re-derive every price from the catalog (ignore draft unitPrice) ──────
    // This is the tamper defence: the charged total is computed here from
    // set_price_inr, not trusted from the request.
    const resolvedLines: Array<{
      product: ProductRow;
      variant: VariantRow;
      unitPrice: number;
    }> = [];
    for (const line of draft.lines) {
      const { data, error } = await db
        .from("commerce_products")
        .select(PRODUCT_SELECT)
        .eq("status", "published")
        .eq("handle", line.handle)
        .maybeSingle();
      const product = data as unknown as ProductRow | null;
      const requestedSize = String(line.metadata?.size ?? SIZE_RATIO_LABEL);
      const variant = line.variantId
        ? product?.variants?.find((candidate) => candidate.id === line.variantId)
        : product?.variants?.find((candidate) => candidate.size === requestedSize) ??
          (product?.variants?.length === 1 ? product.variants[0] : undefined);
      if (
        error ||
        !product ||
        !variant ||
        !isVariantInStock(variant) ||
        !Number.isFinite(variant.set_price_inr) ||
        variant.set_price_inr <= 0
      ) {
        return {
          ok: false,
          reason: `A selected product variant is no longer available (${line.handle}). Please refresh your cart.`,
          diagnostics: { unavailable_handle: line.handle },
        };
      }
      resolvedLines.push({ product, variant, unitPrice: variant.set_price_inr });
    }

    const requestedSetsByVariant = new Map<string, number>();
    for (const [index, resolved] of resolvedLines.entries()) {
      requestedSetsByVariant.set(
        resolved.variant.id,
        (requestedSetsByVariant.get(resolved.variant.id) ?? 0) +
          draft.lines[index]!.quantity,
      );
    }
    for (const resolved of resolvedLines) {
      const requestedSets = requestedSetsByVariant.get(resolved.variant.id) ?? 0;
      if (
        resolved.variant.manage_inventory &&
        !resolved.variant.allow_backorder &&
        requestedSets > resolved.variant.inventory_quantity
      ) {
        return {
          ok: false,
          reason: `Insufficient stock for ${resolved.product.handle}. Please refresh your cart.`,
          diagnostics: { unavailable_handle: resolved.product.handle },
        };
      }
    }

    const cartItems = toCartItems(
      draft.lines,
      resolvedLines.map((line) => line.unitPrice),
    );
    const totals = calculateWholesaleTotals(cartItems);
    if (!Number.isFinite(totals.subtotal) || totals.subtotal <= 0) {
      return { ok: false, reason: "Cart total is invalid." };
    }

    // ── Snapshot into a draft order (this row also plays the cart role) ──────
    const { data: orderRow, error: orderErr } = await db
      .from("commerce_orders")
      .insert({
        // This value is supplied by the trusted checkout route from Clerk's
        // verified session. Never derive ownership from buyerReference: it is
        // client form data/fingerprint metadata, not an auth principal.
        clerk_user_id: draft.clerkUserId ?? null,
        status: "draft",
        source: draft.source,
        buyer: draft.buyer ?? {},
        currency: draft.currencyCode ?? "INR",
        base_subtotal_inr: Math.round(totals.baseSubtotal),
        discount_percent: totals.discountPercent,
        discount_amount_inr: Math.round(totals.discountAmount),
        total_inr: Math.round(totals.subtotal),
        total_sets: totals.totalSets,
        total_pieces: totals.totalPieces,
        metadata: { size_ratio: SIZE_RATIO_LABEL },
      })
      .select("id,display_number,total_inr")
      .single();

    if (orderErr || !orderRow) {
      return {
        ok: false,
        reason: orderErr?.message || "Could not create the order draft.",
      };
    }

    const orderId = orderRow.id as string;
    const items = draft.lines.map((line, index) => {
      const resolved = resolvedLines[index]!;
      const unit = resolved.unitPrice;
      return {
        order_id: orderId,
        product_id: resolved.product.id,
        variant_id: resolved.variant.id,
        handle: line.handle,
        title: line.title,
        size: resolved.variant.size,
        color: String(line.metadata?.color ?? "default"),
        style_code: line.metadata?.style_code
          ? String(line.metadata.style_code)
          : null,
        quantity: line.quantity,
        unit_price_inr: unit,
        line_total_inr: unit * line.quantity,
        pieces: line.quantity * B2B_CONFIG.setSize,
        metadata: line.metadata ?? {},
      };
    });

    const { error: itemsErr } = await db.from("commerce_order_items").insert(items);
    if (itemsErr) {
      // Roll back the orphaned draft order so a retry starts clean.
      await db.from("commerce_orders").delete().eq("id", orderId);
      return {
        ok: false,
        reason: itemsErr.message || "Could not persist the order line items.",
      };
    }

    // Reserve the exact variants before exposing this draft to a payment
    // provider. The SQL function locks and decrements inventory atomically.
    // A failed reservation leaves a cancelled audit row rather than a draft
    // that might later be charged without stock.
    await db.rpc("release_expired_commerce_inventory");
    const quantityByVariant = new Map<string, number>();
    for (const [index, resolved] of resolvedLines.entries()) {
      quantityByVariant.set(
        resolved.variant.id,
        (quantityByVariant.get(resolved.variant.id) ?? 0) +
          draft.lines[index]!.quantity,
      );
    }
    const reservationIds: string[] = [];
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    for (const [variantId, quantity] of quantityByVariant) {
      const { data, error } = await db.rpc("reserve_commerce_inventory", {
        p_order_id: orderId,
        p_variant_id: variantId,
        p_quantity: quantity,
        p_expires_at: expiresAt,
      });
      if (error || typeof data !== "string") {
        await Promise.all(
          reservationIds.map((reservationId) =>
            db.rpc("release_commerce_inventory", { p_reservation_id: reservationId }),
          ),
        );
        await db
          .from("commerce_orders")
          .update({ status: "cancelled" })
          .eq("id", orderId)
          .eq("status", "draft");
        return {
          ok: false,
          reason:
            "We could not reserve the selected inventory. Please refresh your cart and try again.",
          diagnostics: { unavailable_variant_id: variantId },
        };
      }
      reservationIds.push(data);
    }

    return {
      ok: true,
      orderId,
      cart: summarize(orderId, items.length, totals.totalSets, Math.round(totals.subtotal)),
      diagnostics: {
        expected_line_count: draft.lines.length,
        expected_total_sets: totals.totalSets,
        discount_percent: totals.discountPercent,
        cart_total: Math.round(totals.subtotal),
      },
      message:
        "Order draft created with wholesale pricing applied server-side. Total is authoritative for payment.",
    };
  },

  async getCartChargeAmount(cartId) {
    const db = client();
    if (!db) return null;
    const { data, error } = await db
      .from("commerce_orders")
      .select("total_inr,currency,status")
      .eq("id", cartId)
      .in("status", ["draft", "pending_payment", "paid"])
      .maybeSingle();
    if (error || !data) return null;
    const amountPaise = Math.round(Number(data.total_inr) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) return null;
    return { amountPaise, currency: (data.currency as string)?.toUpperCase() || "INR" };
  },

  async beginPaymentAttempt(
    cartId: string,
    idempotencyKey: string,
  ): Promise<CommercePaymentAttemptResult> {
    const db = client();
    if (!db) return { ok: false, reason: "Supabase backend not configured." };
    const { data, error } = await db.rpc("begin_commerce_payment_attempt", {
      p_order_id: cartId,
      p_idempotency_key: idempotencyKey,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      return { ok: false, reason: error?.message || "Could not begin secure payment." };
    }
    return {
      ok: true,
      attemptId: String(row.attempt_id),
      receipt: String(row.receipt),
      amountPaise: Number(row.amount_paise),
      currency: String(row.currency),
      expiresAt: String(row.expires_at),
      ...(row.provider_order_id ? { providerOrderId: String(row.provider_order_id) } : {}),
    };
  },

  async legacyBeginPaymentAttempt(
    cartId: string,
    provider: "razorpay" | "phonepe",
  ): Promise<{ ok: boolean; orderId?: string; reason?: string }> {
    const db = client();
    if (!db) return { ok: false, reason: "Supabase backend not configured." };

    const { data, error } = await db
      .from("commerce_orders")
      .update({ status: "pending_payment", payment_provider: provider })
      .eq("id", cartId)
      .eq("status", "draft")
      .is("payment_transaction_id", null)
      .is("payment_order_id", null)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, reason: error.message };
    if (!data) {
      return {
        ok: false,
        reason: "This order already has a payment in progress. Please complete it or contact us before retrying.",
      };
    }
    return { ok: true, orderId: data.id as string };
  },

  async attachPaymentOrder(attemptId: string, providerOrderId: string): Promise<boolean> {
    const db = client();
    if (!db) return false;
    const { data, error } = await db.rpc("attach_commerce_payment_order", {
      p_attempt_id: attemptId,
      p_provider_order_id: providerOrderId,
    });
    return data === true && !error;
  },

  async legacyAttachPaymentOrder(cartId: string, providerOrderId: string): Promise<boolean> {
    const db = client();
    if (!db) return false;
    const { data, error } = await db
      .from("commerce_orders")
      .update({ payment_order_id: providerOrderId })
      .eq("id", cartId)
      .eq("status", "pending_payment")
      .is("payment_transaction_id", null)
      .is("payment_order_id", null)
      .select("id")
      .maybeSingle();
    return Boolean(data) && !error;
  },

  async releasePaymentAttempt(cartId: string): Promise<void> {
    const db = client();
    if (!db) return;
    await db.rpc("cancel_commerce_order", {
      p_order_id: cartId,
      p_reason: "payment_provider_order_creation_failed",
    });
  },

  async legacyReleasePaymentAttempt(cartId: string): Promise<void> {
    const db = client();
    if (!db) return;
    await db
      .from("commerce_orders")
      .update({ status: "draft", payment_provider: null })
      .eq("id", cartId)
      .eq("status", "pending_payment")
      .is("payment_transaction_id", null)
      .is("payment_order_id", null);
  },

  async completePaidOrder(
    input: CommercePaidOrderInput,
  ): Promise<CommerceOrderCompletionResult> {
    const db = client();
    if (!db) {
      return { ok: false, cartId: input.cartId, reason: "Supabase backend not configured." };
    }
    const { data, error } = await db.rpc("finalize_captured_commerce_payment", {
      p_provider_payment_id: input.paymentId,
      p_provider_order_id: input.paymentOrderId,
      p_amount_paise: input.amountPaise,
      p_currency: input.currency,
      p_provider_payload: {},
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      return { ok: false, cartId: input.cartId, reason: error?.message || "Could not finalize payment." };
    }
    if (row.outcome === "review_required") {
      return {
        ok: false,
        cartId: input.cartId,
        orderId: String(row.order_id),
        displayId: Number(row.display_number),
        reason: "Payment is captured but requires manual review before fulfilment.",
        diagnostics: { review_reason: String(row.review_reason ?? "unknown") },
      };
    }
    if (String(row.order_id) !== input.cartId) {
      return { ok: false, cartId: input.cartId, reason: "Payment belongs to a different order." };
    }
    return {
      ok: true,
      cartId: input.cartId,
      orderId: String(row.order_id),
      displayId: Number(row.display_number),
      status: "paid",
      paymentStatus: "captured",
      message: "Payment verified and order placed.",
    };
  },

  async legacyCompletePaidOrder(
    input: CommercePaidOrderInput,
  ): Promise<CommerceOrderCompletionResult> {
    const db = client();
    if (!db) {
      return { ok: false, cartId: input.cartId, reason: "Supabase backend not configured." };
    }

    const { data: order, error } = await db
      .from("commerce_orders")
      .select(
        "id,display_number,status,total_inr,currency,buyer,clerk_user_id,payment_transaction_id,payment_order_id",
      )
      .eq("id", input.cartId)
      .maybeSingle();

    if (error || !order) {
      return { ok: false, cartId: input.cartId, reason: "Order draft could not be loaded." };
    }

    // Browser-authorized completion must remain bound to the same verified
    // Clerk identity used when the draft was created. Trusted webhooks omit
    // clerkUserId and are allowed to reconcile by provider/order IDs instead.
    if (
      input.clerkUserId !== undefined &&
      (order.clerk_user_id ?? null) !== (input.clerkUserId ?? null)
    ) {
      return {
        ok: false,
        cartId: input.cartId,
        reason: "This checkout does not belong to the current buyer.",
      };
    }

    // Idempotency: already completed with this same payment → return success.
    if (order.payment_transaction_id === input.paymentId && order.status === "paid") {
      return {
        ok: true,
        cartId: input.cartId,
        orderId: order.id as string,
        displayId: Number(order.display_number),
        status: "paid",
        paymentStatus: "captured",
        total: Number(order.total_inr),
        currencyCode: (order.currency as string)?.toUpperCase() || "INR",
        buyerEmail: (order.buyer as { email?: string })?.email,
        message: `Order #${order.display_number} already completed for payment ${input.paymentId}.`,
      };
    }
    if (order.payment_transaction_id && order.payment_transaction_id !== input.paymentId) {
      return {
        ok: false,
        cartId: input.cartId,
        reason: "This order was already completed with a different payment.",
      };
    }
    if (order.payment_order_id && order.payment_order_id !== input.paymentOrderId) {
      return {
        ok: false,
        cartId: input.cartId,
        reason: "This payment does not belong to the order's Razorpay checkout.",
      };
    }

    // ── Reconcile captured amount against the server-side snapshot ───────────
    const snapshotPaise = Math.round(Number(order.total_inr) * 100);
    if (snapshotPaise !== input.amountPaise) {
      return {
        ok: false,
        cartId: input.cartId,
        reason:
          "Captured payment amount does not match the order total. Order held for review.",
        diagnostics: {
          expected_amount_paise: snapshotPaise,
          captured_amount_paise: input.amountPaise,
        },
      };
    }

    // ── Status-guarded conditional update = the double-complete race guard ───
    // The unique(payment_transaction_id) index is the hard backstop; this WHERE
    // ensures only a not-yet-paid row transitions, so a concurrent second call
    // updates 0 rows and is treated as an idempotent no-op below.
    const { data: updated, error: updErr } = await db
      .from("commerce_orders")
      .update({
        status: "paid",
        payment_provider: input.paymentProvider,
        payment_transaction_id: input.paymentId,
        payment_order_id: input.paymentOrderId,
        payment_amount_paise: input.amountPaise,
        completed_at: new Date().toISOString(),
      })
      .eq("id", input.cartId)
      .in("status", ["draft", "pending_payment"])
      .is("payment_transaction_id", null)
      .select("id,display_number,total_inr,currency,buyer")
      .maybeSingle();

    if (updErr) {
      // Unique-violation (23505) means a concurrent call already claimed this
      // payment id — safe to treat as already-completed.
      const code = (updErr as { code?: string }).code;
      if (code === "23505") {
        const { data: owner } = await db
          .from("commerce_orders")
          .select("id,display_number,total_inr,currency,buyer,status,clerk_user_id")
          .eq("payment_transaction_id", input.paymentId)
          .maybeSingle();

        // A unique payment conflict is only idempotent when this exact order
        // already owns the payment. Never report success for a different
        // order that won the race.
        if (!owner || owner.id !== input.cartId) {
          return {
            ok: false,
            cartId: input.cartId,
            reason: "This payment is already linked to another order.",
          };
        }
        return {
          ok: true,
          cartId: input.cartId,
          orderId: owner.id as string,
          displayId: Number(owner.display_number),
          status: "paid",
          paymentStatus: "captured",
          total: Number(owner.total_inr),
          currencyCode: (owner.currency as string)?.toUpperCase() || "INR",
          buyerEmail: (owner.buyer as { email?: string })?.email,
          message: `Order #${owner.display_number} completed (idempotent) for payment ${input.paymentId}.`,
        };
      }
      return { ok: false, cartId: input.cartId, reason: updErr.message };
    }

    if (!updated) {
      // 0 rows transitioned → another request already completed it. No-op.
      return {
        ok: true,
        cartId: input.cartId,
        orderId: order.id as string,
        displayId: Number(order.display_number),
        status: "paid",
        paymentStatus: "captured",
        total: Number(order.total_inr),
        currencyCode: (order.currency as string)?.toUpperCase() || "INR",
        buyerEmail: (order.buyer as { email?: string })?.email,
        message: `Order #${order.display_number} was already completed.`,
      };
    }

    const { data: reservations } = await db
      .from("commerce_inventory_reservations")
      .select("id")
      .eq("order_id", input.cartId)
      .eq("status", "reserved");
    if (reservations) {
      await Promise.all(
        reservations.map((reservation) =>
          db.rpc("consume_commerce_inventory", { p_reservation_id: reservation.id }),
        ),
      );
    }

    return {
      ok: true,
      cartId: input.cartId,
      orderId: updated.id as string,
      displayId: Number(updated.display_number),
      status: "paid",
      paymentStatus: "captured",
      total: Number(updated.total_inr),
      currencyCode: (updated.currency as string)?.toUpperCase() || "INR",
      buyerEmail: (updated.buyer as { email?: string })?.email,
      message: `Order #${updated.display_number} placed. Payment ${input.paymentId} verified and captured via ${input.paymentProvider === "phonepe" ? "PhonePe" : "Razorpay"}.`,
    };
  },

  async completeManualOrder(
    cartId,
    clerkUserId,
  ): Promise<CommerceOrderCompletionResult> {
    const db = client();
    if (!db) {
      return { ok: false, cartId, reason: "Supabase backend not configured." };
    }

    if (clerkUserId === undefined) {
      return {
        ok: false,
        cartId,
        reason: "A verified checkout session is required for manual completion.",
      };
    }

    // COD / WhatsApp: no payment proof; mark pending_payment for manual
    // collection. Ownership is part of the conditional update so an invalid
    // caller cannot progress an order and then fail an after-the-fact check.
    let update = db
      .from("commerce_orders")
      .update({ status: "pending_payment" })
      .eq("id", cartId)
      .eq("status", "draft")
      .is("payment_transaction_id", null)
      .select("id,display_number,total_inr,currency,buyer,clerk_user_id");

    update = clerkUserId === null
      ? update.is("clerk_user_id", null)
      : update.eq("clerk_user_id", clerkUserId);

    const { data: updated, error } = await update.maybeSingle();

    if (error) {
      return { ok: false, cartId, reason: error.message };
    }
    if (!updated) {
      return {
        ok: false,
        cartId,
        reason: "Order draft not found or already progressed past draft.",
      };
    }

    return {
      ok: true,
      cartId,
      orderId: updated.id as string,
      displayId: Number(updated.display_number),
      status: "pending_payment",
      paymentStatus: "pending",
      total: Number(updated.total_inr),
      currencyCode: (updated.currency as string)?.toUpperCase() || "INR",
      buyerEmail: (updated.buyer as { email?: string })?.email,
      message: `Order #${updated.display_number} placed. Payment pending for manual collection (COD).`,
    };
  },
};
