/**
 * Admin stock API — the stock desk.
 *
 *   GET   /api/admin/stock?filter=all|low|out|tracked&q=&limit=200
 *         Every sellable size with its count and derived state.
 *
 *   PATCH /api/admin/stock
 *         Apply up to 100 adjustments. Per-row results, so one bad id does not
 *         throw away the counts that did save.
 *
 * Every count change goes through admin_set_variant_inventory(). That RPC takes
 * a row lock and the trigger on commerce_product_variants writes the ledger row,
 * so there is no code path here that can move stock silently or lose a
 * simultaneous edit from a second person at the desk.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  badRequest,
  guardAdmin,
  readJsonObject,
  recordAudit,
  revalidateStorefront,
  serverError,
} from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VARIANT_FIELDS =
  "id,size,sku,set_price_inr,sale_price_inr,inventory_quantity," +
  "manage_inventory,allow_backorder,low_stock_threshold,position,archived_at";

const PRODUCT_SELECT = `id,title,handle,thumbnail,status,variants:commerce_product_variants(${VARIANT_FIELDS})`;

const VARIANT_SELECT = `${VARIANT_FIELDS},commerce_products!inner(id,title,handle,thumbnail,status,deleted_at)`;

/**
 * Ceilings on the underlying fetch. The stock table is meant to show the whole
 * catalog, so there is no offset paging; these exist only so a runaway catalog
 * cannot turn one page load into an unbounded response.
 */
const PRODUCT_FETCH_CAP = 2000;
const VARIANT_FETCH_CAP = 4000;

const STOCK_FILTERS = ["all", "low", "out", "tracked"] as const;
type StockFilter = (typeof STOCK_FILTERS)[number];

const STOCK_REASONS = [
  "manual_adjust",
  "manual_set",
  "restock",
  "correction",
  "bulk_import",
] as const;
type StockReason = (typeof STOCK_REASONS)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_ADJUSTMENTS = 100;
const NOTE_MAX = 200;

type ProductBase = {
  id: string;
  title: string | null;
  handle: string | null;
  thumbnail: string | null;
  status: string | null;
  deleted_at?: string | null;
};

type VariantRow = {
  id: string;
  size: string | null;
  sku: string | null;
  set_price_inr: number | null;
  sale_price_inr: number | null;
  inventory_quantity: number | null;
  manage_inventory: boolean | null;
  allow_backorder: boolean | null;
  low_stock_threshold: number | null;
  position: number | null;
  archived_at: string | null;
};

type ProductWithVariants = ProductBase & { variants: VariantRow[] | null };

type VariantWithProduct = VariantRow & {
  commerce_products: ProductBase | ProductBase[] | null;
};

type StockState = "in_stock" | "low" | "out" | "untracked";

type StockRow = {
  variantId: string;
  productId: string;
  productTitle: string;
  handle: string;
  thumbnail: string | null;
  size: string;
  sku: string | null;
  status: "published" | "draft";
  setPriceInr: number;
  salePriceInr: number | null;
  inventoryQuantity: number;
  manageInventory: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
  state: StockState;
};

/** The row plus its sort key. `position` is an ordering detail, not response data. */
type RankedStockRow = { row: StockRow; position: number };

/**
 * Strip the characters that mean something inside a PostgREST filter string
 * before the search term is interpolated into `.or()` / `.ilike()`.
 *
 * Commas and parentheses would let a caller close our filter and append their
 * own conditions; `%` and `*` are ilike wildcards we add ourselves, not ones the
 * owner gets to smuggle in. Same rule as searchProducts in
 * src/lib/commerce/supabase-adapter.ts — kept identical on purpose.
 */
function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[,()%*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

function intOrNull(v: unknown): number | null {
  const n =
    typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
}

/**
 * A to-one PostgREST embed is returned as an object, but the shape varies with
 * how the relationship is detected. Normalising here keeps the mapper honest
 * instead of trusting one form.
 */
function firstEmbed(value: ProductBase | ProductBase[] | null): ProductBase | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function stockStateOf(manageInventory: boolean, qty: number, threshold: number): StockState {
  if (!manageInventory) return "untracked";
  if (qty <= 0) return "out";
  if (threshold > 0 && qty <= threshold) return "low";
  return "in_stock";
}

function toStockRow(product: ProductBase, variant: VariantRow): RankedStockRow {
  const manageInventory = variant.manage_inventory === true;
  const qty = variant.inventory_quantity ?? 0;
  const threshold = variant.low_stock_threshold ?? 0;
  return {
    position: variant.position ?? 0,
    row: {
      variantId: variant.id,
      productId: product.id,
      productTitle: product.title ?? "",
      handle: product.handle ?? "",
      thumbnail: product.thumbnail ?? null,
      size: variant.size ?? "",
      sku: variant.sku ?? null,
      status: product.status === "published" ? "published" : "draft",
      setPriceInr: variant.set_price_inr ?? 0,
      salePriceInr: variant.sale_price_inr ?? null,
      inventoryQuantity: qty,
      manageInventory,
      allowBackorder: variant.allow_backorder === true,
      lowStockThreshold: threshold,
      state: stockStateOf(manageInventory, qty, threshold),
    },
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:read",
    rateLimit: { name: "admin-stock-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const params = req.nextUrl.searchParams;
  const filterRaw = params.get("filter") ?? "all";
  const filter: StockFilter = (STOCK_FILTERS as readonly string[]).includes(filterRaw)
    ? (filterRaw as StockFilter)
    : "all";
  const limit = clampInt(params.get("limit"), 200, 1, 500);
  const q = sanitizeSearchTerm(params.get("q") ?? "");

  // Keyed by variant id because a search runs two queries (title/handle on the
  // product, SKU on the variant) whose results overlap.
  const byVariant = new Map<string, RankedStockRow>();

  let productQuery = db
    .from("commerce_products")
    .select(PRODUCT_SELECT)
    .is("deleted_at", null)
    .order("title", { ascending: true })
    .limit(PRODUCT_FETCH_CAP);
  if (q) {
    productQuery = productQuery.or(`title.ilike.%${q}%,handle.ilike.%${q}%`);
  }

  const { data: productData, error: productError } = await productQuery;
  if (productError) {
    console.error("[admin-stock] product read failed:", productError.message);
    return serverError("Could not load stock right now. Please try again.");
  }

  for (const product of (productData ?? []) as ProductWithVariants[]) {
    for (const variant of product.variants ?? []) {
      if (variant.archived_at) continue;
      byVariant.set(variant.id, toStockRow(product, variant));
    }
  }

  // SKU lives on the variant, not the product, so it cannot join the `.or()`
  // above — PostgREST logical operators do not reliably span an embed.
  if (q) {
    const { data: skuData, error: skuError } = await db
      .from("commerce_product_variants")
      .select(VARIANT_SELECT)
      .is("archived_at", null)
      .is("commerce_products.deleted_at", null)
      .ilike("sku", `%${q}%`)
      .limit(VARIANT_FETCH_CAP);
    if (skuError) {
      console.error("[admin-stock] sku search failed:", skuError.message);
      return serverError("Could not search stock right now. Please try again.");
    }
    for (const variant of (skuData ?? []) as VariantWithProduct[]) {
      const product = firstEmbed(variant.commerce_products);
      if (!product) continue;
      byVariant.set(variant.id, toStockRow(product, variant));
    }
  }

  const matched = [...byVariant.values()].sort(
    (a, b) =>
      a.row.productTitle.localeCompare(b.row.productTitle) ||
      a.position - b.position ||
      a.row.size.localeCompare(b.row.size),
  );

  // The summary counts the whole search result, NOT the visible tab: the tabs
  // need their own counts to render, so selecting "low" must not zero out the
  // others.
  const summary = {
    tracked: matched.filter((entry) => entry.row.manageInventory).length,
    low: matched.filter((entry) => entry.row.state === "low").length,
    out: matched.filter((entry) => entry.row.state === "out").length,
    untracked: matched.filter((entry) => entry.row.state === "untracked").length,
    // Untracked sizes carry a stale quantity that means nothing, so counting
    // them here would inflate the number the owner reads as "sets on hand".
    totalSets: matched.reduce(
      (sum, entry) => sum + (entry.row.manageInventory ? entry.row.inventoryQuantity : 0),
      0,
    ),
  };

  const visible = matched.filter(({ row }) => {
    if (filter === "low") return row.state === "low";
    if (filter === "out") return row.state === "out";
    if (filter === "tracked") return row.manageInventory;
    return true;
  });

  const rows = visible.slice(0, limit).map((entry) => entry.row);

  return NextResponse.json({ rows, summary });
}

type ParsedAdjustment = {
  variantId: string;
  mode: "delta" | "absolute";
  amount: number;
  reason: StockReason;
  note: string;
};

type AdjustmentResult =
  | { variantId: string; ok: true; before: number; after: number }
  | { variantId: string; ok: false; error: string };

/** Validate one adjustment. The reason is a per-row failure, never a 400. */
function parseAdjustment(
  raw: unknown,
  index: number,
): { ok: true; value: ParsedAdjustment } | { ok: false; variantId: string; error: string } {
  const label = `Adjustment ${index + 1}`;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, variantId: "", error: `${label} is not filled in correctly.` };
  }
  const a = raw as Record<string, unknown>;

  const variantIdRaw = typeof a.variantId === "string" ? a.variantId.trim() : "";
  if (!UUID_RE.test(variantIdRaw)) {
    return {
      ok: false,
      variantId: variantIdRaw,
      error: `${label} does not name a valid size. Reload the page and try again.`,
    };
  }

  const modeRaw = typeof a.mode === "string" ? a.mode.trim() : "delta";
  if (modeRaw !== "delta" && modeRaw !== "absolute") {
    return {
      ok: false,
      variantId: variantIdRaw,
      error: `${label} must either add to the count (delta) or set it (absolute).`,
    };
  }

  const amount = intOrNull(a.amount);
  if (amount === null) {
    return {
      ok: false,
      variantId: variantIdRaw,
      error: `${label} needs a whole number of sets.`,
    };
  }
  if (modeRaw === "absolute" && amount < 0) {
    return {
      ok: false,
      variantId: variantIdRaw,
      error: `${label} cannot set the count below zero.`,
    };
  }

  const reasonRaw = typeof a.reason === "string" ? a.reason.trim() : "";
  if (reasonRaw && !(STOCK_REASONS as readonly string[]).includes(reasonRaw)) {
    return {
      ok: false,
      variantId: variantIdRaw,
      error: `${label} has a reason we do not recognise.`,
    };
  }
  const reason: StockReason = reasonRaw
    ? (reasonRaw as StockReason)
    : modeRaw === "absolute"
      ? "manual_set"
      : "manual_adjust";

  const noteRaw = typeof a.note === "string" ? a.note.trim() : "";
  if (noteRaw.length > NOTE_MAX) {
    return {
      ok: false,
      variantId: variantIdRaw,
      error: `${label} has a note longer than ${NOTE_MAX} characters.`,
    };
  }

  return {
    ok: true,
    value: { variantId: variantIdRaw, mode: modeRaw, amount, reason, note: noteRaw },
  };
}

/** Turn a Postgres error into a sentence the person at the stock desk can act on. */
function rpcFailureMessage(message: string): string {
  if (message.includes("Variant not found")) {
    return "Variant not found. It may have been removed — reload the page and try again.";
  }
  if (message.includes("Mode must be")) {
    return "That adjustment was not understood. Reload the page and try again.";
  }
  return "Could not save this count. Please try again.";
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "stock:write",
    mutation: true,
    rateLimit: { name: "admin-stock-write", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db, userId } = guard.ctx;

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;

  const raw = parsedBody.body.adjustments;
  if (!Array.isArray(raw) || raw.length === 0) {
    return badRequest("Send at least one stock change.");
  }
  if (raw.length > MAX_ADJUSTMENTS) {
    return badRequest(
      `You can change ${MAX_ADJUSTMENTS} sizes at a time. Save these and continue with the rest.`,
    );
  }

  const results: AdjustmentResult[] = [];
  const applied: ParsedAdjustment[] = [];

  // One RPC per adjustment, in order, on purpose. Each call takes a row lock;
  // firing them together would interleave those locks across variants and could
  // deadlock two people saving overlapping batches. A stock save is not a hot
  // path, and a per-row result needs a per-row outcome anyway.
  for (let i = 0; i < raw.length; i++) {
    const parsed = parseAdjustment(raw[i], i);
    if (!parsed.ok) {
      results.push({ variantId: parsed.variantId, ok: false, error: parsed.error });
      continue;
    }
    const adjustment = parsed.value;

    const { data, error } = await db.rpc("admin_set_variant_inventory", {
      p_variant_id: adjustment.variantId,
      p_amount: adjustment.amount,
      p_mode: adjustment.mode,
      p_reason: adjustment.reason,
      p_note: adjustment.note,
      p_actor: userId,
    });

    if (error) {
      results.push({
        variantId: adjustment.variantId,
        ok: false,
        error: rpcFailureMessage(error.message ?? ""),
      });
      continue;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { quantity_before: number | null; quantity_after: number | null }
      | null
      | undefined;
    if (!row) {
      results.push({
        variantId: adjustment.variantId,
        ok: false,
        error: "Variant not found. It may have been removed — reload the page and try again.",
      });
      continue;
    }

    results.push({
      variantId: adjustment.variantId,
      ok: true,
      before: row.quantity_before ?? 0,
      after: row.quantity_after ?? 0,
    });
    applied.push(adjustment);
  }

  // Audited even when every row failed: a rejected batch is still someone
  // reaching for the stock counts, and that is worth a line in the log.
  await recordAudit(guard.ctx, {
    action: "stock.adjust",
    entityType: "stock",
    entityId: "batch",
    metadata: {
      requested: raw.length,
      applied: applied.length,
      adjustments: applied,
      failures: results.filter((result) => !result.ok),
    },
  });

  if (applied.length > 0) await revalidateStorefront(["/", "/shop"]);

  return NextResponse.json({ results, applied: applied.length });
}
