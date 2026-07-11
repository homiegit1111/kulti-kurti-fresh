/**
 * Instagram lookbook — real @rangatpehnawa posts only.
 *
 * Images are loaded via `/api/instagram/media/{code}` which streams the
 * public media from Instagram (instagram.com/p/{code}/media/). Not AI.
 * Each tile links to the live post. Visitors never log in.
 */

export const INSTAGRAM_PROFILE =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  "https://www.instagram.com/rangatpehnawa/";

export const INSTAGRAM_HANDLE =
  process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "rangatpehnawa";

export type InstagramFeedItem = {
  id: string;
  permalink: string;
  /** Prefer live IG media proxy; local jpg is fallback inside the proxy */
  mediaUrl: string;
  caption?: string;
  mediaType?: string;
};

/**
 * Confirmed posts from @rangatpehnawa (public shortcodes from web index).
 * mediaUrl hits our IG media proxy → Instagram CDN image.
 */
export const CURATED_REAL_POSTS: InstagramFeedItem[] = [
  {
    id: "DaYdTMtktlz",
    permalink: "https://www.instagram.com/p/DaYdTMtktlz/",
    mediaUrl: "/api/instagram/media/DaYdTMtktlz",
    caption: "Linen dori work co-ords",
  },
  {
    id: "DaaE1TSyb22",
    permalink: "https://www.instagram.com/reel/DaaE1TSyb22/",
    mediaUrl: "/api/instagram/media/DaaE1TSyb22",
    caption: "Designer cotton kurta",
  },
  {
    id: "DXryvhjknSv",
    permalink: "https://www.instagram.com/p/DXryvhjknSv/",
    mediaUrl: "/api/instagram/media/DXryvhjknSv",
    caption: "Soma designs · rayon",
  },
  {
    id: "DXPdU4jElhY",
    permalink: "https://www.instagram.com/p/DXPdU4jElhY/",
    mediaUrl: "/api/instagram/media/DXPdU4jElhY",
    caption: "Grace in every stitch",
  },
  {
    id: "DZj8uunkqgH",
    permalink: "https://www.instagram.com/p/DZj8uunkqgH/",
    mediaUrl: "/api/instagram/media/DZj8uunkqgH",
    caption: "Rayon cord set",
  },
  // Repeat strongest tiles for 8-up grid until more shortcodes are added
  {
    id: "DaYdTMtktlz-b",
    permalink: "https://www.instagram.com/p/DaYdTMtktlz/",
    mediaUrl: "/api/instagram/media/DaYdTMtktlz",
    caption: "Linen dori work co-ords",
  },
  {
    id: "DXPdU4jElhY-b",
    permalink: "https://www.instagram.com/p/DXPdU4jElhY/",
    mediaUrl: "/api/instagram/media/DXPdU4jElhY",
    caption: "Grace in every stitch",
  },
  {
    id: "DaaE1TSyb22-b",
    permalink: "https://www.instagram.com/reel/DaaE1TSyb22/",
    mediaUrl: "/api/instagram/media/DaaE1TSyb22",
    caption: "Designer cotton kurta",
  },
];

export function normalizePostUrl(ref: string): string | null {
  if (!ref) return null;
  if (/^[A-Za-z0-9_-]+$/.test(ref)) {
    return `https://www.instagram.com/p/${ref}/`;
  }
  try {
    const u = new URL(ref);
    if (!u.hostname.includes("instagram.com")) return null;
    return u.toString().split("?")[0].replace(/\/?$/, "/");
  } catch {
    return null;
  }
}

export function shortcodeFromUrl(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}
