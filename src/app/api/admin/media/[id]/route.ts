/**
 * Admin media — edit or remove one asset.
 *
 *   PATCH  /api/admin/media/:id   { altText?, title?, folder?, tags? }
 *          → { asset: {...} }
 *
 *   DELETE /api/admin/media/:id
 *          → { ok: true, deleted: true }
 *          → 409 { error, usedBy } when the file is still on the site
 *
 * The delete guard is the point of this file. Removing an image that the home
 * page still points at does not fail loudly — it leaves a broken picture on the
 * storefront that nobody notices until a buyer mentions it. So every place a URL
 * can be referenced is checked first, and the refusal names where to go and fix
 * it rather than just saying no.
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
import { CONTENT_GROUPS } from "@/lib/content/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FOLDER_PATTERN = /^[a-z0-9-]{1,40}$/;
const TAG_PATTERN = /^[a-z0-9-]{1,24}$/;
const MAX_TAGS = 10;
const MAX_ALT_LENGTH = 300;
const MAX_TITLE_LENGTH = 120;

const ASSET_COLUMNS =
  "id, bucket, path, url, kind, mime_type, bytes, width, height, " +
  "duration_seconds, alt_text, title, folder, tags, status, created_at";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

type AssetRow = { id: string; bucket: string; path: string; url: string };

function narrowAssetRow(raw: unknown): AssetRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.bucket !== "string" ||
    typeof row.path !== "string" ||
    typeof row.url !== "string"
  ) {
    return null;
  }
  return { id: row.id, bucket: row.bucket, path: row.path, url: row.url };
}

function optionalText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * "home.cover.modelImage" → "Home page · Cover (top of the page) · Model cut-out".
 *
 * The owner does not know what a registry key is. Walking the registry for the
 * human path is what turns a refusal into an instruction.
 */
function contentFieldLabel(key: string): string {
  for (const group of CONTENT_GROUPS) {
    for (const section of group.sections) {
      for (const field of section.fields) {
        if (field.key === key) {
          return `${group.title} · ${section.title} · ${field.label}`;
        }
      }
    }
  }
  return key;
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "media:write",
    mutation: true,
    rateLimit: { name: "admin-media-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { id } = await params;
  if (!UUID_PATTERN.test(id ?? "")) {
    return badRequest("That file could not be identified. Reload the library.");
  }

  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const update: Record<string, unknown> = {};

  const altText = optionalText(body.altText, MAX_ALT_LENGTH);
  if (altText !== null) update.alt_text = altText;

  const title = optionalText(body.title, MAX_TITLE_LENGTH);
  if (title !== null) update.title = title;

  if (body.folder !== undefined) {
    const folder =
      typeof body.folder === "string" ? body.folder.trim().toLowerCase() : "";
    if (!FOLDER_PATTERN.test(folder)) {
      return badRequest(
        "Folder names use lowercase letters, numbers and dashes only, up to 40 characters.",
      );
    }
    update.folder = folder;
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return badRequest("Send tags as a list, for example [\"home\", \"hero\"].");
    }
    if (body.tags.length > MAX_TAGS) {
      return badRequest(`A file can carry up to ${MAX_TAGS} tags.`);
    }
    const tags: string[] = [];
    for (const raw of body.tags) {
      const tag = typeof raw === "string" ? raw.trim().toLowerCase() : "";
      if (!TAG_PATTERN.test(tag)) {
        return badRequest(
          "Tags use lowercase letters, numbers and dashes only, up to 24 characters each.",
        );
      }
      if (!tags.includes(tag)) tags.push(tag);
    }
    update.tags = tags;
  }

  if (Object.keys(update).length === 0) {
    return badRequest("Nothing was changed. Edit a detail, then save.");
  }

  const { data: before, error: beforeError } = await db
    .from("media_assets")
    .select("alt_text, title, folder, tags")
    .eq("id", id)
    .maybeSingle();
  if (beforeError) {
    console.error("[admin-media] update read failed:", beforeError.message);
    return serverError("Could not save your change. Try again in a moment.");
  }
  if (!before) {
    return notFound("That file is no longer in your library. Reload the page.");
  }

  const { data: updated, error: updateError } = await db
    .from("media_assets")
    .update(update)
    .eq("id", id)
    .select(ASSET_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error(
      "[admin-media] update failed:",
      updateError?.message ?? "no row returned",
    );
    return serverError("Could not save your change. Try again in a moment.");
  }

  await recordAudit(guard.ctx, {
    action: "media.update",
    entityType: "media",
    entityId: id,
    beforeState: before as Record<string, unknown>,
    afterState: update,
  });

  return NextResponse.json({ asset: updated });
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

/**
 * Does this stored content value point at `url`?
 *
 * List fields hold the URL inside an array of item objects — the home page's
 * model shots and flat-lay sets both do. A plain column comparison would miss
 * every one of those, which is precisely the case that breaks the home page.
 */
function valueMentions(value: unknown, url: string): boolean {
  if (typeof value === "string") return value === url;
  if (!Array.isArray(value)) return false;
  return value.some((item) => {
    if (typeof item === "string") return item === url;
    if (!item || typeof item !== "object") return false;
    return Object.values(item as Record<string, unknown>).some(
      (cell) => cell === url,
    );
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "media:delete",
    mutation: true,
    rateLimit: { name: "admin-media-delete", limit: 30 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { id } = await params;
  if (!UUID_PATTERN.test(id ?? "")) {
    return badRequest("That file could not be identified. Reload the library.");
  }

  const { data: existing, error: readError } = await db
    .from("media_assets")
    .select("id, bucket, path, url")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[admin-media] delete read failed:", readError.message);
    return serverError("Could not delete that file. Try again in a moment.");
  }
  const asset = narrowAssetRow(existing);
  if (!asset) {
    return notFound("That file is no longer in your library. Reload the page.");
  }

  const url = asset.url;

  // The `images` array-containment filter below serialises as cs.{<url>}, which
  // splits on commas and reads braces and quotes structurally. Every URL this
  // system mints is a project host plus "<folder>/<uuid>.<ext>", so none of those
  // characters can occur — but if one ever did, the filter would silently match
  // nothing and we would delete a file that is still on a product page. Refuse
  // instead: a stuck delete is recoverable, a broken storefront is not.
  if (/[,{}"\\]/.test(url)) {
    console.error(`[admin-media] unsafe url for usage check: ${url}`);
    return serverError(
      "This file's web address has unusual characters, so we could not check where it is used. Nothing was deleted — please get in touch before removing it.",
    );
  }

  // site_content is bounded by the registry (a row per editable field), so both
  // tables are read whole and scanned here rather than filtered in SQL. A
  // jsonb equality filter cannot see a URL nested inside a list item, and
  // building one would mean interpolating a URL — which can contain commas and
  // parentheses — into a PostgREST filter string.
  const [liveContent, draftContent, thumbnails, galleries, collections] =
    await Promise.all([
      db.from("site_content").select("key, value"),
      db.from("site_content_drafts").select("key, value"),
      db
        .from("commerce_products")
        .select("handle, title, deleted_at")
        .eq("thumbnail", url),
      db
        .from("commerce_products")
        .select("handle, title, deleted_at")
        .contains("images", [url]),
      db.from("commerce_collections").select("handle, title").eq("image", url),
    ]);

  const failure =
    liveContent.error ??
    draftContent.error ??
    thumbnails.error ??
    galleries.error ??
    collections.error;
  if (failure) {
    // Fail closed. Deleting because we could not check is how a live page ends up
    // with a broken image.
    console.error("[admin-media] usage check failed:", failure.message);
    return serverError(
      "Could not check where this file is used, so nothing was deleted. Try again in a moment.",
    );
  }

  const usedBy: string[] = [];
  const places: string[] = [];

  for (const raw of liveContent.data ?? []) {
    const row = raw as Record<string, unknown>;
    if (typeof row.key === "string" && valueMentions(row.value, url)) {
      usedBy.push(row.key);
      places.push(contentFieldLabel(row.key));
    }
  }

  for (const raw of draftContent.data ?? []) {
    const row = raw as Record<string, unknown>;
    if (typeof row.key === "string" && valueMentions(row.value, url)) {
      if (usedBy.includes(row.key)) continue;
      usedBy.push(row.key);
      places.push(`${contentFieldLabel(row.key)} (unpublished change)`);
    }
  }

  for (const raw of [...(thumbnails.data ?? []), ...(galleries.data ?? [])]) {
    const row = raw as Record<string, unknown>;
    if (typeof row.handle !== "string") continue;
    const ref = `product:${row.handle}`;
    if (usedBy.includes(ref)) continue;
    usedBy.push(ref);
    const name = typeof row.title === "string" ? row.title : row.handle;
    // A deleted style still holds the reference, and restoring it would find a
    // missing image — so say which list it is in rather than hiding it.
    places.push(row.deleted_at ? `deleted style “${name}”` : `style “${name}”`);
  }

  for (const raw of collections.data ?? []) {
    const row = raw as Record<string, unknown>;
    if (typeof row.handle !== "string") continue;
    const ref = `collection:${row.handle}`;
    if (usedBy.includes(ref)) continue;
    usedBy.push(ref);
    const name = typeof row.title === "string" ? row.title : row.handle;
    places.push(`collection “${name}”`);
  }

  if (usedBy.length > 0) {
    // Built here rather than through conflict() because the UI needs `usedBy` to
    // link the owner straight to each place.
    return NextResponse.json(
      {
        error: `Still in use by ${places.join(", ")}. Replace it there first.`,
        usedBy,
      },
      { status: 409 },
    );
  }

  const { error: storageError } = await db.storage
    .from(asset.bucket)
    .remove([asset.path]);
  if (storageError) {
    // Carry on and drop the row anyway. A row pointing at a file that is gone
    // shows the owner a broken thumbnail they cannot clear; a stored file with no
    // row is invisible and costs a few kilobytes.
    console.error("[admin-media] storage remove failed:", storageError.message);
  }

  const { error: deleteError } = await db
    .from("media_assets")
    .delete()
    .eq("id", asset.id);
  if (deleteError) {
    console.error("[admin-media] delete failed:", deleteError.message);
    return serverError("Could not delete that file. Try again in a moment.");
  }

  await recordAudit(guard.ctx, {
    action: "media.delete",
    entityType: "media",
    entityId: asset.id,
    beforeState: {
      bucket: asset.bucket,
      path: asset.path,
      url: asset.url,
    },
    metadata: { storage_object_removed: !storageError },
  });

  return NextResponse.json({ ok: true, deleted: true });
}
