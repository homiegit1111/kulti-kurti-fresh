import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice, getProducts } from "@/lib/commerce/catalog";
import { B2BHero } from "@/components/sections/b2b-hero";
import BuyerLanes from "@/components/sections/buyer-lanes";
import { buildProductItemListLd } from "@/lib/seo";


export default async function HomePage() {
  const products = await getProducts(12);
  const heroProduct = products[0];
  const itemListLd = buildProductItemListLd(products, {
    name: "Featured Wholesale Kurtis",
    path: "/",
  });
  const heroStyleCode = heroProduct ? getStyleCode(heroProduct) : "RP-NEW";
  const heroSizeRun = SIZE_RATIO_LABEL.split("/");

  const lanes = [
    {
      title: "Daily kurtis",
      copy: "fast cotton movement",
      href: "/shop?cat=Kurtis",
      image: products[0]?.image ?? "/images/product-1.png",
    },
    {
      title: "Workwear whites",
      copy: "repeat rails",
      href: "/shop?price=under-2000",
      image: products[1]?.image ?? "/images/product-2.png",
    },
    {
      title: "Blue sets",
      copy: "coordinated packs",
      href: "/shop?cat=Co-ords",
      image: products[2]?.image ?? "/images/product-3.png",
    },
    {
      title: "Festive color",
      copy: "higher-value edits",
      href: "/shop?price=2000-5000",
      image: products[3]?.image ?? "/images/product-4.png",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <Navbar />
      <main className="overflow-hidden homepage-clay text-charcoal">
        <B2BHero
          products={products}
          heroProduct={heroProduct ?? null}
          heroStyleCode={heroStyleCode}
          heroSizeRun={heroSizeRun}
          catalogRequestUrl={buildCatalogRequestUrl()}
        />

        <BuyerLanes lanes={lanes} />

        <section className="bg-[#1c1914] px-4 py-16 text-warm-white sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow text-gold-light">New cards</p>
              <h2 className="mt-4 font-serif text-5xl font-light leading-tight">
                Styles that hold the screen.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-warm-white/62">
                The first eight cards carry product, style code, set price and
                piece price without retail promises that will age badly.
              </p>
            </div>

            <div className="grid gap-px bg-warm-white/12 lg:col-span-8 lg:grid-cols-3">
              {products.slice(0, 6).map((product, index) => {
                const setPrice = product.salePrice ?? product.price;

                return (
                  <Link
                    key={product.id}
                    href={`/shop/${product.handle}`}
                    className={`group bg-warm-white text-charcoal ${
                      index === 0 ? "lg:col-span-2 lg:row-span-2" : ""
                    }`}
                  >
                    <div className={`relative overflow-hidden bg-warm-gray ${index === 0 ? "aspect-[5/4]" : "aspect-[3/4]"}`}>
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                        sizes={index === 0 ? "(max-width: 1024px) 100vw, 44vw" : "(max-width: 768px) 100vw, 22vw"}
                      />
                      <span className="absolute left-3 top-3 bg-warm-white px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal">
                        {getStyleCode(product)}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/38">
                        {product.category} / {SIZE_RATIO_LABEL}
                      </p>
                      <h3 className="mt-2 min-h-[2.5rem] font-serif text-xl leading-tight transition-colors group-hover:text-gold-dark">
                        {product.title}
                      </h3>
                      <div className="mt-4 grid grid-cols-2 border-t border-charcoal/10 pt-3">
                        <p className="text-sm font-semibold">{formatPrice(setPrice)}</p>
                        <p className="border-l border-charcoal/10 pl-4 text-right text-sm font-semibold text-charcoal/62">
                          {formatPrice(getPerPiecePrice(setPrice))}/pc
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-charcoal/10 bg-[#f9f6f0]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Boutique and reseller orders
              </p>
              <h2 className="mt-2 max-w-2xl font-serif text-4xl font-light tracking-normal text-charcoal">
                Convert the moving range into a bulk order.
              </h2>
            </div>
            <Link href="/bulk-order" className="btn-luxe w-fit">
              Open Bulk Deals
              <ShoppingBag className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
      <StickyMobileB2BCta />
      <Footer />
    </>
  );
}
