"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getProducts, type MockProduct } from "@/lib/shopify";
import ShopLoading from "@/app/shop/loading";
import { useWishlist } from "@/lib/wishlist-context";
import { LivingProductCard } from "@/components/ui/living-product-card";
import { ChevronDown } from "lucide-react";

const PRODUCT_REEL_VIDEO = "/videos/background.mp4";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
];

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [categories, setCategories] = useState(["All", "Kurtis", "Lehengas", "Co-ords", "Sarees"]);
  const [products, setProducts] = useState<MockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data);
      const dynamicCategories = ["All", ...new Set(data.map((p) => p.category).filter(Boolean))];
      if (dynamicCategories.length > 1) setCategories(dynamicCategories);
      setIsLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return products
      .filter((p) => activeCategory === "All" || p.category === activeCategory)
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
  }, [activeCategory, sortBy, products]);

  if (isLoading) return <ShopLoading />;

  return (
    <div className="bg-[#fcfbf9] min-h-screen text-charcoal font-sans selection:bg-gold selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-1 relative z-10 pt-24 pb-32">
        {/* ── SLEEK HEADER ── */}
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="font-serif text-3xl sm:text-4xl text-charcoal font-light mb-4">
              The Collection
            </h1>
            <p className="text-sm font-sans text-charcoal/50 max-w-xl mx-auto">
              Modern heirlooms crafted for everyday elegance.
            </p>
          </motion.div>
        </div>

        {/* ── REFINED STICKY FILTER BAR ── */}
        <div className="sticky top-[72px] lg:top-20 z-40 bg-[#fcfbf9]/95 backdrop-blur-xl border-y border-charcoal/5 mb-12">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between py-3 gap-4">
            
            {/* Pill Categories */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                    activeCategory === cat
                      ? "bg-charcoal text-white"
                      : "bg-[#f2f4f7] text-charcoal/60 hover:bg-[#e4e7ec] hover:text-charcoal"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Meta & Sort Dropdown */}
            <div className="flex items-center justify-between w-full md:w-auto gap-6 shrink-0 relative">
              <span className="text-[10px] font-medium text-charcoal/40 hidden lg:block">
                {filtered.length} Results
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
                      className="absolute right-0 top-full mt-4 w-48 bg-white shadow-xl rounded-2xl border border-charcoal/5 overflow-hidden z-50"
                    >
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
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

          {/* Minimal Empty State */}
          {filtered.length === 0 && (
            <div className="text-center py-32">
              <p className="font-serif text-2xl text-charcoal/40 italic">
                Nothing found in this collection.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
