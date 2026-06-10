// ── Sanity CMS client (dependency-free) ──────────────────────────────────────
//   A tiny GROQ-over-HTTP client so we don't pull the full @sanity/client +
//   next-sanity tree into the bundle for a read-only lookbook. If the editorial
//   needs live preview/drafts later, swap this for next-sanity — the query
//   shapes in queries.ts stay the same.
//
//   Reads are CDN-cached (apicdn) and wrapped in Next's fetch cache (ISR), so
//   the lookbook revalidates without hammering Sanity.

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-10-01";
const readToken = process.env.SANITY_API_READ_TOKEN ?? "";

export function isSanityConfigured(): boolean {
  return Boolean(projectId);
}

interface SanityQueryResponse<T> {
  result: T;
}

/**
 * Run a GROQ query against Sanity. Returns `fallback` when Sanity isn't
 * configured or the request fails, so callers never throw and pages always
 * render (with built-in editorial as a graceful default).
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, string | number> = {},
  fallback: T,
  revalidateSeconds = 300,
): Promise<T> {
  if (!isSanityConfigured()) return fallback;

  // A token implies we may want fresh/draft content → hit the live API;
  // otherwise use the cached CDN host.
  const host = readToken ? "api.sanity.io" : "apicdn.sanity.io";
  const url = new URL(
    `https://${projectId}.${host}/v${apiVersion}/data/query/${dataset}`,
  );
  url.searchParams.set("query", query);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  }

  try {
    const res = await fetch(url.toString(), {
      headers: readToken ? { Authorization: `Bearer ${readToken}` } : {},
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) {
      console.error("[sanity] query failed:", res.status);
      return fallback;
    }
    const json = (await res.json()) as SanityQueryResponse<T>;
    return json.result ?? fallback;
  } catch (err) {
    console.error("[sanity] fetch error:", err);
    return fallback;
  }
}

/** Build a Sanity image CDN URL from an asset ref (e.g. image-abc-1200x800-jpg). */
export function sanityImageUrl(
  ref: string | undefined,
  width = 1200,
): string | null {
  if (!ref || !projectId) return null;
  // ref form: image-<id>-<w>x<h>-<ext>
  const [, id, dimensions, ext] = ref.split("-");
  if (!id || !dimensions || !ext) return null;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${ext}?w=${width}&auto=format&fit=max`;
}
