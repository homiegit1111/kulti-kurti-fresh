/**
 * Admin content API — read the editor payload, stage drafts, publish or roll back.
 *
 *   GET    /api/admin/content
 *          → { groups, published, drafts, overriddenKeys, pendingCount, fromDatabase }
 *
 *   PATCH  /api/admin/content   { values: { "<key>": value } }
 *          Stage edits in site_content_drafts. Nothing reaches the storefront.
 *
 *   POST   /api/admin/content   { action: "publish" | "discard" | "reset" | "revert" }
 *          publish — drafts become live, one revision row each, drafts cleared
 *          discard — drop every staged edit
 *          reset   — send keys back to their registry default
 *          revert  — restore a key's previous published value
 *
 * Editing is a two-step (stage, then publish) so the owner can prepare several
 * changes and flip them together instead of publishing half a page.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  badRequest,
  guardAdmin,
  notFound,
  readJsonObject,
  recordAudit,
  revalidateStorefront,
  serverError,
  type AdminContext,
} from "@/lib/server/admin-guard";
import { roleHas } from "@/lib/server/admin-roles";
import {
  CONTENT_GROUPS,
  getContentDefault,
  getContentField,
} from "@/lib/content/registry";
import { validateContentValue } from "@/lib/content/validate";
import {
  getContentForEditor,
  invalidateSiteContentCache,
} from "@/lib/content/server";
import type { ContentValue } from "@/lib/content/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Paths whose copy comes from the registry. Re-rendered after every publish. */
const AFFECTED_PATHS = ["/", "/collections", "/shop"];

const MAX_KEYS_PER_CALL = 100;

// ---------------------------------------------------------------------------
// Row narrowing
// ---------------------------------------------------------------------------

/**
 * Accept a stored jsonb value only in the shapes ContentValue allows.
 *
 * Same posture as the storefront reader in src/lib/content/server.ts: a row
 * whose shape no longer matches its field (a field that changed type, a hand-run
 * UPDATE in the SQL editor) is treated as absent rather than trusted. Narrowing
 * here rather than casting means a malformed row cannot reach the storefront by
 * riding through a publish.
 */
function narrowContentValue(raw: unknown): ContentValue | undefined {
  if (
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean"
  ) {
    return raw;
  }
  if (!Array.isArray(raw)) return undefined;

  const items: Record<string, string | number | boolean>[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return undefined;
    }
    const item: Record<string, string | number | boolean> = {};
    for (const [cellKey, cell] of Object.entries(
      entry as Record<string, unknown>,
    )) {
      if (
        typeof cell !== "string" &&
        typeof cell !== "number" &&
        typeof cell !== "boolean"
      ) {
        return undefined;
      }
      item[cellKey] = cell;
    }
    items.push(item);
  }
  return items;
}

type KeyedValueRow = { key: string; value: ContentValue };

function narrowKeyedRows(data: unknown): KeyedValueRow[] {
  if (!Array.isArray(data)) return [];
  const rows: KeyedValueRow[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.key !== "string" || row.key === "") continue;
    const value = narrowContentValue(row.value);
    if (value === undefined) continue;
    rows.push({ key: row.key, value });
  }
  return rows;
}

/**
 * Order-insensitive deep equality for the two shapes a content value can take.
 *
 * JSON.stringify is not usable: Postgres jsonb does not preserve key order, so a
 * list item round-tripped through the database serialises differently from the
 * freshly validated one. Comparing structurally is what makes "saving an
 * unchanged list is a no-op" actually true instead of accidentally always false.
 */
function isSameContentValue(a: ContentValue, b: ContentValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((itemA, index) => {
      const itemB = b[index];
      const keysA = Object.keys(itemA);
      const keysB = Object.keys(itemB);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((cellKey) => itemA[cellKey] === itemB[cellKey]);
    });
  }
  return a === b;
}

/**
 * The live value of each key, straight from the table.
 *
 * Deliberately NOT getContentForEditor(): that reads through a 30-second memo,
 * and a stale "published" value here would either store a pointless draft or
 * silently drop a real edit. Reads for display can be a little stale; the
 * comparison that decides whether an edit exists cannot.
 */
async function readPublished(
  db: SupabaseClient,
  keys: string[],
): Promise<Map<string, ContentValue> | null> {
  if (keys.length === 0) return new Map();
  const { data, error } = await db
    .from("site_content")
    .select("key, value")
    .in("key", keys);
  if (error) {
    console.error("[admin-content] published read failed:", error.message);
    return null;
  }
  return new Map(narrowKeyedRows(data).map((row) => [row.key, row.value]));
}

async function countDrafts(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("site_content_drafts")
    .select("key", { count: "exact", head: true });
  if (error) {
    console.error("[admin-content] draft count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// GET — everything the editor needs in one round trip
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "content:write",
    rateLimit: { name: "admin-content-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const [editor, draftResult] = await Promise.all([
    getContentForEditor(),
    db.from("site_content_drafts").select("key, value"),
  ]);

  if (draftResult.error) {
    console.error(
      "[admin-content] draft read failed:",
      draftResult.error.message,
    );
    return serverError(
      "Could not load your unpublished changes. Refresh the page and try again.",
    );
  }

  // A draft for a key that is no longer in the registry is unpublishable, so it
  // is not shown. The publish path sweeps those rows away.
  const drafts: Record<string, ContentValue> = {};
  for (const row of narrowKeyedRows(draftResult.data)) {
    if (!getContentField(row.key)) continue;
    drafts[row.key] = row.value;
  }

  return NextResponse.json({
    groups: CONTENT_GROUPS,
    published: editor.values,
    drafts,
    overriddenKeys: editor.overriddenKeys,
    pendingCount: Object.keys(drafts).length,
    fromDatabase: editor.fromDatabase,
  });
}

// ---------------------------------------------------------------------------
// PATCH — stage edits
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "content:write",
    mutation: true,
    rateLimit: { name: "admin-content-write", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db, userId } = guard.ctx;

  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;

  const rawValues = parsed.body.values;
  if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
    return badRequest(
      "Send the fields to save as a values object, for example {\"values\": {\"home.cover.headline\": \"New headline\"}}.",
    );
  }

  const values = rawValues as Record<string, unknown>;
  const keys = Object.keys(values);
  if (keys.length === 0) {
    // Nothing to do, and nothing worth an audit row.
    return NextResponse.json({
      ok: true,
      saved: 0,
      pendingCount: await countDrafts(guard.ctx.db),
    });
  }
  if (keys.length > MAX_KEYS_PER_CALL) {
    return badRequest(
      `You sent ${keys.length} fields at once — save up to ${MAX_KEYS_PER_CALL} at a time.`,
    );
  }

  // Validate the whole batch before writing anything, so a typo in the last
  // field does not leave the first ten half-saved.
  const cleaned = new Map<string, ContentValue>();
  for (const key of keys) {
    const field = getContentField(key);
    if (!field) return badRequest(`Unknown content field "${key}".`);
    const result = validateContentValue(field, values[key]);
    if (!result.ok) return badRequest(result.error);
    cleaned.set(key, result.value);
  }

  const published = await readPublished(db, keys);
  if (!published) {
    return serverError(
      "Could not check your changes against the live site. Try again in a moment.",
    );
  }

  // An edit that matches what is already live is not a pending change. Deleting
  // instead of storing it keeps the "unpublished changes" count honest.
  const upserts: { key: string; value: ContentValue; updated_by: string }[] = [];
  const noops: string[] = [];
  for (const [key, value] of cleaned) {
    const live = published.get(key) ?? getContentDefault(key);
    if (live !== undefined && isSameContentValue(live, value)) {
      noops.push(key);
    } else {
      upserts.push({ key, value, updated_by: userId });
    }
  }

  if (upserts.length > 0) {
    const { error } = await db
      .from("site_content_drafts")
      .upsert(upserts, { onConflict: "key" });
    if (error) {
      console.error("[admin-content] draft save failed:", error.message);
      return serverError("Could not save your changes. Try again in a moment.");
    }
  }

  if (noops.length > 0) {
    const { error } = await db
      .from("site_content_drafts")
      .delete()
      .in("key", noops);
    if (error) {
      // The owner's edits are saved; only the tidy-up failed. Log it rather than
      // reporting a failure they cannot act on.
      console.error("[admin-content] no-op draft cleanup failed:", error.message);
    }
  }

  await recordAudit(guard.ctx, {
    action: "content.draft",
    entityType: "content",
    entityId: keys.length === 1 ? keys[0] : "batch",
    metadata: { keys, changed: upserts.map((row) => row.key) },
  });

  return NextResponse.json({
    ok: true,
    saved: keys.length,
    pendingCount: await countDrafts(db),
  });
}

// ---------------------------------------------------------------------------
// POST — publish / discard / reset / revert
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // The guard runs first and once, which means the permission has to be named
  // before the body is read — and this endpoint's four actions do not all need
  // the same one. So it guards on the lower of the two (content:write, which
  // "discard" needs) and the publish-class actions get an explicit check below,
  // against the same permission ladder guardAdmin itself uses. The rate budget
  // is the tighter publish bucket for all four: every action here is a
  // deliberate, human-scale click, unlike the draft saves on PATCH.
  const guard = await guardAdmin(req, {
    permission: "content:write",
    mutation: true,
    rateLimit: { name: "admin-content-publish", limit: 20 },
  });
  if (!guard.ok) return guard.response;

  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;

  // Name the action before checking the permission, so a typo reads as "unknown
  // action" rather than "you are not allowed to do that".
  const action = parsed.body.action;
  if (
    action !== "publish" &&
    action !== "discard" &&
    action !== "reset" &&
    action !== "revert"
  ) {
    return badRequest(
      "Tell us what to do: send an action of publish, discard, reset or revert.",
    );
  }

  if (action !== "discard" && !roleHas(guard.ctx.role, "content:publish")) {
    return NextResponse.json(
      {
        error: `Your role (${guard.ctx.role}) cannot publish or roll back content. Ask an owner or manager to do it.`,
        requiredPermission: "content:publish",
      },
      { status: 403 },
    );
  }

  switch (action) {
    case "publish":
      return publishDrafts(guard.ctx);
    case "discard":
      return discardDrafts(guard.ctx);
    case "reset":
      return resetKeys(guard.ctx, parsed.body.keys);
    case "revert":
      return revertKey(guard.ctx, parsed.body.key);
  }
}

async function publishDrafts(ctx: AdminContext): Promise<NextResponse> {
  const { db, userId } = ctx;

  const { data, error } = await db
    .from("site_content_drafts")
    .select("key, value");
  if (error) {
    console.error("[admin-content] publish read failed:", error.message);
    return serverError(
      "Could not read your unpublished changes. Try again in a moment.",
    );
  }

  const draftRows = narrowKeyedRows(data);
  // Every draft key is cleared, including ones that cannot be published — a row
  // for a removed field would otherwise sit in the pending count forever.
  const allDraftKeys = draftRows.map((row) => row.key);
  const publishable = draftRows.filter((row) => Boolean(getContentField(row.key)));

  if (allDraftKeys.length === 0) {
    return NextResponse.json({ ok: true, published: 0 });
  }

  const published = await readPublished(
    db,
    publishable.map((row) => row.key),
  );
  if (!published) {
    return serverError(
      "Could not read the current live copy, so nothing was published. Try again in a moment.",
    );
  }

  if (publishable.length > 0) {
    // History first. If the write below fails we are left with a revision that
    // records a change that did not happen, which is harmless — a revert reads
    // previous_value, which is still correct. Losing the revision instead would
    // leave a live change with no way back.
    const { error: revisionError } = await db
      .from("site_content_revisions")
      .insert(
        publishable.map((row) => ({
          key: row.key,
          value: row.value,
          previous_value: published.get(row.key) ?? null,
          actor_clerk_user_id: userId,
        })),
      );
    if (revisionError) {
      console.error(
        "[admin-content] revision write failed:",
        revisionError.message,
      );
      return serverError(
        "Could not save the change history, so nothing was published. Try again in a moment.",
      );
    }

    const { error: upsertError } = await db.from("site_content").upsert(
      publishable.map((row) => ({
        key: row.key,
        value: row.value,
        updated_by: userId,
      })),
      { onConflict: "key" },
    );
    if (upsertError) {
      console.error("[admin-content] publish write failed:", upsertError.message);
      return serverError(
        "Could not publish your changes. Nothing on the site has changed — try again in a moment.",
      );
    }
  }

  const { error: clearError } = await db
    .from("site_content_drafts")
    .delete()
    .in("key", allDraftKeys);
  if (clearError) {
    // The site is already updated. Reporting a failure would send the owner back
    // to publish again believing nothing happened, which is the worse outcome.
    console.error("[admin-content] draft clear failed:", clearError.message);
  }

  invalidateSiteContentCache();
  await revalidateStorefront(AFFECTED_PATHS);

  await recordAudit(ctx, {
    action: "content.publish",
    entityType: "content",
    entityId: publishable.length === 1 ? publishable[0].key : "batch",
    afterState: Object.fromEntries(
      publishable.map((row) => [row.key, row.value]),
    ),
    metadata: { keys: publishable.map((row) => row.key) },
  });

  return NextResponse.json({ ok: true, published: publishable.length });
}

async function discardDrafts(ctx: AdminContext): Promise<NextResponse> {
  const { db } = ctx;

  const { data, error } = await db.from("site_content_drafts").select("key");
  if (error) {
    console.error("[admin-content] discard read failed:", error.message);
    return serverError(
      "Could not read your unpublished changes. Try again in a moment.",
    );
  }

  const keys: string[] = (Array.isArray(data) ? data : []).flatMap((row) => {
    const key = (row as Record<string, unknown>)?.key;
    return typeof key === "string" && key !== "" ? [key] : [];
  });

  if (keys.length === 0) {
    return NextResponse.json({ ok: true, discarded: 0 });
  }

  const { error: deleteError } = await db
    .from("site_content_drafts")
    .delete()
    .in("key", keys);
  if (deleteError) {
    console.error("[admin-content] discard failed:", deleteError.message);
    return serverError(
      "Could not throw away your unpublished changes. Try again in a moment.",
    );
  }

  await recordAudit(ctx, {
    action: "content.discard",
    entityType: "content",
    entityId: keys.length === 1 ? keys[0] : "batch",
    metadata: { keys },
  });

  // Nothing published changed, so the storefront needs no re-render.
  return NextResponse.json({ ok: true, discarded: keys.length });
}

async function resetKeys(
  ctx: AdminContext,
  rawKeys: unknown,
): Promise<NextResponse> {
  const { db, userId } = ctx;

  if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
    return badRequest(
      "Pick at least one field to return to its original wording.",
    );
  }
  if (rawKeys.length > MAX_KEYS_PER_CALL) {
    return badRequest(
      `You sent ${rawKeys.length} fields at once — reset up to ${MAX_KEYS_PER_CALL} at a time.`,
    );
  }

  const keys: string[] = [];
  for (const raw of rawKeys) {
    if (typeof raw !== "string" || !getContentField(raw)) {
      return badRequest(`Unknown content field "${String(raw)}".`);
    }
    if (!keys.includes(raw)) keys.push(raw);
  }

  const published = await readPublished(db, keys);
  if (!published) {
    return serverError(
      "Could not read the current live copy, so nothing was reset. Try again in a moment.",
    );
  }

  // A null `value` is how the history records "this field went back to the
  // wording it shipped with". previous_value is what a revert would restore.
  const { error: revisionError } = await db
    .from("site_content_revisions")
    .insert(
      keys.map((key) => ({
        key,
        value: null,
        previous_value: published.get(key) ?? null,
        actor_clerk_user_id: userId,
      })),
    );
  if (revisionError) {
    console.error("[admin-content] reset history failed:", revisionError.message);
    return serverError(
      "Could not save the change history, so nothing was reset. Try again in a moment.",
    );
  }

  const { error: liveError } = await db
    .from("site_content")
    .delete()
    .in("key", keys);
  if (liveError) {
    console.error("[admin-content] reset failed:", liveError.message);
    return serverError(
      "Could not reset those fields. Try again in a moment.",
    );
  }

  const { error: draftError } = await db
    .from("site_content_drafts")
    .delete()
    .in("key", keys);
  if (draftError) {
    console.error("[admin-content] reset draft clear failed:", draftError.message);
  }

  invalidateSiteContentCache();
  await revalidateStorefront(AFFECTED_PATHS);

  await recordAudit(ctx, {
    action: "content.reset",
    entityType: "content",
    entityId: keys.length === 1 ? keys[0] : "batch",
    beforeState: Object.fromEntries(
      keys.map((key) => [key, published.get(key) ?? null]),
    ),
    metadata: { keys },
  });

  return NextResponse.json({ ok: true, reset: keys.length });
}

async function revertKey(
  ctx: AdminContext,
  rawKey: unknown,
): Promise<NextResponse> {
  const { db, userId } = ctx;

  if (typeof rawKey !== "string" || rawKey === "") {
    return badRequest("Tell us which field to roll back.");
  }
  if (!getContentField(rawKey)) {
    return badRequest(`Unknown content field "${rawKey}".`);
  }
  const key = rawKey;

  const { data, error } = await db
    .from("site_content_revisions")
    .select("id, previous_value")
    .eq("key", key)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[admin-content] revision read failed:", error.message);
    return serverError(
      "Could not read this field's history. Try again in a moment.",
    );
  }
  if (!data) {
    return notFound(
      "This field has no earlier version to go back to — it has not been published from here yet.",
    );
  }

  // A jsonb null in previous_value means the field had no override before, so
  // rolling back means deleting the row and letting the registry default show.
  const restored = narrowContentValue(
    (data as Record<string, unknown>).previous_value,
  );

  const published = await readPublished(db, [key]);
  if (!published) {
    return serverError(
      "Could not read the current live copy, so nothing was rolled back. Try again in a moment.",
    );
  }
  const current = published.get(key) ?? null;

  // Record the roll-back itself. Without this the live site would change with no
  // history row — a silent edit to a published page is exactly what this table
  // exists to prevent.
  const { error: revisionError } = await db
    .from("site_content_revisions")
    .insert({
      key,
      value: restored ?? null,
      previous_value: current,
      actor_clerk_user_id: userId,
    });
  if (revisionError) {
    console.error("[admin-content] revert history failed:", revisionError.message);
    return serverError(
      "Could not save the change history, so nothing was rolled back. Try again in a moment.",
    );
  }

  if (restored === undefined) {
    const { error: deleteError } = await db
      .from("site_content")
      .delete()
      .eq("key", key);
    if (deleteError) {
      console.error("[admin-content] revert delete failed:", deleteError.message);
      return serverError("Could not roll this field back. Try again in a moment.");
    }
  } else {
    const { error: upsertError } = await db
      .from("site_content")
      .upsert({ key, value: restored, updated_by: userId }, { onConflict: "key" });
    if (upsertError) {
      console.error("[admin-content] revert write failed:", upsertError.message);
      return serverError("Could not roll this field back. Try again in a moment.");
    }
  }

  // If a staged edit now matches what is live, it is no longer a pending change.
  const { data: draftData, error: draftReadError } = await db
    .from("site_content_drafts")
    .select("key, value")
    .eq("key", key)
    .maybeSingle();
  if (draftReadError) {
    console.error("[admin-content] revert draft read failed:", draftReadError.message);
  } else if (draftData) {
    const draftValue = narrowContentValue(
      (draftData as Record<string, unknown>).value,
    );
    const live = restored ?? getContentDefault(key);
    if (
      draftValue !== undefined &&
      live !== undefined &&
      isSameContentValue(draftValue, live)
    ) {
      await db.from("site_content_drafts").delete().eq("key", key);
    }
  }

  invalidateSiteContentCache();
  await revalidateStorefront(AFFECTED_PATHS);

  await recordAudit(ctx, {
    action: "content.revert",
    entityType: "content",
    entityId: key,
    beforeState: { [key]: current },
    afterState: { [key]: restored ?? null },
  });

  return NextResponse.json({
    ok: true,
    key,
    value: restored ?? getContentDefault(key) ?? null,
  });
}
