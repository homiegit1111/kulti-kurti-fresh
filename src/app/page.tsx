import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Boxes, Download, Factory, MessageCircle, Ruler } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice, getProducts } from "@/lib/commerce/catalog";
import { B2BHero } from "@/components/sections/b2b-hero";
import BuyerLanes from "@/components/sections/buyer-lanes";
import { FilmShowcase } from "@/components/sections/film-showcase";
import { CollectionTriptych } from "@/components/sections/collection-triptych";
import { InstagramGallery } from "@/components/sections/instagram-gallery";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { buildProductItemListLd } from "@/lib/seo";

export default async function HomePage() {
  const products = await getProducts(12);
  const heroProduct = products[0];
  const catalogRequestUrl = buildCatalogRequestUrl();
  const itemListLd = buildProductItemListLd(products, {
    name: "Featured Wholesale Kurtis",
    path: "/",
  });

  const buyingProducts = products.slice(0, 5);
  const lanes = buyingProducts.map((product, index) => {
    const setPrice = product.salePrice ?? product.price;
    return {
      title: product.title,
      copy: product.category,
      detail: `${product.sizes.join("/")} pack`,
      code: getStyleCode(product),
      href: `/shop/${product.handle}`,
      image: product.image,
      price: formatPrice(setPrice),
      perPiece: formatPrice(getPerPiecePrice(setPrice)),
      index,
    };
  });

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

        <BuyerLanes lanes={lanes} />

        <section className="bg-surface px-4 py-16 text-content sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-[1600px]">
            <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Reveal y={24}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
                    How the desk works / 03
                  </p>
                  <h2 className="mt-4 max-w-[15ch] text-4xl font-black uppercase leading-[0.85] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                    Four sets opens the account.
                  </h2>
                </Reveal>
              </div>
              <p className="max-w-[34ch] text-sm leading-6 text-content/60">
                Maker-direct wholesale built for boutiques and resellers — no retail markup, no minimum-order theatre. Buy exactly what your rail needs.
              </p>
            </div>

            <RevealGroup stagger={0.08} className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-12 lg:gap-6">
              {[
                {
                  Icon: Boxes,
                  metric: `${B2B_CONFIG.minimumOrderSets} sets`,
                  title: "Low entry, mix freely",
                  note: `Open a trade account from just ${B2B_CONFIG.minimumOrderSets} sets — combine any styles, no single-style bulk lock-in.`,
                },
                {
                  Icon: Ruler,
                  metric: B2B_CONFIG.sizeRatio.join(" · "),
                  title: "Size-complete packs",
                  note: `Every set ships a full ${B2B_CONFIG.sizeRatio.join("/")} size run, so your shelf is ready to sell on arrival.`,
                },
                {
                  Icon: Factory,
                  metric: "Maker-direct",
                  title: "One price, no middle desk",
                  note: "Straight from the production floor at true wholesale — the same standing rate whether you buy four sets or forty.",
                },
              ].map((pillar, index) => {
                const featured = index === 2;
                const { Icon } = pillar;
                return (
                  <RevealItem key={pillar.title}>
                    <div
                      className={`tier-card group relative flex h-full flex-col justify-between overflow-hidden p-6 lg:p-8 ${
                        featured
                          ? "bg-surface-inverse text-content-inverse"
                          : "border border-line/15 bg-surface-2"
                      }`}
                    >
                      {featured && (
                        <div className="linebook-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
                      )}
                      <div className="relative flex items-start justify-between">
                        <span
                          className={`flex h-10 w-10 items-center justify-center border ${
                            featured
                              ? "border-accent-lime/40 text-accent-lime"
                              : "border-line/20 text-content"
                          }`}
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.75} />
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-[0.22em] ${
                            featured ? "text-content-inverse/40" : "text-content/35"
                          }`}
                        >
                          0{index + 1}
                        </span>
                      </div>

                      <div className="relative mt-12 lg:mt-16">
                        <p
                          className={`text-3xl font-black tracking-[-0.035em] sm:text-4xl ${
                            featured ? "text-accent-lime" : "text-content"
                          }`}
                        >
                          {pillar.metric}
                        </p>
                        <p
                          className={`mt-4 text-xs font-bold uppercase tracking-[0.18em] ${
                            featured ? "text-content-inverse" : "text-accent-red"
                          }`}
                        >
                          {pillar.title}
                        </p>
                        <p
                          className={`mt-2 text-xs leading-5 ${
                            featured ? "text-content-inverse/55" : "text-content/55"
                          }`}
                        >
                          {pillar.note}
                        </p>
                      </div>
                    </div>
                  </RevealItem>
                );
              })}
            </RevealGroup>

            <div className="mt-8 flex flex-col gap-4 border-t border-line/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[46ch] text-[11px] font-semibold uppercase tracking-[0.14em] text-content/45">
                One set = {B2B_CONFIG.setSize} pieces · sizes {B2B_CONFIG.sizeRatio.join(" / ")} · settle on WhatsApp or the bulk desk
              </p>
              <Link href="/bulk-order" className="linebook-button linebook-button--dark shrink-0">
                Open bulk desk <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <FilmShowcase />

        <CollectionTriptych />

        <section className="bg-surface-2 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1600px]">
            <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Reveal y={24}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">Current inventory / 02</p>
                  <h2 className="mt-4 max-w-[11ch] text-5xl font-black uppercase leading-[0.82] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
                    The line, without the theatre.
                  </h2>
                </Reveal>
              </div>
              <p className="max-w-[33ch] text-sm leading-6 text-content/60">
                Prices below are shown per set and per piece. Pack availability is taken from each style, not a universal ratio.
              </p>
            </div>

            <div className="hidden grid-cols-[5rem_1.4fr_1fr_0.8fr_0.8fr_3rem] gap-4 border-b border-line/25 py-3 text-[8px] font-bold uppercase tracking-[0.22em] text-content/40 md:grid">
              <span>Image</span><span>Style</span><span>Available pack</span><span>Set</span><span>Per piece</span><span />
            </div>

            <RevealGroup stagger={0.09} delayChildren={0.04}>
              {products.slice(0, 7).map((product, index) => {
                const setPrice = product.salePrice ?? product.price;
                return (
                  <RevealItem key={product.id}>
                  <Link
                    href={`/shop/${product.handle}`}
                    className="inventory-row group grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 border-b border-line/20 py-4 md:grid-cols-[5rem_1.4fr_1fr_0.8fr_0.8fr_3rem]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-surface-hover">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="80px"
                      />
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-content/40">
                        0{index + 1} · {getStyleCode(product)} · {product.category}
                      </p>
                      <h3 className="mt-1 text-lg font-bold leading-tight tracking-[-0.025em] sm:text-xl">
                        {product.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 md:hidden">
                      <div className="text-right">
                        <p className="text-sm font-bold leading-none tracking-[-0.01em]">
                          {formatPrice(setPrice)}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-content/50">
                          {formatPrice(getPerPiecePrice(setPrice))}/pc
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-accent-red" />
                    </div>
                    <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] md:block">
                      {product.sizes.join(" / ")}
                    </p>
                    <p className="hidden text-sm font-bold md:block">{formatPrice(setPrice)}</p>
                    <p className="hidden text-sm font-bold text-content/55 md:block">
                      {formatPrice(getPerPiecePrice(setPrice))}
                    </p>
                    <span className="hidden h-9 w-9 items-center justify-center border border-line/25 transition-all group-hover:border-accent-red group-hover:bg-accent-red group-hover:text-white md:flex">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link href="/shop" className="linebook-button linebook-button--dark">
                Browse all inventory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a href={catalogRequestUrl} target="_blank" rel="noopener noreferrer" className="linebook-button">
                Request catalogue <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        <InstagramGallery />

        <section className="relative overflow-hidden bg-accent-red px-4 py-12 text-white sm:px-6 lg:px-10 lg:py-16">
          <div className="manifesto-type absolute -right-8 -top-12 select-none text-[28vw] font-black uppercase leading-none text-black/8">R</div>
          <div className="relative mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Reveal y={24}>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">For boutiques, resellers and online sellers</p>
                <h2 className="mt-4 text-[clamp(3rem,8vw,8rem)] font-black uppercase leading-[0.78] tracking-[-0.08em]">
                  Build a rail that moves.
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-4">
              <p className="max-w-md text-sm leading-7 text-white/70">
                Start with four sets. Mix styles. Review the catalogue directly on WhatsApp, then place the order through the bulk desk.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link href="/bulk-order" className="linebook-button border-white bg-white text-on-accent hover:bg-accent-lime">
                  Open bulk desk <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a href={catalogRequestUrl} target="_blank" rel="noopener noreferrer" className="linebook-button border-white/50 text-white hover:border-white">
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
