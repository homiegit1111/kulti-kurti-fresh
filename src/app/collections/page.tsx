import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCollections } from "@/lib/commerce/catalog";
import { seasonLabel } from "@/lib/line/season";
import { absoluteUrl } from "@/lib/seo";
import { CollectionsIndex } from "./collections-index";

/**
 * Required, not tuning. This page was prerendered once and served until the next
 * deploy, so a collection created in Admin Studio would never appear on the
 * index — the owner would publish into a void. Matches the home page's window and
 * the "live within a minute" promise the studio makes.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Wholesale Collections - Kurti Sets for Resellers",
  description:
    "Explore Rangat Pehnawa modern kurti collections for shoppers, boutiques, and resellers. Fresh drops, practical prices, MOQ 4 sets, and WhatsApp ordering.",
  keywords: [
    "wholesale kurti collections",
    "kurti sets for resellers",
    "boutique wholesale catalog",
    "size ratio kurti sets",
    "kurti manufacturer India",
    "wholesale ethnic wear",
  ],
  alternates: { canonical: "/collections" },
  openGraph: {
    title: "Wholesale Collections | Rangat Pehnawa",
    description:
      "Curated wholesale drops for boutique owners, online sellers, and bulk buyers.",
    url: "/collections",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
  },
};

export default async function CollectionsPage() {
  // One server fetch feeds the whole index — real itemCounts, no mock flash.
  const collections = await getCollections();
  const seasonLine = `${seasonLabel(new Date())}, issued Bengaluru`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Collections", item: absoluteUrl("/collections") },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <Navbar />

      <main className="relative z-10 flex-1">
        <CollectionsIndex collections={collections} seasonLine={seasonLine} />
      </main>

      <Footer />
    </div>
  );
}
