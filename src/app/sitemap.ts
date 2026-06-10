import type { MetadataRoute } from "next";
import { getProducts, getCollections } from "@/lib/shopify";
import { getEditorialSlugs } from "@/lib/sanity/queries";
import { absoluteUrl } from "@/lib/seo";

// Regenerate the sitemap at most once a day.
export const revalidate = 86400;

/**
 * Dynamic XML sitemap: static marketing pages + every product (PDP) and
 * collection. Helps Google/Bing discover and prioritise crawlable URLs, and
 * feeds AI shopping crawlers a clean URL inventory.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/collections"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/lookbook"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Pull catalog in parallel; fall back gracefully if a fetch fails so the
  // sitemap never 500s (a broken sitemap hurts crawling).
  const [products, collections, editorialSlugs] = await Promise.all([
    getProducts(250).catch(() => []),
    getCollections().catch(() => []),
    getEditorialSlugs().catch(() => []),
  ]);

  const editorialRoutes: MetadataRoute.Sitemap = editorialSlugs.map((slug) => ({
    url: absoluteUrl(`/lookbook/${slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: absoluteUrl(`/shop/${p.handle}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
    url: absoluteUrl(`/collections/${c.handle}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...collectionRoutes,
    ...productRoutes,
    ...editorialRoutes,
  ];
}
