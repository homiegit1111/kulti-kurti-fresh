"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getProducts, type MockProduct, COLOR_MAP } from "@/lib/shopify";
import ShopLoading from "@/app/shop/loading";
import { useWishlist } from "@/lib/wishlist-context";
import { LivingProductCard } from "@/components/ui/living-product-card";
import { ChevronDown, X } from "lucide-react";
import { SHOP_FAQS } from "./faqs";

const PRODUCT_REEL_VIDEO = "/videos/background.mp4";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
];

const priceBands = [
  { label: "Under ₹2,000", value: "under-2000", test: (p: number) => p < 2000 },
  {
    label: "₹2,000 – ₹5,000",
    value: "2000-5000",
    test: (p: number) => p >= 2000 && p <= 5000,
  },
  { label: "₹5,000+", value: "5000-plus", test: (p: number) => p > 5000 },
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

  // ── Filter state lives in the URL (shareable, SSR-friendly, back-button OK) ──
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
        {/* ── EDITORIAL HEADER ── */}
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div>
              <p className="eyebrow mb-3">The Atelier</p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-charcoal font-light tracking-tight">
                Kurtis &amp; Ethnic Wear{" "}
                <span className="italic text-charcoal/70">for Women</span>
              </h1>
            </div>
            <p className="text-sm font-sans text-charcoal/50 max-w-xs leading-relaxed md:text-right md:pb-2">
              Daily kurtis, co-ord sets, lehengas &amp; sarees — modern
              heirlooms crafted for everyday elegance.
            </p>
          </motion.div>
        </div>

        {/* ── REFINED STICKY FILTER BAR ── */}
        <div className="sticky top-[72px] lg:top-20 z-40 bg-warm-white/95 backdrop-blur-xl border-y border-charcoal/10 mb-14">
          
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
            className={`transition-all duration-500 overflow-hidden md:max-h-none md:opacity-100 ${
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
                  className={`relative px-1 py-2 text-[10px] font-bold uppercase tracking-[0.22em] transition-colors duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 after:absolute after:left-0 after:-bottom-px after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-gold after:transition-transform after:duration-400 mr-5 last:mr-0 ${
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
                {filtered.length} Pieces
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

          {/* ── FACETS: price bands + color swatches ── */}
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

        {/* ── DENSER PRODUCT GRID (4 columns on lg) ── */}
        <div className="max-w-[1600px] mx-auto px-4 lg:px-12">
          <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-6 md:gap-y-12">
            <AnimatePresence mode="popLayout">
              {filtered.map((product, idx) => {
                const hasVideo = idx % 5 === 0;
                const videoUrl = hasVideo ? PRODUCT_REEL_VIDEO : undefined;
                const isLiving = idx % 5 === 0;

                return (
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
                      videoUrl={videoUrl}
                      isLiving={isLiving}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Loading state (grid only — page chrome + SEO copy stay server-rendered) */}
          {isLoading && (
            <div className="text-center py-32">
              <p className="font-serif text-2xl text-charcoal/40 italic">
                Loading the collection…
              </p>
            </div>
          )}

          {/* Minimal Empty State */}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-32">
              <p className="font-serif text-2xl text-charcoal/40 italic">
                Nothing found in this collection.
              </p>
              {hasActiveFacets && (
                <button
                  onClick={clearAll}
                  className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal underline underline-offset-4 hover:text-gold transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SEO / GEO content: crawlable copy + FAQ (mirrors FAQPage JSON-LD) ── */}
        <section className="max-w-3xl mx-auto px-6 lg:px-12 mt-32 border-t border-charcoal/10 pt-20">
          <p className="eyebrow mb-4">The House</p>
          <h2 className="font-serif text-3xl text-charcoal font-light mb-6">
            Shop Premium Kurtis <span className="italic">Online in India</span>
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-charcoal/60 font-sans">
            <p>
              Rangat Pehnawa is a premium Indian ethnic-wear label for the woman who
              wants pieces that feel considered, wearable and a little special. Our
              women&rsquo;s kurti collection spans breathable cotton kurtis for daily
              wear, hand-finished co-ord sets, festive anarkalis, lehengas and sarees —
              each made to move easily from a workday to an evening celebration.
            </p>
            <p>
              Every kurti is chosen for fabric, fit and craft: handloom cottons that
              breathe through Indian summers, clean silhouettes that flatter every
              frame, and prints rooted in traditional techniques like handblock and
              chikankari. Sizes run XS&ndash;XXL, with Cash on Delivery, free shipping
              over &#8377;1,999 and easy 7-day returns across India.
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
