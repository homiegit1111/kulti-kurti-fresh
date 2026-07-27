/**
 * Admin content history.
 *
 *   GET /api/admin/content/revisions?key=<key>&limit=20
 *       → { revisions: [{ id, key, value, previous_value,
 *                         actor_clerk_user_id, created_at }] }
 *
 * Newest first. Read-only: the table is append-only history, written only by the
 * publish/reset/revert paths in ../route.ts, and there is no endpoint that edits
 * or deletes a revision. That is what makes "go back to the previous wording" a
 * fact rather than a hope.
 */

import { NextResponse, type NextRequest } from "next/server";
import { badRequest, guardAdmin, serverError } from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
/** Registry keys are short; anything longer is not a key we ever wrote. */
const MAX_KEY_LENGTH = 200;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "content:write",
    rateLimit: { name: "admin-content-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const params = req.nextUrl.searchParams;

  const rawKey = params.get("key");
  const key = rawKey === null ? null : rawKey.trim();
  if (key !== null && key.length > MAX_KEY_LENGTH) {
    return badRequest("That field name is too long to look up.");
  }

  const rawLimit = Number(params.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  // Deliberately not filtered to keys still in the registry: a field that was
  // removed from the site keeps its history, and hiding it would make the log
  // look like it had gaps.
  let query = db
    .from("site_content_revisions")
    .select("id, key, value, previous_value, actor_clerk_user_id, created_at")
    .order("created_at", { ascending: false })
    // `created_at` ties for every row written by one publish, so the identity
    // column breaks the tie. Without it "newest first" is not a total order and
    // the newest row of a batch is whichever the planner returns first.
    .order("id", { ascending: false })
    .limit(limit);

  if (key !== null && key !== "") {
    query = query.eq("key", key);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin-content] revision list failed:", error.message);
    return serverError(
      "Could not load the change history. Try again in a moment.",
    );
  }

  return NextResponse.json({ revisions: data ?? [] });
}
