import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import BulkOrderClient from "./bulk-order-client";

export const metadata: Metadata = {
  title: "Bulk Kurti Order - Wholesale Rates for Boutiques & Resellers",
  description:
    "Build a wholesale kurti bulk order across multiple styles. MOQ 4 sets, tier discounts up to 10%, GST invoices, and all-India dispatch from Bangalore. Order on WhatsApp or online.",
  keywords: [
    "bulk kurti order",
    "wholesale kurti bulk order online",
    "kurti wholesale bulk",
    "kurti bulk order for boutique",
    "wholesale kurti supplier bangalore",
    "kurti reseller bulk order",
    "buy kurtis in bulk india",
  ],
  alternates: { canonical: "/bulk-order" },
  openGraph: {
    title: "Bulk Kurti Order | Rangat Pehnawa",
    description:
      "Wholesale kurti bulk ordering for boutiques and resellers. MOQ 4 sets, tier discounts up to 10%, GST invoices, all-India dispatch.",
    url: "/bulk-order",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
    images: [{ url: "/images/hero.png", width: 1200, height: 630, alt: "Rangat Pehnawa wholesale kurti bulk order" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk Kurti Order | Rangat Pehnawa",
    description:
      "Wholesale kurti bulk ordering for boutiques and resellers. MOQ 4 sets, tier discounts up to 10%.",
    images: ["/images/hero.png"],
  },
};

const BULK_FAQS = [
  {
    q: "What is the minimum bulk order for kurtis?",
    a: `The minimum bulk order is ${B2B_CONFIG.minimumOrderSets} sets total. Each set is ${B2B_CONFIG.setSize} pieces in the ${SIZE_RATIO_LABEL} size ratio, so the minimum bulk order is ${B2B_CONFIG.minimumOrderSets * B2B_CONFIG.setSize} pieces across one or more styles.`,
  },
  {
    q: "Do bulk kurti orders get wholesale discounts?",
    a: "Yes. Orders of 8-19 sets unlock a 5% discount and 20+ sets unlock a 10% discount, applied automatically as you build the bulk cart.",
  },
  {
    q: "Do you provide GST invoices and all-India dispatch on bulk orders?",
    a: "GST invoice support is available on request, and bulk orders dispatch across India from Bangalore after stock and payment confirmation.",
  },
  {
    q: "How do I place a bulk kurti order?",
    a: "Add styles as sets to reach your minimum order quantity, review the MOQ and discount tier, then confirm on WhatsApp or checkout online once payment is enabled.",
  },
];

export default function BulkOrderPage() {
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Wholesale Kurti Bulk Ordering",
    serviceType: "Wholesale kurti supply",
    provider: { "@id": absoluteUrl("/#organization") },
    areaServed: { "@type": "Country", name: "India" },
    description:
      "Bulk kurti ordering for boutiques, resellers, online sellers, and distributors. MOQ 4 sets with tier discounts up to 10%, GST invoices, and all-India dispatch.",
    url: absoluteUrl("/bulk-order"),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        minValue: B2B_CONFIG.minimumOrderSets,
        unitText: "set",
      },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Bulk Order", item: absoluteUrl("/bulk-order") },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BULK_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <BulkOrderClient />
    </>
  );
}
