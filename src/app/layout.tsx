import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

import { Providers } from "@/components/providers/providers";
import { WebVitals } from "./web-vitals";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { ClerkProvider } from "@clerk/nextjs";
import { isAuthEnabled } from "@/lib/auth/config";

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
    default: "Rangat Pehnawa | Modern Kurti Catalog India",
    template: "%s | Rangat Pehnawa",
  },
  description:
    "Modern kurti catalog for shoppers, boutiques, and online sellers in India. Fresh drops, practical prices, MOQ 4 sets, and WhatsApp ordering.",
  applicationName: "Rangat Pehnawa",
  keywords: [
    "kurti wholesale online",
    "wholesale kurtis India",
    "kurti manufacturer",
    "kurti wholesale price",
    "kurtis for boutique owners",
    "kurti reseller catalog with price",
    "wholesale kurtis online India",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Rangat Pehnawa | Modern Kurti Catalog India",
    description:
      "Modern kurtis for shoppers, boutique owners, and resellers. Fresh drops, practical prices, MOQ 4 sets, and WhatsApp ordering.",
    url: "/",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "Rangat Pehnawa modern kurti catalog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rangat Pehnawa | Modern Kurti Catalog India",
    description:
      "Modern kurtis for shoppers, boutiques, and resellers with MOQ 4 sets and WhatsApp ordering.",
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

  const app = (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Pre-React theme boot: runs before first paint so the correct palette
          is on <html> before anything renders — no light-mode flash, no
          hydration mismatch. Mirrors theme-provider's storage key + DOM
          contract (data-theme + .dark + color-scheme). Kept inline + tiny.

          Rendered via next/script (beforeInteractive, in the root layout —
          the sanctioned location) so Next stamps the per-request CSP nonce
          onto it on strict-dynamic routes (/shop, /login, /sign-up,
          /collections/[slug]). A bare <script> tag has no nonce there and
          gets CSP-blocked → dark-theme users see a light flash. Static
          routes keep working through the CSP2 unsafe-inline fallback.
        */}
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rangat-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.setAttribute('data-theme',t);r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-warm-white text-charcoal relative">
        {/*
          Skip link: first focusable element on every page. Visually hidden
          until keyboard focus, then a square lime chip pinned top-left (house
          focus pattern). Targets the #main-content wrapper below — pages own
          their <main> elements and carry no id, so the layout provides the
          anchor point.
        */}
        <a
          href="#main-content"
          className="sr-only text-[10px] font-bold uppercase tracking-[0.2em] focus:not-sr-only focus:fixed focus:left-0 focus:top-0 focus:z-[100] focus:bg-accent-lime focus:px-4 focus:py-2 focus:text-on-accent"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GoogleAnalytics />
        <WebVitals />
        <Providers>
          {/*
            Skip-link target. display: contents — generates no box, so the
            flex-col body layout and every page's DOM render exactly as before.
          */}
          <div id="main-content" className="contents">
            {children}
          </div>
        </Providers>
        <ConsentBanner />
      </body>
    </html>
  );

  // Storefront resilience: when Clerk isn't configured (local dev, preview
  // deploys) the app renders fully without it; auth surfaces degrade
  // gracefully via @/lib/auth instead of blanking the whole tree.
  if (!isAuthEnabled) return app;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1a1a1a", // charcoal
          colorText: "#1a1a1a",
          colorBackground: "#ffffff",
          fontFamily: "var(--font-inter), 'Segoe UI', sans-serif",
          borderRadius: "0px",
        },
        elements: {
          rootBox: "w-full",
          card: "bg-transparent shadow-none w-full max-w-none p-0 border-none",
          headerTitle: "font-black uppercase text-4xl tracking-[-0.04em] text-charcoal mb-1 leading-[0.9]",
          headerSubtitle: "text-charcoal/60 text-sm mb-6",
          socialButtonsBlockButton: "bg-white border border-charcoal/20 hover:border-gold hover:bg-gold/10 transition-all h-14 rounded-none",
          socialButtonsBlockButtonText: "text-[10px] font-bold uppercase tracking-widest text-charcoal",
          socialButtonsProviderIcon: "w-4 h-4 grayscale",
          dividerRow: "my-8",
          dividerText: "text-[10px] uppercase tracking-widest text-charcoal/40 font-bold",
          dividerLine: "bg-charcoal/10",
          formFieldLabel: "text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-2",
          formFieldInput: "border-b border-charcoal/20 rounded-none bg-transparent px-0 py-3 text-lg font-sans text-charcoal focus:border-gold focus:ring-0 transition-colors placeholder:text-charcoal/20 placeholder:font-sans placeholder:text-sm",
          formButtonPrimary: "bg-charcoal hover:bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] h-14 rounded-none transition-all w-full mt-6",
          footerActionText: "text-charcoal/60 text-xs",
          footerActionLink: "text-gold hover:text-charcoal font-bold uppercase tracking-wider text-[10px] ml-2 font-sans",
          identityPreviewText: "text-charcoal font-medium text-sm",
          identityPreviewEditButtonIcon: "text-gold w-4 h-4",
          formFieldAction: "text-[9px] uppercase tracking-wider text-gold font-bold hover:text-charcoal",
          alertText: "text-xs font-medium text-red-600",
          alert: "bg-red-50 border border-red-100 rounded-none p-3 mt-4",
          verificationLink: "text-gold underline hover:text-charcoal transition-colors",
          otpCodeFieldInput: "border-b border-charcoal/20 rounded-none text-2xl font-mono text-center focus:border-gold focus:ring-0 text-charcoal px-0"
        }
      }}
    >
      {app}
    </ClerkProvider>
  );
}
