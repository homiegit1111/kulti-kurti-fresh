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
import Link from "next/link";
import { ChevronDown, MessageCircle, Printer, Table2, X } from "lucide-react";
import { SHOP_FAQS } from "./faqs";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

const EASE = [0.16, 1, 0.3, 1] as const;

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

  // Derive categories from SSR products at init so the effect below never has
  // to set state synchronously (react-hooks/set-state-in-effect).
  const [categories, setCategories] = useState(() => {
    const fallback = ["All", "Kurtis", "Lehengas", "Co-ords", "Sarees"];
    if (!initialProducts?.length) return fallback;
    const derived = [
      "All",
      ...new Set(initialProducts.map((p) => p.category).filter(Boolean)),
    ];
    return derived.length > 1 ? derived : fallback;
  });
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
    // SSR data already hydrated products + categories at init.
    if (initialProducts?.length) return;
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
  // Near-identical shades collapse into one swatch (ivory/cream/pearl/white
  // read as four random dots otherwise). A family filters ANY member — the
  // URL carries the members as CSV so links stay shareable.
  const colorFacets = useMemo(() => {
    const COLOR_GROUPS: { label: string; members: string[] }[] = [
      { label: "Ivory & cream", members: ["ivory", "cream", "pearl", "white"] },
    ];
    const unique = [...new Set(products.flatMap((p) => p.colors).filter(Boolean))];
    const seen = new Set<string>();
    const facets: { label: string; value: string; hexes: string[] }[] = [];
    for (const color of unique) {
      if (seen.has(color)) continue;
      const group = COLOR_GROUPS.find((g) =>
        g.members.includes(color.toLowerCase()),
      );
      if (group) {
        const members = unique.filter((c) =>
          group.members.includes(c.toLowerCase()),
        );
        members.forEach((m) => seen.add(m));
        facets.push({
          label: group.label,
          value: members.join(","),
          hexes: members
            .slice(0, 2)
            .map((m) => COLOR_MAP[m.toLowerCase()] ?? "#D9D4CC"),
        });
      } else {
        seen.add(color);
        facets.push({
          label: color,
          value: color,
          hexes: [COLOR_MAP[color.toLowerCase()] ?? "#D9D4CC"],
        });
      }
    }
    return facets;
  }, [products]);

  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const band = priceBands.find((b) => b.value === activePrice);
    return products
      .filter((p) => activeCategory === "All" || p.category === activeCategory)
      .filter(
        (p) =>
          !activeColor ||
          activeColor.split(",").some((c) => p.colors.includes(c)),
      )
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
    <div className="bg-surface min-h-screen text-content font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 lg:pt-36 pb-32">
        {/* Editorial catalogue header */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
            className="border-b-2 border-line pb-6"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow mb-4">Wholesale line book / Catalogue</p>
                <h1 className="font-sans font-black uppercase leading-[0.82] tracking-[-0.06em] text-[clamp(3rem,10vw,8.5rem)]">
                  <span className="block">The</span>
                  {/* stroke uses the content token — a hardcoded ink stroke
                      made this line invisible in dark mode */}
                  <span className="block text-transparent [-webkit-text-stroke:1px_var(--content)] sm:ml-[6vw]">
                    Kurti
                  </span>
                  <span className="block">Index</span>
                </h1>
              </div>

              {/* compact terms + actions — replaces the old paragraph, CTA
                  row and 4-cell stat band (less text, same facts) */}
              <div className="flex flex-col gap-5 md:items-end md:pb-2">
                <p className="max-w-xs text-sm leading-6 text-content/55 md:text-right">
                  Set pricing, live availability, direct ordering — built for
                  boutiques and resellers.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href={buildCatalogRequestUrl()} className="btn-luxe-outline">
                    WhatsApp catalog <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                  <Link href="/line-sheet" className="btn-luxe-outline">
                    Line sheet <Printer className="h-3.5 w-3.5" />
                  </Link>
                  <a href="/bulk-order" className="btn-luxe">
                    Bulk deals <Table2 className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* one-line spec strip — the old stat band, compressed */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-[0.22em] text-content/45">
            {[
              "Low–mid range",
              "Fresh first",
              `MOQ ${B2B_CONFIG.minimumOrderSets} sets`,
              "WhatsApp stock support",
            ].map((spec) => (
              <span key={spec} className="flex items-center gap-2">
                <span className="h-1 w-1 bg-accent-lime" aria-hidden="true" />
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Marquee — ink + lime. overflow-hidden is load-bearing: the w-max
            rail is wider than the viewport and would otherwise stretch the
            document sideways (horizontal scroll + dead gutter). */}
        <div className="mb-10 overflow-hidden border-y border-line bg-surface-inverse py-3 text-content-inverse">
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
                className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.18em]"
              >
                {item}
                <span className="h-1.5 w-1.5 shrink-0 bg-accent-lime" />
              </span>
            ))}
          </div>
        </div>

        {/* Sticky filter bar */}
        <div className="sticky top-[72px] z-40 mb-12 border-y border-line/20 bg-surface/95 backdrop-blur lg:top-[72px]">

          {/* Mobile Toggle Button (Only visible when scrolled down) */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ${
              isScrolled ? "max-h-12 border-b border-line/20" : "max-h-0"
            }`}
          >
            <button
              onClick={() => setIsManualExpand(!isManualExpand)}
              className="w-full flex items-center justify-center gap-2 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-content hover:text-accent-red transition-colors focus-visible:outline-none"
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
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between py-3 gap-4">

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setParam("cat", cat)}
                  className={`relative mr-5 shrink-0 px-1 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 after:absolute after:left-0 after:-bottom-px after:h-0.5 after:w-full after:origin-right after:scale-x-0 after:bg-accent-lime after:transition-transform last:mr-0 focus-visible:outline-none ${
                    activeCategory === cat
                      ? "text-content after:scale-x-100 after:origin-left"
                      : "text-content/40 hover:text-content hover:after:scale-x-100 hover:after:origin-left"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Meta & Sort Dropdown */}
            <div className="flex items-center justify-between w-full md:w-auto gap-6 shrink-0 relative">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/40 hidden lg:block">
                {filtered.length} Styles
              </span>

              <div className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-content hover:text-accent-red transition-colors focus-visible:outline-none"
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
                      transition={{ duration: 0.3, ease: EASE }}
                      className="absolute right-0 top-full mt-4 w-52 bg-surface border border-line overflow-hidden z-50"
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
                              ? "bg-accent-lime text-on-accent"
                              : "text-content/55 hover:bg-line/5 hover:text-content"
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
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex gap-2 flex-wrap">
              {priceBands.map((band) => (
                <button
                  key={band.value}
                  onClick={() => toggleParam("price", band.value)}
                  className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border transition-colors duration-200 focus-visible:outline-none ${
                    activePrice === band.value
                      ? "bg-accent-lime text-on-accent border-line"
                      : "bg-transparent border-line/20 text-content/55 hover:border-line hover:text-content"
                  }`}
                >
                  {band.label}
                </button>
              ))}
            </div>

            {colorFacets.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {colorFacets.map((facet) => {
                  const isActive = activeColor === facet.value;
                  const bg =
                    facet.hexes.length > 1
                      ? `linear-gradient(135deg, ${facet.hexes[0]} 50%, ${facet.hexes[1]} 50%)`
                      : facet.hexes[0];
                  return (
                    <button
                      key={facet.value}
                      onClick={() => toggleParam("color", facet.value)}
                      onMouseEnter={() => setHoveredColor(facet.label)}
                      onMouseLeave={() => setHoveredColor(null)}
                      onFocus={() => setHoveredColor(facet.label)}
                      onBlur={() => setHoveredColor(null)}
                      aria-label={`Filter by ${facet.label}`}
                      aria-pressed={isActive}
                      className={`h-5 w-5 transition-all duration-200 focus-visible:outline-none ${
                        isActive
                          ? "scale-110 ring-2 ring-accent-red ring-offset-2 ring-offset-surface"
                          : "ring-1 ring-line/15 hover:scale-110 hover:ring-line/40"
                      }`}
                      style={{ background: bg }}
                    />
                  );
                })}
                {/* fixed label slot — no floating tooltip to clip inside the
                    collapsible bar; reads like a desk readout */}
                <span
                  aria-live="polite"
                  className="ml-1 min-w-[7rem] text-[9px] font-bold uppercase tracking-[0.18em] text-content/45"
                >
                  {hoveredColor ??
                    (activeColor
                      ? colorFacets.find((f) => f.value === activeColor)?.label
                      : "")}
                </span>
              </div>
            )}

            {hasActiveFacets && (
              <button
                onClick={clearAll}
                className="ml-auto flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-content/50 hover:text-accent-red transition-colors"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
          </div>
        </div>

        {/* Product grid — sr-only h2 keeps heading order intact (card titles
            are h3; without this the page jumps h1 → h3). */}
        <h2 className="sr-only">Catalog styles</h2>
        {/* Product grid */}
        <div className="max-w-[1600px] mx-auto px-4 lg:px-10">
          <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-6 md:gap-y-12">
            <AnimatePresence mode="popLayout">
              {filtered.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: EASE }}
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
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-content/40">
                Loading the collection...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filtered.length === 0 && (
            <div className="mx-auto max-w-2xl border border-line/20 bg-surface-2 px-6 py-16 text-center">
              <p className="eyebrow eyebrow--bare mb-4 justify-center">No Matching Styles</p>
              <h2 className="font-sans text-2xl sm:text-3xl font-black uppercase leading-[0.9] tracking-[-0.04em] text-content">
                Adjust filters or ask for the latest wholesale catalog.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-content/55">
                Some trade drops sell through quickly. WhatsApp us for current
                stock, new arrivals, and style-code availability.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {hasActiveFacets && (
                  <button onClick={clearAll} className="btn-luxe-outline">
                    Clear all filters
                  </button>
                )}
                <a href={buildCatalogRequestUrl()} className="btn-luxe">
                  WhatsApp Catalog <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* SEO content and FAQ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 mt-32 border-t-2 border-line pt-16">
          <p className="eyebrow mb-4">The Shop</p>
          <h2 className="font-sans text-3xl sm:text-4xl font-black uppercase leading-[0.9] tracking-[-0.045em] text-content mb-6">
            Modern kurti catalog online in India
          </h2>
          <div className="space-y-4 text-sm leading-6 text-content/60">
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

          <h2 className="font-sans text-3xl sm:text-4xl font-black uppercase leading-[0.9] tracking-[-0.045em] text-content mt-16 mb-8">
            Frequently Asked
          </h2>
          <div className="border-t border-line/20">
            {SHOP_FAQS.map((faq) => (
              <details key={faq.q} className="group border-b border-line/20 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-sm font-bold uppercase tracking-[0.02em] text-content transition-colors hover:text-accent-red">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 shrink-0 text-content/45 transition-transform duration-300 group-open:rotate-180 group-open:text-accent-red" />
                </summary>
                <p className="mt-4 max-w-xl text-sm leading-6 text-content/60">
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
