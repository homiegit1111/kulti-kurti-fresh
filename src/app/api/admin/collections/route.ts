/**
 * Admin collections API — list + create.
 *
 *   GET  /api/admin/collections   → every collection, draft included
 *   POST /api/admin/collections   → create one
 *
 * A collection is a storefront page as much as a grouping, so it carries its own
 * editorial copy (subtitle, body) and its own draft/published gate. Products
 * point at a collection by HANDLE, not by id — see the DELETE guard in
 * ./[id]/route.ts for why that matters.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  badRequest,
  conflict,
  guardAdmin,
  readJsonObject,
  recordAudit,
  revalidateStorefront,
  serverError,
} from "@/lib/server/admin-guard";
import { sanitizeUrl } from "@/lib/content/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION_SELECT =
  "id,handle,title,subtitle,description,body,image,rank,status,created_at";

const TITLE_MAX = 120;
const SUBTITLE_MAX = 200;
const DESCRIPTION_MAX = 600;
const BODY_MAX = 4000;
const RANK_MAX = 9999;
const HANDLE_RE = /^[a-z0-9-]{1,120}$/;

/**
 * Ceiling on the product scan used to count members. Only one small column is
 * read, so this is cheaper than a per-collection head count and it is one round
 * trip instead of one per collection.
 */
const PRODUCT_COUNT_CAP = 10_000;

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

/** Only the columns a write may touch. Absent keys are left alone. */
export type CollectionWrite = {
  handle: string;
  title: string;
  subtitle?: string;
  description?: string;
  body?: string;
  image?: string | null;
  rank?: number;
  status?: "draft" | "published";
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Validate a collection payload.
 *
 * `fallbackHandle` is the row's current handle on an edit. Without it, renaming
 * a collection would re-slug the handle and silently change a live URL that is
 * already printed on a line sheet and linked from the storefront.
 *
 * Only keys the caller actually sent are returned, so saving one field cannot
 * blank out the rest.
 */
export function parseCollectionBody(
  body: Record<string, unknown>,
  fallbackHandle: string | null,
): { ok: true; value: CollectionWrite } | { ok: false; error: string } {
  const title = text(body.title);
  if (!title) return { ok: false, error: "Give the collection a name." };
  if (title.length > TITLE_MAX) {
    return {
      ok: false,
      error: `The name is ${title.length} characters — the limit is ${TITLE_MAX}.`,
    };
  }

  const handleRaw = text(body.handle);
  const handle = handleRaw || fallbackHandle || slugify(title);
  if (!handle) {
    // A name written in a non-Latin script slugifies to nothing, so ask for the
    // address instead of blaming the name.
    return {
      ok: false,
      error: "Type a web address for this collection, for example festive-edit.",
    };
  }
  if (!HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error:
        "The web address can use lowercase letters, numbers and hyphens only, for example festive-edit.",
    };
  }

  const value: CollectionWrite = { handle, title };

  if (body.subtitle !== undefined) {
    const subtitle = text(body.subtitle);
    if (subtitle.length > SUBTITLE_MAX) {
      return {
        ok: false,
        error: `The subtitle is ${subtitle.length} characters — the limit is ${SUBTITLE_MAX}.`,
      };
    }
    value.subtitle = subtitle;
  }

  if (body.description !== undefined) {
    const description = text(body.description);
    if (description.length > DESCRIPTION_MAX) {
      return {
        ok: false,
        error: `The short description is ${description.length} characters — the limit is ${DESCRIPTION_MAX}.`,
      };
    }
    value.description = description;
  }

  if (body.body !== undefined) {
    const longBody = text(body.body);
    if (longBody.length > BODY_MAX) {
      return {
        ok: false,
        error: `The page text is ${longBody.length} characters — the limit is ${BODY_MAX}.`,
      };
    }
    value.body = longBody;
  }

  if (body.image !== undefined) {
    const checked = sanitizeUrl(text(body.image));
    if (!checked.ok) return { ok: false, error: checked.error };
    value.image = checked.value || null;
  }

  if (body.rank !== undefined) {
    const raw = body.rank;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.trim() !== ""
          ? Number(raw)
          : NaN;
    if (!Number.isInteger(n) || n < 0 || n > RANK_MAX) {
      return {
        ok: false,
        error: `The sort order must be a whole number between 0 and ${RANK_MAX}. Lower numbers show first.`,
      };
    }
    value.rank = n;
  }

  if (body.status !== undefined) {
    const status = text(body.status);
    if (status !== "draft" && status !== "published") {
      return { ok: false, error: "A collection is either a draft or published." };
    }
    value.status = status;
  }

  return { ok: true, value };
}

export function collectionResponse(
  row: CollectionRow,
  productCount: number,
): Record<string, unknown> {
  return {
    id: row.id,
    handle: row.handle,
    title: row.title ?? "",
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    body: row.body ?? "",
    image: row.image ?? null,
    rank: row.rank ?? 0,
    status: row.status === "draft" ? "draft" : "published",
    productCount,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:read",
    rateLimit: { name: "admin-collections-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { data, error } = await db
    .from("commerce_collections")
    .select(COLLECTION_SELECT)
    .order("rank", { ascending: true })
    .order("title", { ascending: true });
  if (error) {
    console.error("[admin-collections] read failed:", error.message);
    return serverError("Could not load collections right now. Please try again.");
  }

  const { data: productHandles, error: countError } = await db
    .from("commerce_products")
    .select("collection_handle")
    .eq("status", "published")
    .is("deleted_at", null)
    .not("collection_handle", "is", null)
    .limit(PRODUCT_COUNT_CAP);
  if (countError) {
    console.error("[admin-collections] member count failed:", countError.message);
    return serverError("Could not count the styles in each collection. Please try again.");
  }

  const counts = new Map<string, number>();
  for (const row of (productHandles ?? []) as { collection_handle: string | null }[]) {
    if (!row.collection_handle) continue;
    counts.set(row.collection_handle, (counts.get(row.collection_handle) ?? 0) + 1);
  }

  const collections = ((data ?? []) as CollectionRow[]).map((row) =>
    collectionResponse(row, counts.get(row.handle) ?? 0),
  );

  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:write",
    mutation: true,
    rateLimit: { name: "admin-collections-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = parseCollectionBody(parsedBody.body, null);
  if (!parsed.ok) return badRequest(parsed.error);
  const write = parsed.value;

  const { data, error } = await db
    .from("commerce_collections")
    .insert(write)
    .select(COLLECTION_SELECT)
    .single();

  if (error) {
    // 23505 is the unique index on handle — the one collision a shop owner will
    // actually hit, so it gets its own sentence instead of a generic failure.
    if (error.code === "23505") {
      return conflict("A collection with that web address already exists.");
    }
    console.error("[admin-collections] create failed:", error.message);
    return serverError("Could not create the collection. Please try again.");
  }

  const created = data as CollectionRow;

  await recordAudit(guard.ctx, {
    action: "collection.create",
    entityType: "collection",
    entityId: created.id,
    afterState: { ...write },
  });

  await revalidateStorefront(["/", "/collections", `/collections/${created.handle}`]);

  // A new collection has no members yet, so the count is known without a query.
  return NextResponse.json({ collection: collectionResponse(created, 0) }, { status: 201 });
}
