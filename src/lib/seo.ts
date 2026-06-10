/**
 * Shared SEO constants & helpers.
 * Single source of truth for the canonical site origin so sitemap, robots,
 * structured data and metadata all agree.
 */

/** Canonical site origin, no trailing slash. Env override for previews/prod. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.rangatpehnawa.com";

export const SITE_NAME = "Rangat Pehnawa";

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
