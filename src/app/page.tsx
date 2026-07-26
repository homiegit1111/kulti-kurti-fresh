import Link from "next/link";
import { ArrowRight, ArrowUpRight, Download, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice, getProducts } from "@/lib/commerce/catalog";
import { B2BHero } from "@/components/sections/b2b-hero";
import { FilmShowcase } from "@/components/sections/film-showcase";
import { InstagramGallery } from "@/components/sections/instagram-gallery";
import { LiveLedger } from "@/components/line/live-ledger";
import { Reveal } from "@/components/ui/reveal";
import { buildProductItemListLd } from "@/lib/seo";

/**
 * HOMEPAGE — rebuilt from scratch.
 *
 * The old page stacked five branded sections that each restated the same MOQ
 * facts. This one is a single argument, top to bottom:
 *
 *   1. HERO      — one image, one headline, one action. No carousel theatre.
 *   2. TICKER    — the four trade facts, scrolling once, done.
 *   3. INDEX     — the catalogue as an editorial index: code, name, pack, rate.
 *                  A buyer reads it like a printed line book. Orderable in place.
 *   4. FILM      — one dark section, the cloth in motion. Contrast, not clutter.
 *   5. SOCIAL    — the Instagram rail, quiet.
 *   6. CLOSE     — one CTA, large, final.
 */
export default async function HomePage() {
  const products = await getProducts(12);
  const heroProduct = products[0];
  const catalogRequestUrl = buildCatalogRequestUrl();
  const itemListLd = buildProductItemListLd(products, {
    name: "Featured Wholesale Kurtis",
    path: "/",
  });

  const featured = products.slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <Navbar />
      <main className="overflow-hidden bg-surface text-content">
        <B2BHero
          products={products}
          heroProduct={heroProduct ?? null}
          heroStyleCode={heroProduct ? getStyleCode(heroProduct) : "RP-NEW"}
          heroSizeRun={heroProduct?.sizes ?? [...B2B_CONFIG.sizeRatio]}
          catalogRequestUrl={catalogRequestUrl}
        />

        {/* ── TICKER: the trade facts, one scrolling pass ─────────────── */}
        <section
          aria-label="Wholesale terms"
          className="overflow-hidden border-y border-line/15 bg-surface-2"
        >
          <div className="flex animate-marquee whitespace-nowrap py-3">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center"
              >
                {[
                  `MOQ ${B2B_CONFIG.minimumOrderSets} sets`,
                  `1 set = ${B2B_CONFIG.setSize} pieces`,
                  `Size run ${B2B_CONFIG.sizeRatio.join(" · ")}`,
                  "Maker-direct rate",
                  "GST invoice at dispatch",
                  "Pan-India shipping",
                  "WhatsApp-first ordering",
                ].map((fact) => (
                  <span
                    key={fact}
                    className="flex items-center text-[10px] font-bold uppercase tracking-[0.28em] text-content/60"
                  >
                    <span className="px-6">{fact}</span>
                    <span className="h-1.5 w-1.5 bg-accent-lime" aria-hidden />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── INDEX: the catalogue as a readable ledger ───────────────── */}
        <section className="bg-surface px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1600px]">
            <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Reveal y={24}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
                    The line / 01
                  </p>
                  <h2 className="mt-4 max-w-[14ch] text-5xl font-black uppercase leading-[0.82] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
                    Every style, priced, orderable.
                  </h2>
                </Reveal>
              </div>
              <p className="max-w-[33ch] text-sm leading-6 text-content/60">
                Rates shown per set and per piece. Pack contents are per style,
                not a universal ratio. Commit sets in place — no page change.
              </p>
            </div>

            <div className="mt-10">
              <LiveLedger products={products} />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link href="/line" className="linebook-button linebook-button--dark">
                Open the full line <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href={catalogRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="linebook-button"
              >
                Request catalogue <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ── FEATURED: four styles, large, editorial ─────────────────── */}
        <section className="border-t border-line/15 bg-surface-2 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-12 flex items-end justify-between gap-6 border-b border-line/20 pb-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
                  Featured / 02
                </p>
                <h2 className="mt-4 text-4xl font-black uppercase leading-[0.85] tracking-[-0.05em] sm:text-6xl">
                  Start here.
                </h2>
              </div>
              <Link
                href="/shop"
                className="mb-1 hidden shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-content transition-colors hover:text-accent-red lg:inline-flex"
              >
                All styles
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            </div>

            <div className="grid gap-px border border-line/15 bg-line/15 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product, i) => {
                const setPrice = product.salePrice ?? product.price;
                const perPiece = getPerPiecePrice(setPrice);
                return (
                  <Link
                    key={product.id}
                    href={`/shop/${product.handle}`}
                    className="group relative flex flex-col bg-surface"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-surface-hover">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image}
                        alt={product.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <span className="absolute left-3 top-3 bg-accent-lime px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-on-accent">
                        {getStyleCode(product)}
                      </span>
                      <span className="absolute bottom-0 right-0 bg-surface-inverse px-3 py-2 text-right">
                        <span className="block text-base font-black tracking-[-0.02em] text-accent-lime">
                          {formatPrice(setPrice)}
                        </span>
                        <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-content-inverse/50">
                          {formatPrice(perPiece)}/pc
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3 px-4 py-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black uppercase leading-tight tracking-[-0.02em]">
                          {product.title}
                        </h3>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-content/45">
                          {product.category} · {product.sizes.join("/")} pack
                        </p>
                      </div>
                      <span className="mt-0.5 shrink-0 text-[10px] font-black tabular-nums text-content/30">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-accent-lime transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FILM: one dark section, the cloth in motion ─────────────── */}
        <FilmShowcase />

        {/* ── SOCIAL: the Instagram rail ──────────────────────────────── */}
        <InstagramGallery />

        {/* ── CLOSE: one CTA, large, final ────────────────────────────── */}
        <section className="relative overflow-hidden bg-accent-red px-4 py-16 text-white sm:px-6 lg:px-10 lg:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-12 select-none text-[28vw] font-black uppercase leading-none text-black/10"
          >
            R
          </div>
          <div className="relative mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Reveal y={24}>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">
                  For boutiques, resellers and online sellers
                </p>
                <h2 className="mt-4 text-[clamp(3rem,8vw,8rem)] font-black uppercase leading-[0.78] tracking-[-0.08em]">
                  Build a rail that moves.
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-4">
              <p className="max-w-md text-sm leading-7 text-white/70">
                Start with {B2B_CONFIG.minimumOrderSets} sets. Mix styles.
                Review the catalogue on WhatsApp, then place the order through
                the bulk desk.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/bulk-order"
                  className="linebook-button border-white bg-white text-on-accent hover:bg-accent-lime"
                >
                  Open bulk desk <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href={catalogRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="linebook-button border-white/50 text-white hover:border-white"
                >
                  WhatsApp catalogue <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <StickyMobileB2BCta />
      <Footer />
    </>
  );
}
