/**
 * Admin audit log — READ ONLY.
 *
 *   GET /api/admin/audit?entityType=&action=&limit=100&offset=0
 *       → { entries: AuditEntry[], total: n }   newest first
 *
 * See docs/ADMIN_API_CONTRACT.md §8.
 *
 * There is no write handler here and there must never be one. The log is written
 * only as a side effect of the mutation being logged (recordAudit in
 * @/lib/server/admin-guard); an endpoint that could append to it would let an
 * actor write their own alibi, and one that could edit or delete rows would make
 * the whole table worthless as evidence.
 */

import { NextResponse, type NextRequest } from "next/server";
import { guardAdmin, badRequest, serverError } from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENTRY_COLUMNS =
  "id,actor_clerk_user_id,action,entity_type,entity_id," +
  "before_state,after_state,metadata,created_at";

/** Mirrors the commerce_admin_audit_log_entity_type_check constraint. */
const ENTITY_TYPES = [
  "product",
  "variant",
  "order",
  "collection",
  "content",
  "media",
  "promotion",
  "admin_user",
  "settings",
  "stock",
] as const;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const MAX_OFFSET = 100_000;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw.trim());
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "audit:read",
    rateLimit: { name: "admin-audit-read", limit: 60 },
  });
  if (!guard.ok) return guard.response;

  const params = req.nextUrl.searchParams;
  const limit = clampInt(params.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(params.get("offset"), 0, 0, MAX_OFFSET);

  const entityType = (params.get("entityType") ?? "").trim();
  // An unknown record type can only be a bug: the column is constrained to this
  // exact list, so filtering on anything else would silently return nothing and
  // read as "your history is gone".
  if (entityType && !ENTITY_TYPES.some((known) => known === entityType)) {
    return badRequest(
      `"${entityType.slice(0, 40)}" is not a kind of record we keep history for.`,
    );
  }

  const action = (params.get("action") ?? "").trim().slice(0, 60);

  let query = guard.ctx.db
    .from("commerce_admin_audit_log")
    .select(ENTRY_COLUMNS, { count: "exact" })
    // id breaks ties on created_at, so paging cannot show a row twice or skip one.
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityType) query = query.eq("entity_type", entityType);
  if (action) query = query.eq("action", action);

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin-audit] read failed:", error.message);
    return serverError("Could not load the history. Please refresh in a moment.");
  }

  return NextResponse.json({ entries: data ?? [], total: count ?? 0 });
}
