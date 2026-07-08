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

interface ItemListEntry {
  handle: string;
  title: string;
  image?: string;
  price?: number;
  salePrice?: number | null;
}

/**
 * Build ItemList JSON-LD for a product grid. Each entry links to its PDP with a
 * lightweight Product node so Google can parse the listing as a carousel/rich
 * result. Keep positions 1-based and stable with render order.
 */
export function buildProductItemListLd(
  products: ItemListEntry[],
  { name, path }: { name: string; path: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(path),
    numberOfItems: products.length,
    itemListElement: products.map((p, index) => {
      const price = p.salePrice ?? p.price;
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: p.title,
          url: absoluteUrl(`/shop/${p.handle}`),
          ...(p.image
            ? { image: /^https?:\/\//.test(p.image) ? p.image : absoluteUrl(p.image) }
            : {}),
          ...(price != null
            ? {
                offers: {
                  "@type": "Offer",
                  priceCurrency: "INR",
                  price,
                },
              }
            : {}),
        },
      };
    }),
  };
}
