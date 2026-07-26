import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { getProducts } from "@/lib/commerce/catalog";
import { HeroCinematic } from "@/components/sections/hero-cinematic";
import { ManifestoTypography } from "@/components/sections/manifesto-typography";
import { HorizontalRack } from "@/components/sections/horizontal-rack";
import { CollectionCollage } from "@/components/sections/collection-collage";
import { InstagramGallery } from "@/components/sections/instagram-gallery";
import { Reveal } from "@/components/ui/reveal";
import { buildProductItemListLd } from "@/lib/seo";

/**
 * HOMEPAGE — third architecture.
 *
 * The first version stacked branded sections; the second split text and image
 * into columns. Both read as templates. This one is composed like a spread:
 *
 *   1. HERO       — full-bleed collection film, type printed over it,
 *                   masked line reveals, floating product plate.
 *   2. MANIFESTO  — one oversized sentence with the cloth inside it.
 *   3. RACK       — the collection moves sideways as you scroll down.
 *   4. COLLAGE    — three collections as an asymmetric editorial grid.
 *   5. SOCIAL     — the Instagram rail, quiet.
 *   6. CLOSE      — one vermilion field, one ask.
 */
export default async function HomePage() {
  const products = await getProducts(12);
  const heroProduct = products[0] ?? null;
  const catalogRequestUrl = buildCatalogRequestUrl();
  const itemListLd = buildProductItemListLd(products, {
    name: "Featured Wholesale Kurtis",
    path: "/",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <Navbar />
      <main className="overflow-hidden bg-surface text-content max-lg:pb-[76px]">
        <HeroCinematic
          products={products}
          heroProduct={heroProduct}
          catalogRequestUrl={catalogRequestUrl}
        />

        <ManifestoTypography />

        <HorizontalRack products={products} />

        <CollectionCollage />

        <InstagramGallery />

        {/* ── CLOSE: one field, one ask ── */}
        <section className="relative overflow-hidden bg-accent-red px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-[10vw] right-0 select-none font-serif text-[30vw] italic leading-[0.7] text-black/10"
          >
            R
          </div>
          <div className="relative mx-auto grid max-w-[1600px] gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Reveal y={24}>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">
                  For boutiques, resellers and online sellers
                </p>
                <h2 className="mt-5 text-[clamp(3rem,9vw,9rem)] font-black uppercase leading-[0.8] tracking-[-0.07em]">
                  Build a rail
                  <br />
                  that moves.
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-4">
              <p className="max-w-md text-sm leading-7 text-white/75">
                Start with four sets. Mix styles. Review the catalogue on
                WhatsApp, then place the order through the bulk desk.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
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
