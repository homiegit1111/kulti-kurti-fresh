/**
 * Admin stock ledger API — read-only.
 *
 *   GET /api/admin/stock/movements?variantId=&limit=50
 *
 * commerce_inventory_movements is append-only and written by a database trigger,
 * not by application code. There is deliberately no write endpoint here: if the
 * ledger could be edited through the API it would stop being evidence.
 */

import { NextResponse, type NextRequest } from "next/server";
import { badRequest, guardAdmin, serverError } from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MOVEMENT_SELECT =
  "id,variant_id,delta,quantity_after,reason,note,order_id,actor_clerk_user_id,created_at";

type MovementRow = {
  id: number;
  variant_id: string;
  delta: number;
  quantity_after: number;
  reason: string;
  note: string;
  order_id: string | null;
  actor_clerk_user_id: string | null;
  created_at: string;
};

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:read",
    rateLimit: { name: "admin-stock-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const params = req.nextUrl.searchParams;
  const limit = clampInt(params.get("limit"), 50, 1, 200);

  // Omitting variantId is the "what moved today, across the shop" view.
  const variantId = (params.get("variantId") ?? "").trim();
  if (variantId && !UUID_RE.test(variantId)) {
    return badRequest("That size could not be found. Reload the page and try again.");
  }

  let query = db
    .from("commerce_inventory_movements")
    .select(MOVEMENT_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (variantId) query = query.eq("variant_id", variantId);

  const { data, error } = await query;
  if (error) {
    console.error("[admin-stock-movements] read failed:", error.message);
    return serverError("Could not load the stock history right now. Please try again.");
  }

  const movements = (data ?? []) as MovementRow[];
  return NextResponse.json({ movements });
}
