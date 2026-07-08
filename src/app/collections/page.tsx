import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Collections from "@/components/sections/collections";
import { absoluteUrl } from "@/lib/seo";

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

export default function CollectionsPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Collections", item: absoluteUrl("/collections") },
    ],
  };

  return (
    <div className="bg-warm-white min-h-screen text-charcoal flex flex-col font-sans selection:bg-gold selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Navbar />

      <main className="flex-1 relative z-10 pt-24 lg:pt-32">
        <Collections />
      </main>

      <Footer />
    </div>
  );
}
