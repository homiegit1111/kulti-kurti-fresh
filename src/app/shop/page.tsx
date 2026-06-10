import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import { SHOP_FAQS } from "./faqs";
import ShopClient from "./shop-client";

// Render on demand so the keyword H1, category copy and FAQ are in the raw HTML
// Googlebot/AI crawlers receive (the client island reads ?cat/&sort/&color/&price,
// which otherwise forces the Suspense fallback during static prerender).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Kurtis for Women — Cotton, Daily & Festive Ethnic Wear",
  description:
    "Shop premium kurtis for women online in India — cotton daily kurtis, co-ord sets, anarkalis, lehengas & sarees. Sizes XS–XXL, COD, free shipping over ₹1,999.",
  keywords: [
    "kurti",
    "kurtis for women",
    "women kurti",
    "daily kurti",
    "cotton kurti",
    "kurti online",
    "ethnic wear for women",
    "buy kurti online india",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop Kurtis for Women | Rangat Pehnawa",
    description:
      "Premium cotton, daily & festive kurtis for women. Sizes XS–XXL, COD, free shipping over ₹1,999.",
    url: "/shop",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
  },
};

export default function ShopPage() {
  // CollectionPage + BreadcrumbList + FAQPage structured data. CollectionPage
  // tells Google/AI this is a category listing; FAQPage (mirrors the visible
  // accordion) is eligible for AI Overviews and rich results.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Kurtis & Ethnic Wear for Women",
    description:
      "Premium women's kurtis and Indian ethnic wear — cotton daily kurtis, co-ord sets, anarkalis, lehengas and sarees.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <ShopClient />
    </>
  );
}
