/**
 * Shared validation + helpers for the admin products routes.
 *
 * Prices are whole-rupee integers (set_price_inr). All parsing is fail-closed:
 * anything malformed is rejected with a clear message rather than coerced.
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/server/admin-auth";
import { isSameOrigin } from "@/lib/server/origin-check";

export function gateError(status: number): NextResponse {
  const message =
    status === 401
      ? "Sign in required."
      : status === 403
        ? "You are not authorised for admin actions."
        : "Admin access is not configured.";
  return NextResponse.json({ error: message }, { status });
}

/**
 * Single guard for every admin MUTATION (POST/PATCH/DELETE): same-origin check
 * (CSRF) + admin allowlist. Returns the verified admin id when the request may
 * proceed, or a ready-to-return error response otherwise. Using one helper
 * means no mutation route can accidentally skip the CSRF or auth step.
 */
export type AdminMutationGate =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function guardAdminMutation(
  req: NextRequest,
): Promise<AdminMutationGate> {
  if (!isSameOrigin(req)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Cross-origin request rejected." },
        { status: 403 },
      ),
    };
  }
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, response: gateError(gate.status) };
  return { ok: true, userId: gate.userId };
}

/**
 * Audit writes are deliberately best-effort. The admin mutation must not be
 * rolled back just because an audit table is being deployed or temporarily
 * unavailable; the migration creates the table and its indexes deterministically.
 */
export async function recordAdminAudit(
  db: SupabaseClient,
  input: {
    actorUserId: string;
    action: string;
    entityType: "product" | "order";
    entityId: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await db.from("commerce_admin_audit_log").insert({
    actor_clerk_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_state: input.beforeState ?? {},
    after_state: input.afterState ?? {},
    metadata: input.metadata ?? {},
  });
  if (error) console.error("[admin-audit] write failed", error.message);
}

export function serviceUnavailable(): NextResponse {
  return NextResponse.json(
    { error: "Commerce backend is not configured." },
    { status: 503 },
  );
}

export type ParsedVariant = {
  id?: string;
  size: string;
  sku: string | null;
  set_price_inr: number;
  inventory_quantity: number;
  manage_inventory: boolean;
  allow_backorder: boolean;
  position: number;
};

export type ParsedProduct = {
  handle: string;
  title: string;
  description: string;
  thumbnail: string | null;
  images: string[];
  category: string;
  color_family: string;
  is_new: boolean;
  status: "draft" | "published";
  collection_handle: string | null;
  rank: number;
  metadata: Record<string, unknown>;
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function bool(v: unknown): boolean {
  return v === true || v === "true";
}

function intOrNull(v: unknown): number | null {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v)
        : NaN;
  return Number.isInteger(n) ? n : null;
}

function isSafeImageReference(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function slugify(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Parse one variant. Returns null-carrying result with a reason on failure. */
function parseVariant(raw: unknown, index: number): ParseResult<ParsedVariant> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: `Variant ${index + 1} is malformed.` };
  }
  const v = raw as Record<string, unknown>;
  const size = str(v.size, 40);
  if (!size) return { ok: false, error: `Variant ${index + 1} needs a size.` };

  const price = intOrNull(v.set_price_inr ?? v.setPriceInr);
  if (price === null || price <= 0) {
    return {
      ok: false,
      error: `Variant "${size}" needs a set price in whole rupees greater than 0.`,
    };
  }

  const inventoryRaw = v.inventory_quantity ?? v.inventoryQuantity;
  const inventory =
    inventoryRaw === undefined || inventoryRaw === null || inventoryRaw === ""
      ? 0
      : intOrNull(inventoryRaw);
  if (inventory === null || inventory < 0) {
    return {
      ok: false,
      error: `Variant "${size}" needs a non-negative whole-unit inventory quantity.`,
    };
  }

  return {
    ok: true,
    value: {
      ...(str(v.id, 80) ? { id: str(v.id, 80) } : {}),
      size,
      sku: str(v.sku, 80) || null,
      set_price_inr: price,
      inventory_quantity: inventory,
      manage_inventory: bool(v.manage_inventory ?? v.manageInventory),
      allow_backorder: bool(v.allow_backorder ?? v.allowBackorder),
      position: intOrNull(v.position) ?? index,
    },
  };
}

/**
 * Parse a product-create/update payload. When requireVariants is true (create),
 * at least one valid variant is required; on update, variants are optional and
 * only validated when present.
 */
export function parseProductPayload(
  raw: unknown,
  opts: { requireVariants: boolean; validatePublish?: boolean },
): ParseResult<{ product: ParsedProduct; variants: ParsedVariant[] }> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = raw as Record<string, unknown>;

  const title = str(b.title, 180);
  if (!title) return { ok: false, error: "Title is required." };

  const handle = str(b.handle, 120) || slugify(title);
  if (!handle) return { ok: false, error: "A valid handle could not be derived." };

  const statusRaw = str(b.status, 20);
  if (statusRaw && statusRaw !== "draft" && statusRaw !== "published") {
    return { ok: false, error: "Status must be draft or published." };
  }
  const status: "draft" | "published" =
    statusRaw === "published" ? "published" : "draft";

  const images = Array.isArray(b.images)
    ? b.images
        .map((u) => str(u, 400))
        .filter((u): u is string => Boolean(u))
        .slice(0, 12)
    : [];

  const product: ParsedProduct = {
    handle,
    title,
    description: str(b.description, 4000),
    thumbnail: str(b.thumbnail, 400) || images[0] || null,
    images,
    category: str(b.category, 60) || "Kurtis",
    color_family: str(b.color_family ?? b.colorFamily, 60) || "ivory",
    is_new: bool(b.is_new ?? b.isNew),
    status,
    collection_handle: str(b.collection_handle ?? b.collectionHandle, 120) || null,
    rank: intOrNull(b.rank) ?? 0,
    metadata:
      b.metadata && typeof b.metadata === "object"
        ? (b.metadata as Record<string, unknown>)
        : {},
  };

  const rawVariants = Array.isArray(b.variants) ? b.variants : [];
  const variants: ParsedVariant[] = [];
  for (let i = 0; i < rawVariants.length; i++) {
    const parsed = parseVariant(rawVariants[i], i);
    if (!parsed.ok) return parsed;
    variants.push(parsed.value);
  }

  if (opts.requireVariants && variants.length === 0) {
    return { ok: false, error: "At least one variant with a set price is required." };
  }

  // Reject duplicate sizes up-front (the DB unique(product_id,size) would 23505).
  const sizes = new Set<string>();
  for (const v of variants) {
    const normalizedSize = v.size.toLocaleLowerCase("en-US");
    if (sizes.has(normalizedSize)) {
      return { ok: false, error: `Duplicate size "${v.size}" in variants.` };
    }
    sizes.add(normalizedSize);
  }

  if (status === "published" && opts.validatePublish !== false) {
    const publishError = validatePublishedProduct(product, variants);
    if (publishError) return { ok: false, error: publishError };
  }

  return { ok: true, value: { product, variants } };
}

/** Return a user-safe reason when a product is not ready to be public. */
export function validatePublishedProduct(
  product: ParsedProduct,
  variants: ParsedVariant[],
): string | null {
  if (!product.thumbnail || !isSafeImageReference(product.thumbnail)) {
    return "Published products need a valid image URL or site-local image path.";
  }
  if (variants.length === 0) {
    return "Published products need at least one priced variant.";
  }
  const sellable = variants.some(
    (variant) =>
      variant.set_price_inr > 0 &&
      (!variant.manage_inventory ||
        variant.allow_backorder ||
        variant.inventory_quantity > 0),
  );
  if (!sellable) {
    return "Published products need at least one in-stock or backorderable variant.";
  }
  return null;
}

export function variantRowsForInsert(
  productId: string,
  variants: ParsedVariant[],
): (ParsedVariant & { product_id: string })[] {
  return variants.map((variant) => ({
    product_id: productId,
    size: variant.size,
    sku: variant.sku,
    set_price_inr: variant.set_price_inr,
    inventory_quantity: variant.inventory_quantity,
    manage_inventory: variant.manage_inventory,
    allow_backorder: variant.allow_backorder,
    position: variant.position,
  }));
}
