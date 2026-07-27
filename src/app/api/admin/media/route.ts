/**
 * Admin media library — list.
 *
 *   GET /api/admin/media?kind=image|video&folder=&limit=60&offset=0
 *       → { assets: [...], total: n }
 *
 * Only 'ready' rows are returned. A 'pending' row is one where an upload token
 * was issued but the object was never confirmed to exist, so showing it would
 * offer the owner an image that is not there.
 */

import { NextResponse, type NextRequest } from "next/server";
import { badRequest, guardAdmin, serverError } from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;
const FOLDER_PATTERN = /^[a-z0-9-]{1,40}$/;

const ASSET_COLUMNS =
  "id, bucket, path, url, kind, mime_type, bytes, width, height, " +
  "duration_seconds, alt_text, title, folder, tags, created_at";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:read",
    rateLimit: { name: "admin-media-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const params = req.nextUrl.searchParams;

  const kind = params.get("kind");
  if (kind !== null && kind !== "" && kind !== "image" && kind !== "video") {
    return badRequest("Filter by either image or video.");
  }

  const folder = params.get("folder")?.trim() ?? "";
  if (folder !== "" && !FOLDER_PATTERN.test(folder)) {
    return badRequest(
      "Folder names use lowercase letters, numbers and dashes only, up to 40 characters.",
    );
  }

  const rawLimit = Number(params.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const rawOffset = Number(params.get("offset") ?? 0);
  const offset = Number.isFinite(rawOffset)
    ? Math.max(Math.trunc(rawOffset), 0)
    : 0;

  let query = db
    .from("media_assets")
    .select(ASSET_COLUMNS, { count: "exact" })
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (kind === "image" || kind === "video") query = query.eq("kind", kind);
  if (folder !== "") query = query.eq("folder", folder);

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin-media] list failed:", error.message);
    return serverError(
      "Could not load your images and video. Refresh the page and try again.",
    );
  }

  return NextResponse.json({ assets: data ?? [], total: count ?? 0 });
}
