/**
 * Customer reviews — server-side data access (service role).
 *
 * Read path feeds both the PDP reviews section and the Product JSON-LD
 * aggregateRating (SEO star snippets). Write path is /api/reviews only:
 * Clerk-authenticated, validated, photos size/type-checked and uploaded to
 * the public `review-photos` storage bucket server-side.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";

export interface ProductReview {
  id: string;
  product_handle: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  photo_urls: string[];
  created_at: string;
}

export interface ReviewSummary {
  count: number;
  average: number;
}

const PHOTO_BUCKET = "review-photos";
export const MAX_REVIEW_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function getPublishedReviews(
  handle: string,
  limit = 50,
): Promise<ProductReview[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_reviews")
    .select(
      "id, product_handle, author_name, rating, title, body, photo_urls, created_at",
    )
    .eq("product_handle", handle)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[reviews] query failed:", error.message);
    return [];
  }
  return (data ?? []) as ProductReview[];
}

export function summarize(reviews: ProductReview[]): ReviewSummary {
  if (!reviews.length) return { count: 0, average: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    count: reviews.length,
    average: Math.round((total / reviews.length) * 10) / 10,
  };
}

/** Upload one validated photo buffer; returns its public URL (or null). */
export async function uploadReviewPhoto(
  userId: string,
  file: { bytes: ArrayBuffer; contentType: string },
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const ext = ALLOWED_PHOTO_TYPES[file.contentType];
  if (!ext) return null;

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file.bytes, { contentType: file.contentType });
  if (error) {
    console.error("[reviews] photo upload failed:", error.message);
    return null;
  }
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function upsertReview(input: {
  productHandle: string;
  clerkUserId: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  photoUrls: string[];
}): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;
  const { error } = await supabase.from("product_reviews").upsert(
    {
      product_handle: input.productHandle,
      clerk_user_id: input.clerkUserId,
      author_name: input.authorName,
      rating: input.rating,
      title: input.title,
      body: input.body,
      photo_urls: input.photoUrls,
      status: "published",
      created_at: new Date().toISOString(),
    },
    { onConflict: "product_handle,clerk_user_id" },
  );
  if (error) {
    console.error("[reviews] upsert failed:", error.message);
    return false;
  }
  return true;
}
