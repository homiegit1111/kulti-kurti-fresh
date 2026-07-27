/**
 * Admin single-collection API — update + delete.
 *
 *   PATCH  /api/admin/collections/:id
 *   DELETE /api/admin/collections/:id   refuses while published styles point here
 *
 * The validation helpers are imported from ../route.ts so that create and update
 * cannot drift apart: two copies of a validator is how a value the create path
 * rejects gets in through the edit path instead.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  badRequest,
  conflict,
  guardAdmin,
  notFound,
  readJsonObject,
  recordAudit,
  revalidateStorefront,
  serverError,
} from "@/lib/server/admin-guard";
import { collectionResponse, parseCollectionBody } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION_SELECT =
  "id,handle,title,subtitle,description,body,image,rank,status,created_at";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CollectionRow = {
  id: string;
  handle: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  body: string | null;
  image: string | null;
  rank: number | null;
  status: string | null;
};

/** Published, non-deleted styles pointing at a handle — the delete guard's number. */
async function memberCount(db: SupabaseClient, handle: string): Promise<number | null> {
  const { count, error } = await db
    .from("commerce_products")
    .select("id", { count: "exact", head: true })
    .eq("collection_handle", handle)
    .eq("status", "published")
    .is("deleted_at", null);
  if (error) {
    console.error("[admin-collections] member count failed:", error.message);
    return null;
  }
  return count ?? 0;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:write",
    mutation: true,
    rateLimit: { name: "admin-collections-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { id } = await params;
  if (!UUID_RE.test(id ?? "")) {
    return badRequest("That collection could not be found. Reload the page and try again.");
  }

  const { data: existingData, error: readError } = await db
    .from("commerce_collections")
    .select(COLLECTION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[admin-collections] read failed:", readError.message);
    return serverError("Could not open that collection right now. Please try again.");
  }
  const existing = existingData as CollectionRow | null;
  if (!existing) {
    return notFound("That collection no longer exists. Reload the page and try again.");
  }

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = parseCollectionBody(parsedBody.body, existing.handle);
  if (!parsed.ok) return badRequest(parsed.error);
  const write = parsed.value;

  const { data: updatedData, error: updateError } = await db
    .from("commerce_collections")
    .update(write)
    .eq("id", id)
    .select(COLLECTION_SELECT)
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return conflict("A collection with that web address already exists.");
    }
    console.error("[admin-collections] update failed:", updateError.message);
    return serverError("Could not save the collection. Please try again.");
  }

  const updated = updatedData as CollectionRow;

  // commerce_products.collection_handle is an ON UPDATE CASCADE reference, so a
  // renamed handle takes its styles with it — the count is read against the new
  // handle on purpose.
  const count = await memberCount(db, updated.handle);
  if (count === null) {
    return serverError("Saved, but the style count could not be read. Reload the page.");
  }

  await recordAudit(guard.ctx, {
    action: "collection.update",
    entityType: "collection",
    entityId: id,
    beforeState: {
      handle: existing.handle,
      title: existing.title,
      subtitle: existing.subtitle,
      description: existing.description,
      body: existing.body,
      image: existing.image,
      rank: existing.rank,
      status: existing.status,
    },
    afterState: { ...write },
  });

  const paths = new Set([
    "/",
    "/collections",
    `/collections/${existing.handle}`,
    `/collections/${updated.handle}`,
  ]);
  await revalidateStorefront([...paths]);

  return NextResponse.json({ collection: collectionResponse(updated, count) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:delete",
    mutation: true,
    rateLimit: { name: "admin-collections-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { id } = await params;
  if (!UUID_RE.test(id ?? "")) {
    return badRequest("That collection could not be found. Reload the page and try again.");
  }

  const { data: existingData, error: readError } = await db
    .from("commerce_collections")
    .select(COLLECTION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[admin-collections] read failed:", readError.message);
    return serverError("Could not open that collection right now. Please try again.");
  }
  const existing = existingData as CollectionRow | null;
  if (!existing) {
    return notFound("That collection no longer exists. Reload the page and try again.");
  }

  // The foreign key is ON DELETE SET NULL, so deleting would quietly strip the
  // collection off every style in it. Refuse while any published style is still
  // here and say how many, so the owner knows what they are about to lose.
  const count = await memberCount(db, existing.handle);
  if (count === null) {
    return serverError("Could not check what is in this collection. Please try again.");
  }
  if (count > 0) {
    return NextResponse.json(
      {
        error:
          count === 1
            ? "1 style is still in this collection. Move it first."
            : `${count} styles are still in this collection. Move them first.`,
        productCount: count,
      },
      { status: 409 },
    );
  }

  const { error: deleteError } = await db
    .from("commerce_collections")
    .delete()
    .eq("id", id);
  if (deleteError) {
    console.error("[admin-collections] delete failed:", deleteError.message);
    return serverError("Could not delete the collection. Please try again.");
  }

  await recordAudit(guard.ctx, {
    action: "collection.delete",
    entityType: "collection",
    entityId: id,
    beforeState: {
      handle: existing.handle,
      title: existing.title,
      status: existing.status,
      rank: existing.rank,
    },
  });

  await revalidateStorefront(["/", "/collections", `/collections/${existing.handle}`]);

  return NextResponse.json({ ok: true, deleted: true });
}
