"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getProducts, type MockProduct, COLOR_MAP } from "@/lib/commerce/catalog";
import ShopLoading from "@/app/shop/loading";
import { useWishlist } from "@/lib/wishlist-context";
import { LivingProductCard } from "@/components/ui/living-product-card";
import { ChevronDown, MessageCircle, Table2, X } from "lucide-react";
import { SHOP_FAQS } from "./faqs";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
];

const priceBands = [
  { label: "Under Rs2,000", value: "under-2000", test: (p: number) => p < 2000 },
  {
    label: "Rs2,000 - Rs5,000",
    value: "2000-5000",
    test: (p: number) => p >= 2000 && p <= 5000,
  },
  { label: "Rs5,000+", value: "5000-plus", test: (p: number) => p > 5000 },
];

function ShopContent({
  initialProducts,
}: {
  initialProducts?: MockProduct[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSortOpen, setIsSortOpen] = useState(false);
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [categories, setCategories] = useState([
    "All",
    "Kurtis",
    "Lehengas",
    "Co-ords",
    "Sarees",
  ]);
  // Server-provided products ship real HTML on first paint (SEO/LCP);
  // the client effect only runs as a fallback when SSR data is absent.
  const [products, setProducts] = useState<MockProduct[]>(
    initialProducts ?? [],
  );
  const [isLoading, setIsLoading] = useState(!initialProducts?.length);

    // Filter state lives in the URL (shareable, SSR-friendly, back-button OK).
  const activeCategory = searchParams.get("cat") ?? "All";
  const sortBy = searchParams.get("sort") ?? "newest";
  const activeColor = searchParams.get("color");
  const activePrice = searchParams.get("price");

  const [isScrolled, setIsScrolled] = useState(false);
  const [isManualExpand, setIsManualExpand] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
        setIsManualExpand(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initialize
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shouldShowFiltersMobile = !isScrolled || isManualExpand;

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (!value || value === "All" || value === "newest") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleParam = (key: string, value: string) => {
    setParam(key, searchParams.get(key) === value ? null : value);
  };

  const clearAll = () => router.replace(pathname, { scroll: false });

  useEffect(() => {
    if (initialProducts?.length) {
      const dynamicCategories = [
        "All",
        ...new Set(initialProducts.map((p) => p.category).filter(Boolean)),
      ];
      if (dynamicCategories.length > 1) setCategories(dynamicCategories);
      return;
    }
    getProducts().then((data) => {
      setProducts(data);
      const dynamicCategories = [
        "All",
        ...new Set(data.map((p) => p.category).filter(Boolean)),
      ];
      if (dynamicCategories.length > 1) setCategories(dynamicCategories);
      setIsLoading(false);
    });
  }, [initialProducts]);

  // Colors available across the catalog (for the swatch facet)
  const availableColors = useMemo(
    () => [...new Set(products.flatMap((p) => p.colors).filter(Boolean))],
    [products],
  );

  const filtered = useMemo(() => {
    const band = priceBands.find((b) => b.value === activePrice);
    return products
      .filter((p) => activeCategory === "All" || p.category === activeCategory)
      .filter((p) => !activeColor || p.colors.includes(activeColor))
      .filter((p) => !band || band.test(p.salePrice ?? p.price))
      .sort((a, b) => {
        switch (sortBy) {
          case "price-asc":
            return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
          case "price-desc":
            return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
          default:
            return 0; // newest
        }
      });
  }, [activeCategory, activeColor, activePrice, sortBy, products]);

  const hasActiveFacets = Boolean(activeColor || activePrice) || activeCategory !== "All";

  return (
    <div className="bg-warm-white min-h-screen text-charcoal font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 lg:pt-36 pb-32">
        {/* Editorial header */}
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div>
              <p className="eyebrow mb-3">Fresh Kurti Catalog</p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-charcoal font-light tracking-tight">
                Modern kurtis{" "}
                <span className="italic text-gold-dark">for real wardrobes</span>
              </h1>
            </div>
            <p className="text-sm font-sans text-charcoal/50 max-w-xs leading-relaxed md:text-right md:pb-2">
              Price-smart cottons, office fits, and color-pop styles for
              shoppers, boutiques, and online resellers.
            </p>
          </motion.div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={buildCatalogRequestUrl()} className="btn-luxe-outline">
              Get Catalog on WhatsApp <MessageCircle className="h-3.5 w-3.5" />
            </a>
            <a href="/bulk-order" className="btn-luxe">
              Open Bulk Deals <Table2 className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mt-6 grid gap-3 border-y border-charcoal/10 py-4 sm:grid-cols-4">
            {[
              ["Low-mid", "to high-mid range"],
              ["Fresh", "newness first"],
              [`MOQ ${B2B_CONFIG.minimumOrderSets}`, "bulk friendly"],
              ["WhatsApp", "stock support"],
            ].map(([value, label]) => (
              <div key={value}>
                <p className="text-xl font-black text-charcoal">{value}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/45">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10 border-y border-charcoal bg-charcoal py-3 text-white">
          <div className="flex w-max animate-marquee gap-8 whitespace-nowrap px-4">
            {[
              "Daily cotton kurtis",
              "Office-ready fits",
              "Fresh color drops",
              "Bulk deals",
              "WhatsApp catalog",
              "Price-smart styles",
              "Daily cotton kurtis",
              "Office-ready fits",
              "Fresh color drops",
              "Bulk deals",
              "WhatsApp catalog",
              "Price-smart styles",
            ].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Sticky filter bar */}
        <div className="sticky top-[72px] z-40 mb-12 border-y border-charcoal/10 bg-warm-white/95 lg:top-[72px]">
          
          {/* Mobile Toggle Button (Only visible when scrolled down) */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ${
              isScrolled ? "max-h-12 border-b border-charcoal/10" : "max-h-0"
            }`}
          >
            <button
              onClick={() => setIsManualExpand(!isManualExpand)}
              className="w-full flex items-center justify-center gap-2 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal hover:text-gold transition-colors focus-visible:outline-none"
            >
              {isManualExpand ? "Hide Filters" : "Filters & Sort"}
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-300 ${
                  isManualExpand ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 md:max-h-none md:opacity-100 ${
              shouldShowFiltersMobile ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="max-w-[1600px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between py-3 gap-4">

            {/* Pill Categories */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setParam("cat", cat)}
                  className={`relative mr-5 shrink-0 px-1 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 after:absolute after:left-0 after:-bottom-px after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-gold after:transition-transform last:mr-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                    activeCategory === cat
                      ? "text-charcoal after:scale-x-100 after:origin-left"
                      : "text-charcoal/40 hover:text-charcoal hover:after:scale-x-100 hover:after:origin-left"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Meta & Sort Dropdown */}
            <div className="flex items-center justify-between w-full md:w-auto gap-6 shrink-0 relative">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/35 hidden lg:block">
                {filtered.length} Styles
              </span>

              <div className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  Sort By: {sortOptions.find((o) => o.value === sortBy)?.label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-4 w-52 bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.15)] border border-charcoal/10 overflow-hidden z-50"
                    >
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setParam("sort", opt.value);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
                            sortBy === opt.value
                              ? "bg-charcoal/5 text-charcoal"
                              : "text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Facets: price bands + color swatches */}
          <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex gap-2 flex-wrap">
              {priceBands.map((band) => (
                <button
                  key={band.value}
                  onClick={() => toggleParam("price", band.value)}
                  className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                    activePrice === band.value
                      ? "bg-charcoal text-white border-charcoal"
                      : "bg-transparent border-charcoal/15 text-charcoal/55 hover:border-charcoal/50 hover:text-charcoal"
                  }`}
                >
                  {band.label}
                </button>
              ))}
            </div>

            {availableColors.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableColors.map((color) => {
                  const swatch = COLOR_MAP[color.toLowerCase()] ?? "#D9D4CC";
                  const isActive = activeColor === color;
                  return (
                    <button
                      key={color}
                      onClick={() => toggleParam("color", color)}
                      title={color}
                      aria-label={`Filter by ${color}`}
                      aria-pressed={isActive}
                      className={`w-5 h-5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                        isActive
                          ? "ring-2 ring-charcoal ring-offset-2 ring-offset-warm-white"
                          : "ring-1 ring-charcoal/10 hover:ring-charcoal/30"
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  );
                })}
              </div>
            )}

            {hasActiveFacets && (
              <button
                onClick={clearAll}
                className="ml-auto flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-charcoal/50 hover:text-charcoal transition-colors"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
          </div>
        </div>

        {/* Product grid */}
        <div className="max-w-[1600px] mx-auto px-4 lg:px-12">
          <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-6 md:gap-y-12">
            <AnimatePresence mode="popLayout">
              {filtered.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                  >
                    <LivingProductCard
                      product={product}
                      isWishlisted={isWishlisted(product.id)}
                      onToggleWishlist={() => toggleWishlist(product)}
                    />
                  </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-32">
              <p className="font-serif text-2xl text-charcoal/40 italic">
                Loading the collection...
              </p>
            </div>
          )}

          {/* Minimal Empty State */}
          {!isLoading && filtered.length === 0 && (
            <div className="mx-auto max-w-2xl border border-charcoal/10 bg-white px-6 py-16 text-center">
              <p className="eyebrow eyebrow--bare mb-3">No Matching Styles</p>
              <h2 className="font-serif text-3xl font-light text-charcoal">
                Adjust filters or ask for the latest wholesale catalog.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-charcoal/55">
                Some trade drops sell through quickly. WhatsApp us for current
                stock, new arrivals, and style-code availability.
              </p>
              {hasActiveFacets && (
                <button
                  onClick={clearAll}
                  className="mt-8 btn-luxe-outline"
                >
                  Clear all filters
                </button>
              )}
              <a href={buildCatalogRequestUrl()} className="ml-3 mt-8 inline-flex btn-luxe">
                WhatsApp Catalog <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* SEO content and FAQ */}
        <section className="max-w-3xl mx-auto px-6 lg:px-12 mt-32 border-t border-charcoal/10 pt-20">
          <p className="eyebrow mb-4">The Shop</p>
          <h2 className="font-serif text-3xl text-charcoal font-light mb-6">
            Modern kurti catalog <span className="italic">online in India</span>
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-charcoal/60 font-sans">
            <p>
              Rangat Pehnawa is a modern kurti catalog for shoppers, boutique
              owners, online sellers and distributors. The edit spans
              breathable daily cottons, clean workday kurtis, festive color
              wear, hand-finished co-ord sets, anarkalis, lehengas, and sarees
              at practical low-mid to high-mid price points.
            </p>
            <p>
              Bulk buyers can order S/M/L/XL sets with MOQ starting at 4 sets.
              Current stock, invoice details, dispatch, and payment are
              confirmed on WhatsApp.
            </p>
          </div>

          <h2 className="font-serif text-3xl text-charcoal font-light mt-16 mb-8">
            Frequently <span className="italic">Asked</span>
          </h2>
          <div className="divide-y divide-charcoal/10 border-y border-charcoal/10">
            {SHOP_FAQS.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-base text-charcoal transition-colors hover:text-gold-dark">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 shrink-0 text-gold transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-charcoal/60 font-sans max-w-xl">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <StickyMobileB2BCta />
      <Footer />
    </div>
  );
}

export default function ShopClient({
  initialProducts,
}: {
  initialProducts?: MockProduct[];
}) {
  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopContent initialProducts={initialProducts} />
    </Suspense>
  );
}
