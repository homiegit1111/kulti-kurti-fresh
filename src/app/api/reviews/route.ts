/**
 * Customer reviews API.
 *
 *   GET  /api/reviews?handle=<product_handle>
 *        → { reviews: ProductReview[], summary: { count, average } }
 *
 *   POST /api/reviews  multipart/form-data
 *        fields: product_handle, rating (1–5), body, title?, photos[] (≤3,
 *        jpeg/png/webp, ≤5MB each)
 *        Clerk auth required. One review per user per product (upsert).
 *
 * Photos are uploaded server-side to the public `review-photos` bucket via
 * the service role — clients never touch storage directly.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_REVIEW_PHOTOS,
  getPublishedReviews,
  summarize,
  uploadReviewPhoto,
  upsertReview,
} from "@/lib/server/reviews";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,128}$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = checkRateLimit(req, "reviews-read", {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const handle = (
    new URL(req.url).searchParams.get("handle") ?? ""
  ).toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  const reviews = await getPublishedReviews(handle);
  return NextResponse.json(
    { reviews, summary: summarize(reviews) },
    // Light CDN cache — review lists tolerate a minute of staleness.
    { headers: { "Cache-Control": "public, s-maxage=60" } },
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = checkRateLimit(req, "reviews-write", {
    limit: 3,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to leave a review." },
      { status: 401 },
    );
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Reviews are not available right now." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const handle = String(form.get("product_handle") ?? "").toLowerCase();
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") ?? "").trim();
  const title = String(form.get("title") ?? "").trim().slice(0, 120) || null;

  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5." },
      { status: 400 },
    );
  }
  if (body.length < 10 || body.length > 2000) {
    return NextResponse.json(
      { error: "Reviews must be between 10 and 2,000 characters." },
      { status: 400 },
    );
  }

  // Resolve a display name; never trust a client-provided one.
  const user = await currentUser();
  const authorName =
    [user?.firstName, user?.lastName ? `${user.lastName[0]}.` : null]
      .filter(Boolean)
      .join(" ") || "Verified Client";

  // Photos: validate type + size, then upload via service role.
  const photos = form
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_REVIEW_PHOTOS);

  const photoUrls: string[] = [];
  for (const photo of photos) {
    if (!ALLOWED_PHOTO_TYPES[photo.type]) {
      return NextResponse.json(
        { error: "Photos must be JPEG, PNG or WebP." },
        { status: 400 },
      );
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Each photo must be under 5MB." },
        { status: 400 },
      );
    }
    const url = await uploadReviewPhoto(userId, {
      bytes: await photo.arrayBuffer(),
      contentType: photo.type,
    });
    if (url) photoUrls.push(url);
  }

  const ok = await upsertReview({
    productHandle: handle,
    clerkUserId: userId,
    authorName,
    rating,
    title,
    body,
    photoUrls,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "Could not save your review. Please try again." },
      { status: 500 },
    );
  }

  const reviews = await getPublishedReviews(handle);
  return NextResponse.json({ ok: true, reviews, summary: summarize(reviews) });
}
