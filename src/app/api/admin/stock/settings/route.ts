/**
 * Admin stock settings API — the per-size tracking flags.
 *
 *   PATCH /api/admin/stock/settings
 *         { variantId, manageInventory?, allowBackorder?, lowStockThreshold? }
 *
 * Deliberately separate from PATCH /api/admin/stock: that endpoint moves counts
 * through the locking RPC and writes the ledger, this one only changes how a
 * size is watched. Keeping them apart means a settings change can never be
 * mistaken for a stock movement in the audit trail.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  badRequest,
  guardAdmin,
  notFound,
  readJsonObject,
  recordAudit,
  revalidateStorefront,
  serverError,
} from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const THRESHOLD_MAX = 10_000;

type VariantSettingsRow = {
  id: string;
  manage_inventory: boolean | null;
  allow_backorder: boolean | null;
  low_stock_threshold: number | null;
  archived_at: string | null;
  product_id: string;
};

type SettingsPatch = {
  manage_inventory?: boolean;
  allow_backorder?: boolean;
  low_stock_threshold?: number;
};

function boolOrNull(v: unknown): boolean | null {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return null;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "stock:write",
    mutation: true,
    rateLimit: { name: "admin-stock-write", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.body;

  const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
  if (!UUID_RE.test(variantId)) {
    return badRequest("Choose a size to change. Reload the page if the list looks stale.");
  }

  const patch: SettingsPatch = {};

  if (body.manageInventory !== undefined) {
    const value = boolOrNull(body.manageInventory);
    if (value === null) {
      return badRequest("Stock tracking must be either on or off.");
    }
    patch.manage_inventory = value;
  }

  if (body.allowBackorder !== undefined) {
    const value = boolOrNull(body.allowBackorder);
    if (value === null) {
      return badRequest("Selling past zero must be either on or off.");
    }
    patch.allow_backorder = value;
  }

  if (body.lowStockThreshold !== undefined) {
    const raw = body.lowStockThreshold;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.trim() !== ""
          ? Number(raw)
          : NaN;
    if (!Number.isInteger(n) || n < 0 || n > THRESHOLD_MAX) {
      return badRequest(
        `The low-stock warning level must be a whole number of sets between 0 and ${THRESHOLD_MAX}. Use 0 to turn the warning off.`,
      );
    }
    patch.low_stock_threshold = n;
  }

  if (Object.keys(patch).length === 0) {
    return badRequest("Nothing to change. Pick at least one setting.");
  }

  const { data: existing, error: readError } = await db
    .from("commerce_product_variants")
    .select("id,manage_inventory,allow_backorder,low_stock_threshold,archived_at,product_id")
    .eq("id", variantId)
    .maybeSingle();
  if (readError) {
    console.error("[admin-stock-settings] read failed:", readError.message);
    return serverError("Could not open that size right now. Please try again.");
  }
  const before = existing as VariantSettingsRow | null;
  if (!before || before.archived_at) {
    return notFound("That size no longer exists. Reload the page and try again.");
  }

  const { error: updateError } = await db
    .from("commerce_product_variants")
    .update(patch)
    .eq("id", variantId)
    .is("archived_at", null);
  if (updateError) {
    console.error("[admin-stock-settings] update failed:", updateError.message);
    return serverError("Could not save that setting. Please try again.");
  }

  await recordAudit(guard.ctx, {
    action: "stock.settings",
    entityType: "stock",
    entityId: variantId,
    beforeState: {
      manage_inventory: before.manage_inventory,
      allow_backorder: before.allow_backorder,
      low_stock_threshold: before.low_stock_threshold,
    },
    afterState: patch,
    metadata: { product_id: before.product_id },
  });

  // manage_inventory and allow_backorder decide whether the storefront shows a
  // size as buyable, so the change has to reach the rendered pages too.
  await revalidateStorefront(["/", "/shop"]);

  return NextResponse.json({ ok: true });
}
