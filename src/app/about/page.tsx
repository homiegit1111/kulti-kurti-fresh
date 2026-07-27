import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Rangat Pehnawa - Wholesale Kurti Brand from Bangalore",
  description:
    "Rangat Pehnawa is a Bangalore-based wholesale kurti brand bridging historic Indian craftsmanship with modern, minimalist design. Founded by Harsh Jangid. Serving boutiques and resellers across India.",
  keywords: [
    "wholesale kurti brand bangalore",
    "kurti manufacturer india",
    "indian ethnic wear wholesale",
    "kurti supplier bangalore",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Rangat Pehnawa | Wholesale Kurti Brand from Bangalore",
    description:
      "A Bangalore-based wholesale kurti brand bridging historic Indian craftsmanship with modern, minimalist design.",
    url: "/about",
    type: "website",
    locale: "en_IN",
    siteName: "Rangat Pehnawa",
    images: [{ url: "/images/foundernew.png", width: 1200, height: 630, alt: "Harsh Jangid, Founder of Rangat Pehnawa" }],
  },
};

export default function AboutPage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: absoluteUrl("/about"),
    mainEntity: {
      "@id": absoluteUrl("/#organization"),
      "@type": "Organization",
      name: "Rangat Pehnawa",
      founder: { "@type": "Person", name: "Harsh Jangid" },
      description:
        "Bangalore-based wholesale kurti brand bridging historic Indian craftsmanship with modern, minimalist design for boutiques and resellers across India.",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(aboutLd) }}
      />
      <Navbar />

      <main className="flex-1 bg-surface text-content pt-28 pb-24 lg:pt-36 lg:pb-28 min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          {/* Header */}
          <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-red">
                About us / The house
              </p>
              <h1 className="mt-4 max-w-[12ch] text-[clamp(3rem,8vw,8rem)] font-black uppercase leading-[0.8] tracking-[-0.075em]">
                Preserving the past, sculpting the future.
              </h1>
            </div>
            <p className="max-w-[30ch] text-sm leading-6 text-content/60">
              Rangat Pehnawa bridges historic Indian craftsmanship with
              contemporary, minimalist design.
            </p>
          </div>

          {/* Editorial grid */}
          <div className="mt-10 grid grid-cols-1 gap-px bg-line/15 md:grid-cols-12 md:h-[560px]">
            {/* Left Large Image (Founder) */}
            <div className="relative h-[440px] overflow-hidden bg-surface-inverse md:col-span-6 md:h-full group">
              {/* Wall text — layered giant type */}
              <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-end overflow-hidden pb-24 text-center md:pb-28">
                <span className="ml-1 text-[52px] font-black uppercase leading-[0.85] tracking-[-0.04em] text-content-inverse/[0.08] sm:text-[70px] lg:text-[92px]">
                  PEHNAWA
                </span>
                <span className="ml-1 text-[36px] font-black uppercase leading-[0.85] tracking-[0.1em] text-content-inverse/[0.08] sm:text-[48px] lg:text-[60px]">
                  RANGAT
                </span>
              </div>

              {/* Foreground Founder Image */}
              <Image
                src="/images/foundernew.png"
                alt="Harsh Jangid - Founder of Rangat Pehnawa"
                fill
                className="relative z-10 object-cover object-bottom grayscale"
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-surface-inverse via-surface-inverse/20 to-transparent" />

              <div className="absolute bottom-6 left-6 z-30 text-content-inverse">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-lime">
                  Founder
                </p>
                <p className="mt-2 text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                  Harsh Jangid
                </p>
              </div>

              <span className="absolute left-0 top-0 z-30 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent">
                RP / Atelier
              </span>
            </div>

            {/* Right Column (2 Stacked Blocks) */}
            <div className="flex flex-col gap-px bg-line/15 md:col-span-6">
              {/* Top Block: Quote / Vision */}
              <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-surface-2 p-8 md:p-12">
                <span className="pointer-events-none absolute -left-4 -top-8 select-none text-[10rem] font-black leading-none text-content/[0.06]">
                  &ldquo;
                </span>
                <h3 className="relative z-10 mb-6 text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] md:text-3xl lg:text-4xl">
                  We don&apos;t just sell clothes; we curate a lifestyle of
                  modern elegance infused with heritage.
                </h3>
                <div className="relative z-10 flex items-center gap-3">
                  <span className="h-px w-8 bg-accent-red" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-content/50">
                    The Vision
                  </p>
                </div>
              </div>

              {/* Bottom Block: Contact / Atelier */}
              <div className="relative flex flex-col justify-center gap-6 overflow-hidden bg-surface-inverse p-6 text-content-inverse md:flex-[0.7] md:p-10">
                <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-accent-lime">
                      The Atelier
                    </h4>
                    <p className="text-xs leading-6 text-content-inverse/60 md:text-sm">
                      3rd Floor, NR Complex, 36,
                      <br />
                      Siddanna Ln, Cubbonpete,
                      <br />
                      Bengaluru 560002
                    </p>
                  </div>
                  <a
                    href="https://maps.app.goo.gl/ZRJ5Qda5iPvYxb868"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center border border-content-inverse/25 transition-colors hover:border-accent-lime hover:bg-accent-lime hover:text-on-accent sm:mt-0"
                    aria-label="Open studio location in maps"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="relative z-10 mt-6 flex flex-wrap items-center gap-4 border-t border-content-inverse/15 pt-6 md:mt-8 md:gap-6">
                  <a
                    href="tel:8660452247"
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-content-inverse/70 transition-colors hover:text-accent-lime md:text-xs"
                  >
                    8660452247
                  </a>
                  <span className="hidden h-1 w-1 rounded-full bg-surface-2/25 sm:block" />
                  <a
                    href="mailto:rangatpehnawa@gmail.com"
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-content-inverse/70 transition-colors hover:text-accent-lime md:text-xs"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
