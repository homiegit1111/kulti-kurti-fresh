/**
 * Admin image upload.
 *
 *   POST /api/admin/upload   multipart/form-data  (field: "file")
 *        → { url: string }   public URL of the stored image
 *
 * Uploads to the PUBLIC Supabase Storage bucket "product-images" via the
 * service role. The bucket must be created once in the Supabase dashboard
 * (Storage → New bucket → name "product-images" → Public).
 *
 * Admin-gated. Validates content type + size in code.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import {
  guardAdminMutation,
  serviceUnavailable,
} from "../products/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type ImageKind = "jpg" | "png" | "webp" | "avif";

/**
 * Detect the real image type from the file's magic bytes — never trust the
 * client-declared MIME type (it's attacker-controlled and can disguise an
 * HTML/SVG/script payload as image/png). Returns null for anything that isn't
 * one of our four allowed raster formats.
 */
function sniffImageKind(bytes: Uint8Array): ImageKind | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "png";
  // RIFF....WEBP  (52 49 46 46 __ __ __ __ 57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "webp";
  // AVIF: ISO-BMFF box "ftyp" at offset 4, brand "avif"/"avis" at offset 8.
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    (bytes[11] === 0x66 || bytes[11] === 0x73)
  )
    return "avif";
  return null;
}

const CONTENT_TYPE: Record<ImageKind, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = checkRateLimit(req, "admin-upload", {
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const mutationGate = await guardAdminMutation(req, "media:write");
  if (!mutationGate.ok) return mutationGate.response;

  const supabase = createServiceRoleClient();
  if (!supabase) return serviceUnavailable();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is larger than the 5 MB limit." },
      { status: 413 },
    );
  }

  // Read bytes, then verify the ACTUAL format from magic bytes — the declared
  // file.type is ignored for the security decision.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImageKind(bytes);
  if (!kind) {
    return NextResponse.json(
      { error: "File is not a valid JPEG, PNG, WebP, or AVIF image." },
      { status: 415 },
    );
  }

  const stamp = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  // Our own extension from the sniffed kind — never from the user's filename.
  const path = `products/${stamp}-${rand}.${kind}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: CONTENT_TYPE[kind],
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error:
          "Upload failed. Confirm the public 'product-images' bucket exists in Supabase Storage.",
      },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
