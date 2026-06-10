"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_PRODUCTS, formatPrice } from "@/lib/medusa";

export function SearchDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // Prevent background scrolling when search is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
      // Clear query when closed
      resetTimer = setTimeout(() => setQuery(""), 300);
    }
    return () => {
      if (resetTimer) clearTimeout(resetTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const results = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return MOCK_PRODUCTS.filter(
      (p) =>
        p.title.toLowerCase().includes(normalizedQuery) ||
        p.category.toLowerCase().includes(normalizedQuery) ||
        p.description?.toLowerCase().includes(normalizedQuery),
    );
  }, [deferredQuery]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] bg-warm-white/98 backdrop-blur-2xl flex flex-col h-[100dvh]"
        >
          {/* Header */}
          <div className="w-full p-6 lg:px-12 flex justify-between items-center relative z-20 border-b border-charcoal/5">
            <span className="font-serif text-2xl tracking-widest text-charcoal uppercase">
              Search
            </span>
            <button
              onClick={onClose}
              className="p-3 bg-white border border-charcoal/5 hover:bg-charcoal/5 rounded-full transition-colors group"
            >
              <X className="h-5 w-5 text-charcoal group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>

          {/* Aesthetic Background Doodles */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <svg
              className="absolute left-[5%] top-[20%] w-96 h-96 text-gold/10 -rotate-12"
              viewBox="0 0 200 200"
              fill="none"
            >
              <path
                d="M50 150 Q 150 180 180 50 T 50 150"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="5 5"
                fill="none"
              />
              <path
                d="M40 140 L 50 150 L 65 145"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
              />
            </svg>
            <div className="absolute right-[-10%] top-[30%] w-[500px] h-[500px] bg-orange-300/10 rounded-full blur-[120px]" />
            <svg
              className="absolute right-[15%] bottom-[10%] w-64 h-64 text-charcoal/5 animate-[spin_120s_linear_infinite]"
              viewBox="0 0 100 100"
              fill="none"
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="4 8"
              />
            </svg>
          </div>

          {/* Search Content */}
          <div className="flex-1 overflow-y-auto relative z-10 p-6 lg:p-12 no-scrollbar">
            <div className="max-w-6xl mx-auto w-full pt-10 md:pt-16">
              {/* Massive Search Input */}
              <div className="relative flex items-center group">
                <Search className="absolute left-0 h-8 w-8 md:h-12 md:w-12 text-charcoal/30 group-focus-within:text-gold transition-colors" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search our collections..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent pl-12 md:pl-20 py-4 text-4xl md:text-6xl lg:text-8xl font-serif font-light text-charcoal placeholder:text-charcoal/15 focus:outline-none placeholder:font-serif"
                />
                <motion.div
                  initial={false}
                  animate={{ scaleX: query ? 1 : 0 }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold origin-left transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-charcoal/10 -z-10" />
              </div>

              {/* Results or Trending */}
              <div className="mt-16 md:mt-24">
                {query.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="animate-fade-in"
                  >
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-8 flex items-center gap-4">
                      <span className="h-[1px] w-8 bg-gold"></span>
                      Trending Searches
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {[
                        "Ivory Silk Anarkali",
                        "Sage Chanderi",
                        "Summer Co-ords",
                        "Mirror Work",
                        "Lehenga",
                      ].map((term) => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          className="px-6 py-3 bg-white border border-charcoal/5 text-xs md:text-sm font-medium text-charcoal hover:border-gold hover:text-gold transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-full"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : results.length > 0 ? (
                  <div className="animate-fade-in pb-20">
                    <div className="flex items-center justify-between mb-8 border-b border-charcoal/10 pb-4">
                      <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                        Found {results.length} Pieces
                      </p>
                      <Link
                        href="/shop"
                        onClick={onClose}
                        className="text-[10px] md:text-xs uppercase tracking-widest text-gold hover:text-charcoal font-semibold transition-colors flex items-center gap-1 group"
                      >
                        View All{" "}
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                      {results.slice(0, 8).map((product, i) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.4 }}
                        >
                          <Link
                            href={`/shop/${product.handle}`}
                            onClick={onClose}
                            className="group flex flex-col gap-4 bg-white p-4 border border-charcoal/5 hover:border-gold/30 hover:shadow-xl transition-all duration-500 h-full"
                          >
                            <div className="relative aspect-[3/4] w-full bg-warm-gray overflow-hidden">
                              <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                sizes="(max-width: 768px) 50vw, 25vw"
                              />
                              <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-500" />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                                  {product.category}
                                </p>
                                <h4 className="text-sm md:text-base font-serif text-charcoal line-clamp-2 group-hover:text-gold transition-colors">
                                  {product.title}
                                </h4>
                              </div>
                              <p className="text-xs font-semibold text-charcoal mt-3">
                                {formatPrice(
                                  product.salePrice ?? product.price,
                                )}
                              </p>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <Search className="h-16 w-16 text-charcoal/10 mx-auto mb-6" />
                    <p className="font-serif text-3xl md:text-4xl text-charcoal mb-4">
                      No results found
                    </p>
                    <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                      We couldn&apos;t find anything matching &quot;
                      <span className="text-charcoal font-semibold">
                        {query}
                      </span>
                      &quot;. Try a different term or explore our curated
                      collections.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
