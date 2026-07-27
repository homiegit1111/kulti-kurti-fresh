/**
 * Admin media — mint a signed upload URL.
 *
 *   POST /api/admin/media/upload-url
 *        { filename, contentType, bytes, kind, folder }
 *        → { assetId, bucket, path, token, url }
 *
 * The browser then uploads straight to Supabase Storage with the ANON client:
 *
 *   supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)
 *
 * The token is the authorisation, so no key travels with it. Keeping the bytes
 * out of the Worker is not only a speed choice — a 100 MB hero video would
 * exceed the request body limit of the platform this deploys to.
 *
 * THE PATH IS GENERATED HERE, NOT DERIVED FROM THE FILENAME.
 * A client-supplied name is both a path-traversal vector ("../../avatar.png")
 * and a content-type-confusion one ("logo.png" holding HTML). The extension
 * comes from a server-side map keyed on the allowlisted content type, and the
 * basename is a random UUID. The client's filename is used for one thing: a
 * human-readable title.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  badRequest,
  guardAdmin,
  readJsonObject,
  serverError,
} from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaKind = "image" | "video";

type AllowedType = {
  /** The extension WE choose for this content type. Never the client's. */
  ext: string;
  kind: MediaKind;
};

/**
 * The allowlist. Both storage buckets declare the same set in
 * `allowed_mime_types`, so a mismatch here fails at the storage layer too rather
 * than silently storing something unexpected.
 */
const ALLOWED_TYPES: Record<string, AllowedType> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/avif": { ext: "avif", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
};

const MAX_BYTES: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

/**
 * Images go to `product-images`, video to `site-media`.
 *
 * This is load-bearing, not cosmetic. The browser uploads directly to Storage,
 * so nothing in this Worker sees the actual bytes — the bucket's own
 * `file_size_limit` is the ONLY cap that applies while the file is streaming.
 * product-images is capped at 10 MB and accepts only the four image types, which
 * is exactly the image rule; site-media is capped at 100 MB for the hero video.
 * Sending images to site-media would leave the 10 MB limit enforced nowhere
 * until confirm — an hour of storage after the fact.
 */
const BUCKET: Record<MediaKind, string> = {
  image: "product-images",
  video: "site-media",
};

const FOLDER_PATTERN = /^[a-z0-9-]{1,40}$/;
const DEFAULT_FOLDER = "general";
const MAX_TITLE_LENGTH = 120;

/**
 * Drop characters that are invisible or direction-flipping. Written as code
 * point ranges rather than a character class so the source file itself contains
 * no control characters — a literal one here is invisible to the next reader and
 * survives a copy/paste into the regex by accident.
 */
function stripInvisible(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const invisible =
      code < 0x20 ||
      (code >= 0x7f && code <= 0x9f) ||
      (code >= 0x200b && code <= 0x200f) ||
      code === 0x2028 ||
      code === 0x2029 ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0xfeff;
    if (!invisible) out += ch;
  }
  return out;
}

/**
 * A display title from the client's filename. Sanitised because it is stored and
 * shown back to the owner — but never used to build a path, so nothing here is
 * protecting the storage layer.
 */
function titleFromFilename(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const base = raw.split(/[\\/]/).pop() ?? "";
  return stripInvisible(base.replace(/\.[A-Za-z0-9]{1,10}$/, ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

function megabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "media:write",
    mutation: true,
    rateLimit: { name: "admin-media-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db, userId } = guard.ctx;

  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const contentType =
    typeof body.contentType === "string"
      ? body.contentType.trim().toLowerCase()
      : "";
  const allowed = ALLOWED_TYPES[contentType];
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "That file type cannot be uploaded. Use JPEG, PNG, WebP or AVIF for images, or MP4, WebM or MOV for video.",
      },
      { status: 415 },
    );
  }

  const kind = body.kind;
  if (kind !== "image" && kind !== "video") {
    return badRequest("Say whether this is an image or a video.");
  }
  if (kind !== allowed.kind) {
    return badRequest(
      `That file is ${allowed.kind === "video" ? "a video" : "an image"}, but it was sent as ${kind === "video" ? "a video" : "an image"}. Choose the right one and try again.`,
    );
  }

  const bytes =
    typeof body.bytes === "number"
      ? body.bytes
      : typeof body.bytes === "string" && body.bytes.trim() !== ""
        ? Number(body.bytes)
        : NaN;
  if (!Number.isInteger(bytes) || bytes <= 0) {
    return badRequest(
      "That file looks empty. Pick the file again and retry the upload.",
    );
  }
  const cap = MAX_BYTES[kind];
  if (bytes > cap) {
    return NextResponse.json(
      {
        error: `That ${kind} is ${megabytes(bytes)}. The limit for ${kind === "image" ? "an image" : "a video"} is ${megabytes(cap)} — compress it and try again.`,
      },
      { status: 413 },
    );
  }

  // An omitted folder is the library's catch-all, matching the column default.
  const rawFolder =
    typeof body.folder === "string" ? body.folder.trim().toLowerCase() : "";
  const folder = rawFolder === "" ? DEFAULT_FOLDER : rawFolder;
  if (!FOLDER_PATTERN.test(folder)) {
    return badRequest(
      "Folder names use lowercase letters, numbers and dashes only, up to 40 characters.",
    );
  }

  const bucket = BUCKET[kind];
  const path = `${folder}/${crypto.randomUUID()}.${allowed.ext}`;
  const { data: publicUrl } = db.storage.from(bucket).getPublicUrl(path);

  // The row goes in as 'pending' BEFORE the token exists. That ordering means a
  // token is never handed out for an object the library does not know about, and
  // a row for an upload that never happens stays invisible to the storefront and
  // is swept after an hour by sweep_admin_maintenance().
  const { data: created, error: insertError } = await db
    .from("media_assets")
    .insert({
      bucket,
      path,
      url: publicUrl.publicUrl,
      kind,
      mime_type: contentType,
      bytes,
      folder,
      title: titleFromFilename(body.filename),
      status: "pending",
      created_by: userId,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error(
      "[admin-media] pending row insert failed:",
      insertError?.message ?? "no row returned",
    );
    return serverError("Could not start the upload. Try again in a moment.");
  }

  const assetId = (created as Record<string, unknown>).id;
  if (typeof assetId !== "string") {
    console.error("[admin-media] pending row returned no id");
    return serverError("Could not start the upload. Try again in a moment.");
  }

  // No `upsert` option: the path is a fresh UUID, so a token that could overwrite
  // an existing object has no legitimate use here.
  const { data: signed, error: signError } = await db.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (signError || !signed) {
    // Leave no orphan behind — a pending row with no token can never be
    // confirmed, and it would sit in the table for an hour looking like a
    // half-finished upload the owner should worry about.
    await db.from("media_assets").delete().eq("id", assetId);
    console.error(
      "[admin-media] signed upload URL failed:",
      signError?.message ?? "no token returned",
    );
    return serverError(
      `Could not get permission to upload. Check that the "${bucket}" storage bucket exists in Supabase, then try again.`,
    );
  }

  return NextResponse.json({
    assetId,
    bucket,
    path,
    token: signed.token,
    url: publicUrl.publicUrl,
  });
}
