import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { absoluteUrl, buildProductItemListLd } from "@/lib/seo";
import { SHOP_FAQS } from "./faqs";
import ShopClient from "./shop-client";
import { getProducts } from "@/lib/commerce/catalog";
import { seasonLabel } from "@/lib/line/season";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modern Kurti Catalog - Fresh Drops and Bulk Deals",
  description:
    "Browse modern kurtis online for shoppers, boutiques, and resellers in India. Fresh drops, practical prices, MOQ 4 sets, and WhatsApp ordering.",
  keywords: [
    "kurti wholesale online",
    "wholesale kurtis India",
    "kurti wholesale price",
    "cotton kurti wholesale",
    "designer kurti wholesale",
    "kurtis for boutique owners",
    "kurti reseller catalog with price",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Modern Kurti Catalog | Rangat Pehnawa",
    description:
      "Modern kurti catalog for shoppers, boutiques, and resellers. Fresh drops, practical prices, and WhatsApp ordering.",
    url: "/shop",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
  },
};

/**
 * Legacy shop param vocabulary → line vocabulary (§5.1): `color`→`col`,
 * `price`→`pp`; `cat` and every line param pass through untouched. Old price
 * bands were SET-price bands; per-piece = set ÷ 4, so each maps to the
 * per-piece bands (facets.ts) it overlaps.
 */
const LEGACY_PRICE_TO_PP: Record<string, string> = {
  "under-2000": "1", // set < ₹2,000 → per piece < ₹500
  "2000-5000": "1,2", // per piece ₹500–₹1,250
  "5000-plus": "2,3,4", // per piece ₹1,250+
};

function shimLegacyParams(
  params: Record<string, string | string[] | undefined>,
): string | null {
  if (params.color === undefined && params.price === undefined) return null;
  const next = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    const value = Array.isArray(raw) ? raw.join(",") : raw;
    if (key === "color") next.set("col", value);
    else if (key === "price") next.set("pp", LEGACY_PRICE_TO_PP[value] ?? value);
    else next.set(key, value);
  }
  return next.toString();
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const shimmed = shimLegacyParams(await searchParams);
  if (shimmed !== null) permanentRedirect(`/shop?${shimmed}`);

  const products = await getProducts();
  const itemListLd = buildProductItemListLd(products, {
    name: "Modern Kurti Catalog",
    path: "/shop",
  });

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Modern Kurti Catalog",
    description:
      "Modern kurtis for shoppers, boutique owners, resellers, online sellers, and distributors in India.",
    url: absoluteUrl("/shop"),
    isPartOf: { "@id": absoluteUrl("/#website") },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SHOP_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListLd) }}
      />
      <ShopClient initialProducts={products} season={seasonLabel(new Date())} />
    </>
  );
}
