import type { Metadata } from "next";
import "./globals.css";
import { playfair, inter } from "./fonts";
import { Providers } from "@/components/providers/providers";
import { WebVitals } from "./web-vitals";
import { ClerkProvider } from "@clerk/nextjs";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a1a",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.rangatpehnawa.com";

export const metadata: Metadata = {
  // Resolves all relative OpenGraph/Twitter/canonical URLs to absolute ones.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rangat Pehnawa | Redefining Indian Fashion",
    template: "%s | Rangat Pehnawa",
  },
  description:
    "Discover handcrafted Indian fashion that blends tradition with contemporary elegance. Shop premium kurtis, lehengas, sarees, and co-ord sets at Rangat Pehnawa.",
  applicationName: "Rangat Pehnawa",
  keywords: [
    "Indian fashion",
    "kurtis",
    "lehengas",
    "sarees",
    "ethnic wear",
    "designer clothing",
    "handcrafted fashion",
    "premium Indian wear",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Rangat Pehnawa | Redefining Indian Fashion",
    description:
      "Where tradition meets contemporary elegance. Handcrafted pieces that tell your story.",
    url: "/",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "Rangat Pehnawa — handcrafted Indian fashion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rangat Pehnawa | Redefining Indian Fashion",
    description:
      "Where tradition meets contemporary elegance. Handcrafted pieces that tell your story.",
    images: ["/images/hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.rangatpehnawa.com/#organization",
        "name": "Rangat Pehnawa",
        "url": "https://www.rangatpehnawa.com/",
        "logo": "https://www.rangatpehnawa.com/images/RangatPehnawa.png",
        "sameAs": [
          "https://instagram.com/rangatpehnawa",
          "https://facebook.com/rangatpehnawa"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://www.rangatpehnawa.com/#website",
        "url": "https://www.rangatpehnawa.com/",
        "name": "Rangat Pehnawa",
        "publisher": {
          "@id": "https://www.rangatpehnawa.com/#organization"
        }
      }
    ]
  };

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1a1a1a", // charcoal
          colorText: "#1a1a1a",
          colorBackground: "#ffffff",
          fontFamily: "var(--font-inter), 'Segoe UI', sans-serif",
          borderRadius: "1rem",
        },
        elements: {
          rootBox: "w-full",
          card: "bg-transparent shadow-none w-full max-w-none p-0 border-none",
          headerTitle: "font-serif text-4xl font-normal tracking-tight text-charcoal mb-1",
          headerSubtitle: "text-charcoal/60 font-serif italic text-sm mb-6",
          socialButtonsBlockButton: "bg-white border border-charcoal/10 hover:border-gold/50 hover:bg-gold/5 transition-all h-14 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.02)]",
          socialButtonsBlockButtonText: "text-[10px] font-bold uppercase tracking-widest text-charcoal",
          socialButtonsProviderIcon: "w-4 h-4 grayscale",
          dividerRow: "my-8",
          dividerText: "text-[10px] uppercase tracking-widest text-charcoal/40 font-bold",
          dividerLine: "bg-charcoal/10",
          formFieldLabel: "text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-2",
          formFieldInput: "border-b border-charcoal/10 rounded-none bg-transparent px-0 py-3 text-lg font-serif text-charcoal focus:border-gold focus:ring-0 transition-colors placeholder:text-charcoal/20 placeholder:font-sans placeholder:text-sm",
          formButtonPrimary: "bg-charcoal hover:bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] h-14 rounded-full transition-all w-full mt-6 shadow-[0_10px_20px_rgba(0,0,0,0.1)]",
          footerActionText: "text-charcoal/60 text-xs font-serif italic",
          footerActionLink: "text-gold hover:text-gold/80 font-bold uppercase tracking-wider text-[10px] ml-2 font-sans",
          identityPreviewText: "text-charcoal font-medium text-sm",
          identityPreviewEditButtonIcon: "text-gold w-4 h-4",
          formFieldAction: "text-[9px] uppercase tracking-wider text-gold font-bold hover:text-charcoal",
          alertText: "text-xs font-medium text-red-600",
          alert: "bg-red-50 border border-red-100 rounded-lg p-3 mt-4",
          verificationLink: "text-gold underline hover:text-charcoal transition-colors",
          otpCodeFieldInput: "border-b border-charcoal/10 rounded-none text-2xl font-mono text-center focus:border-gold focus:ring-0 text-charcoal px-0"
        }
      }}
    >
      <html
        lang="en"
        className={`${playfair.variable} ${inter.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col font-sans bg-warm-white text-charcoal relative">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <WebVitals />
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
