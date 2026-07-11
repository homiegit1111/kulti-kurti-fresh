import {
  CURATED_REAL_POSTS,
  INSTAGRAM_HANDLE,
  type InstagramFeedItem,
} from "./posts";

/**
 * Optional Graph API when INSTAGRAM_ACCESS_TOKEN is set.
 * Otherwise: curated real @rangatpehnawa shortcodes with live IG media proxy.
 */
async function fetchViaGraphApi(limit: number): Promise<InstagramFeedItem[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  const userId = process.env.INSTAGRAM_USER_ID || "me";
  const base = process.env.INSTAGRAM_GRAPH_BASE || "https://graph.instagram.com";
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const url = `${base}/${userId}/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    console.warn("[instagram] Graph API failed", res.status);
    return [];
  }
  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
    }>;
  };

  return (json.data ?? [])
    .map((m) => {
      const mediaUrl = m.media_url || m.thumbnail_url;
      if (!mediaUrl || !m.permalink) return null;
      return {
        id: m.id,
        permalink: m.permalink,
        mediaUrl,
        caption: m.caption?.slice(0, 120),
        mediaType: m.media_type,
      } satisfies InstagramFeedItem;
    })
    .filter(Boolean) as InstagramFeedItem[];
}

export async function getInstagramFeed(
  limit = 8,
): Promise<{ items: InstagramFeedItem[]; source: string }> {
  try {
    const graph = await fetchViaGraphApi(limit);
    if (graph.length > 0) {
      return { items: graph.slice(0, limit), source: "graph" };
    }
  } catch (e) {
    console.warn("[instagram] graph error", e);
  }

  // Unique curated real posts (media via /api/instagram/media/{code})
  const seen = new Set<string>();
  const unique = CURATED_REAL_POSTS.filter((s) => {
    if (seen.has(s.permalink)) return false;
    seen.add(s.permalink);
    return true;
  }).map((s) => ({
    ...s,
    caption: s.caption || `@${INSTAGRAM_HANDLE}`,
  }));

  return { items: unique.slice(0, limit), source: "instagram-media" };
}
