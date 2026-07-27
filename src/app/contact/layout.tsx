import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact - Wholesale Kurti Enquiries & Bulk Orders",
  description:
    "Contact Rangat Pehnawa for wholesale kurti enquiries, bulk orders, GST invoices, and catalog requests. Based in Cubbonpete, Bengaluru. Reach us on WhatsApp, phone, or email.",
  keywords: [
    "wholesale kurti contact",
    "kurti supplier bangalore contact",
    "bulk kurti order enquiry",
    "kurti wholesale whatsapp",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Rangat Pehnawa | Wholesale Kurti Enquiries",
    description:
      "Contact us for wholesale kurti enquiries, bulk orders, and catalog requests. Based in Cubbonpete, Bengaluru.",
    url: "/contact",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
  },
};

const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  "@id": absoluteUrl("/#localbusiness"),
  name: "Rangat Pehnawa",
  description:
    "Wholesale kurti supplier for boutiques, resellers, and distributors across India.",
  url: absoluteUrl("/"),
  telephone: "+918660452247",
  email: "rangatpehnawa@gmail.com",
  image: absoluteUrl("/images/RangatPehnawa.png"),
  priceRange: "₹₹",
  address: {
    "@type": "PostalAddress",
    streetAddress: "3rd Floor, NR Complex, 36, Siddanna Ln, Cubbonpete",
    addressLocality: "Bengaluru",
    addressRegion: "Karnataka",
    postalCode: "560002",
    addressCountry: "IN",
  },
  areaServed: { "@type": "Country", name: "India" },
  sameAs: [
    "https://instagram.com/rangatpehnawa",
    "https://facebook.com/rangatpehnawa",
  ],
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessLd) }}
      />
      {children}
    </>
  );
}
