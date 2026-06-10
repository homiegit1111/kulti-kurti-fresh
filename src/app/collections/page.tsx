import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Collections from "@/components/sections/collections";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Collections — Kurtis, Co-ords, Lehengas & Sarees",
  description:
    "Explore Rangat Pehnawa's curated collections of women's kurtis, co-ord sets, festive lehengas and sarees. Handcrafted Indian ethnic wear, sizes XS–XXL.",
  keywords: [
    "kurti collections",
    "ethnic wear collections",
    "festive kurti",
    "co-ord sets",
    "lehengas",
    "sarees",
  ],
  alternates: { canonical: "/collections" },
  openGraph: {
    title: "Collections | Rangat Pehnawa",
    description:
      "Curated collections of women's kurtis, co-ord sets, lehengas and sarees — handcrafted Indian ethnic wear.",
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
    <div className="bg-[#fcfbf9] min-h-screen text-charcoal flex flex-col font-sans selection:bg-gold selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Navbar />

      <main className="flex-1 relative z-10 pt-24 lg:pt-32">
        {/* We reuse the exact same Collections component from the homepage */}
        <Collections />
      </main>

      <Footer />
    </div>
  );
}
