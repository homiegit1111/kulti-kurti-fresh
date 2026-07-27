/**
 * Admin media — confirm an upload finished.
 *
 *   POST /api/admin/media/confirm
 *        { assetId, width?, height?, durationSeconds?, altText?, title? }
 *        → { asset: { ...the ready row } }
 *
 * THIS IS THE CHECK THAT STOPS A PHANTOM ASSET.
 * Because the browser uploads straight to Storage, this Worker never sees the
 * bytes and cannot take the client's word that they arrived. So before the row
 * flips to 'ready' — the status the storefront and the media library read — the
 * object is looked up in the bucket and its real size is checked. A client that
 * requested a token and then skipped the upload cannot register an asset, and
 * the recorded `bytes` is the size Storage reports rather than the size the
 * client declared before uploading.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  badRequest,
  guardAdmin,
  notFound,
  readJsonObject,
  recordAudit,
  serverError,
} from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES: Record<"image" | "video", number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

/** numeric(9,2) in the column, so this is the largest value that will store. */
const MAX_DURATION_SECONDS = 9_999_999;
/** No real image or video frame is bigger than this; a larger number is a bug. */
const MAX_PIXELS = 100_000;
const MAX_ALT_LENGTH = 300;
const MAX_TITLE_LENGTH = 120;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ASSET_COLUMNS =
  "id, bucket, path, url, kind, mime_type, bytes, width, height, " +
  "duration_seconds, alt_text, title, folder, tags, status, created_at";

type AssetRow = {
  id: string;
  bucket: string;
  path: string;
  kind: "image" | "video";
  status: string;
};

function narrowAssetRow(raw: unknown): AssetRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.bucket !== "string" ||
    typeof row.path !== "string" ||
    typeof row.status !== "string" ||
    (row.kind !== "image" && row.kind !== "video")
  ) {
    return null;
  }
  return {
    id: row.id,
    bucket: row.bucket,
    path: row.path,
    kind: row.kind,
    status: row.status,
  };
}

/** A whole number in range, or null when the field was not sent. */
function optionalInteger(
  raw: unknown,
  label: string,
  max: number,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: null };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > max) {
    return { ok: false, error: `${label} does not look right. Leave it blank if you are unsure.` };
  }
  return { ok: true, value: n };
}

function optionalText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/\s+/g, " ").trim();
  return trimmed === "" ? "" : trimmed.slice(0, max);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "media:write",
    mutation: true,
    rateLimit: { name: "admin-media-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
  if (!UUID_PATTERN.test(assetId)) {
    return badRequest(
      "That upload could not be identified. Start the upload again.",
    );
  }

  const width = optionalInteger(body.width, "Width", MAX_PIXELS);
  if (!width.ok) return badRequest(width.error);
  const height = optionalInteger(body.height, "Height", MAX_PIXELS);
  if (!height.ok) return badRequest(height.error);

  let durationSeconds: number | null = null;
  if (
    body.durationSeconds !== undefined &&
    body.durationSeconds !== null &&
    body.durationSeconds !== ""
  ) {
    const raw =
      typeof body.durationSeconds === "number"
        ? body.durationSeconds
        : Number(body.durationSeconds);
    if (!Number.isFinite(raw) || raw < 0 || raw > MAX_DURATION_SECONDS) {
      return badRequest(
        "The video length does not look right. Leave it blank if you are unsure.",
      );
    }
    durationSeconds = Math.round(raw * 100) / 100;
  }

  const { data: existing, error: readError } = await db
    .from("media_assets")
    .select("id, bucket, path, kind, status")
    .eq("id", assetId)
    .maybeSingle();

  if (readError) {
    console.error("[admin-media] confirm read failed:", readError.message);
    return serverError(
      "Could not finish the upload. Try again in a moment.",
    );
  }
  const asset = narrowAssetRow(existing);
  if (!asset) {
    return notFound(
      "That upload could not be found. It may have expired — start the upload again.",
    );
  }

  // Locate the object. Paths are always "<folder>/<uuid>.<ext>", but derive the
  // parts rather than assume, so a legacy row cannot crash the lookup.
  const slash = asset.path.lastIndexOf("/");
  const dir = slash === -1 ? "" : asset.path.slice(0, slash);
  const filename = slash === -1 ? asset.path : asset.path.slice(slash + 1);

  const { data: listed, error: listError } = await db.storage
    .from(asset.bucket)
    .list(dir, { search: filename });

  if (listError) {
    console.error("[admin-media] storage list failed:", listError.message);
    return serverError(
      "Could not check whether the file arrived. Try again in a moment.",
    );
  }

  // Exact name match: `search` is a fuzzy filter, so a neighbouring object whose
  // name merely contains this one's would otherwise pass as proof of upload.
  const match = (listed ?? []).find((entry) => entry.name === filename);
  const size = match?.metadata?.size;
  const cap = MAX_BYTES[asset.kind];

  if (
    !match ||
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > cap
  ) {
    console.warn(
      `[admin-media] confirm rejected for ${asset.bucket}/${asset.path}: ` +
        `${match ? `size ${String(size)}` : "object not found"}`,
    );
    return badRequest("Upload did not complete. Please try again.");
  }

  // Only overwrite the fields the client actually sent, so re-confirming an
  // upload cannot blank out alt text someone already wrote.
  const altText = optionalText(body.altText, MAX_ALT_LENGTH);
  const title = optionalText(body.title, MAX_TITLE_LENGTH);

  const update: Record<string, unknown> = {
    status: "ready",
    // The size Storage reports, not the size the client promised before it
    // uploaded. This is the only measurement of the file we can trust.
    bytes: size,
  };
  if (width.value !== null) update.width = width.value;
  if (height.value !== null) update.height = height.value;
  if (durationSeconds !== null) update.duration_seconds = durationSeconds;
  if (altText !== null) update.alt_text = altText;
  if (title !== null && title !== "") update.title = title;

  const { data: updated, error: updateError } = await db
    .from("media_assets")
    .update(update)
    .eq("id", asset.id)
    .select(ASSET_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error(
      "[admin-media] confirm write failed:",
      updateError?.message ?? "no row returned",
    );
    return serverError(
      "The file uploaded, but it could not be added to your library. Try again in a moment.",
    );
  }

  await recordAudit(guard.ctx, {
    action: "media.create",
    entityType: "media",
    entityId: asset.id,
    afterState: {
      bucket: asset.bucket,
      path: asset.path,
      kind: asset.kind,
      bytes: size,
    },
  });

  return NextResponse.json({ asset: updated });
}
