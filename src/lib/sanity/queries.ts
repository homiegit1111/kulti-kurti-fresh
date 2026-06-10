// ── GROQ queries + types for the lookbook / editorial ────────────────────────

import { sanityFetch } from "@/lib/sanity/client";

export interface EditorialEntry {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  coverImageRef?: string; // raw asset ref → use sanityImageUrl()
  publishedAt?: string;
}

export interface EditorialDetail extends EditorialEntry {
  // Portable Text blocks — render with @portabletext/react if you add it,
  // or map to your own renderer. Kept loose to avoid a hard dependency.
  body?: unknown[];
  gallery?: string[]; // array of asset refs
}

const LIST_QUERY = `*[_type == "editorial" && !(_id in path("drafts.**"))]
  | order(publishedAt desc)[0...$limit]{
    _id,
    title,
    "slug": slug.current,
    excerpt,
    category,
    "coverImageRef": coverImage.asset._ref,
    publishedAt
  }`;

const DETAIL_QUERY = `*[_type == "editorial" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    excerpt,
    category,
    "coverImageRef": coverImage.asset._ref,
    publishedAt,
    body,
    "gallery": gallery[].asset._ref
  }`;

const SLUGS_QUERY = `*[_type == "editorial" && defined(slug.current)].slug.current`;

export function getEditorialEntries(limit = 24): Promise<EditorialEntry[]> {
  return sanityFetch<EditorialEntry[]>(LIST_QUERY, { limit }, []);
}

export function getEditorialBySlug(
  slug: string,
): Promise<EditorialDetail | null> {
  return sanityFetch<EditorialDetail | null>(DETAIL_QUERY, { slug }, null);
}

export function getEditorialSlugs(): Promise<string[]> {
  return sanityFetch<string[]>(SLUGS_QUERY, {}, []);
}
