import type { Metadata } from "next";
import { absoluteUrl, buildProductItemListLd } from "@/lib/seo";
import { SHOP_FAQS } from "./faqs";
import ShopClient from "./shop-client";
import { getProducts } from "@/lib/commerce/catalog";

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

export default async function ShopPage() {
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <ShopClient initialProducts={products} />
    </>
  );
}
