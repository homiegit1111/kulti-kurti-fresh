"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, ArrowUpRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { MOCK_PRODUCTS, formatPrice } from "@/lib/commerce/catalog";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import type { CommerceProduct } from "@/lib/commerce/catalog";

/* ─── motion tokens ──────────────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const overlayVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.3, ease: EASE } },
};

const staggerParent: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
};

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/* ─── static data ────────────────────────────────────────────────────────── */
const CATEGORIES = ["Kurtis", "Sarees", "Lehengas", "Co-ords"] as const;

const TRENDING = [
  "Chanderi",
  "Anarkali",
  "Mirror work",
  "Rayon co-ords",
  "Sarees",
  "Lehenga",
] as const;

const PREVIEW_PRODUCTS = MOCK_PRODUCTS.slice(0, 4);

/* ─── sub-components ─────────────────────────────────────────────────────── */

/** A chip button — category or trending term */
function Chip({
  label,
  onClick,
  accent = false,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <motion.button
      variants={staggerChild}
      onClick={onClick}
      className={`min-h-[44px] px-4 py-2.5 border text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red ${
        accent
          ? "border-accent-lime/60 text-content bg-accent-lime/15 hover:bg-accent-lime hover:text-on-accent hover:border-accent-lime"
          : "border-line/20 bg-surface-2 text-content hover:bg-surface-inverse hover:text-content-inverse hover:border-line"
      }`}
    >
      {label}
    </motion.button>
  );
}

/** Catalogue-plate result tile */
function ProductTile({
  product,
  index,
  onClose,
  reduced,
}: {
  product: CommerceProduct;
  index: number;
  onClose: () => void;
  reduced: boolean;
}) {
  const setPrice = product.salePrice ?? product.price;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
    >
      <Link
        href={`/shop/${product.handle}`}
        onClick={onClose}
        className="group relative flex flex-col bg-surface-2 border border-line/15 hover:border-line/35 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
      >
        {/* Image well */}
        <div className="relative aspect-[4/5] w-full bg-surface-hover overflow-hidden">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className={`object-cover ${reduced ? "" : "transition-transform duration-700 group-hover:scale-[1.06]"}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {/* Hover scrim */}
          <div
            className="absolute inset-0 bg-line/0 group-hover:bg-line/08 transition-colors duration-500"
            aria-hidden
          />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {product.isNew && (
              <span className="bg-accent-lime text-on-accent text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-0.5">
                New
              </span>
            )}
          </div>
          {/* Arrow affordance */}
          <div className="absolute bottom-2 right-2 w-7 h-7 bg-surface-inverse/0 group-hover:bg-surface-inverse flex items-center justify-center transition-colors duration-300">
            <ArrowUpRight
              className="h-3.5 w-3.5 text-content-inverse opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-hidden
            />
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/45">
            {product.category}
          </p>
          <h4 className="text-sm font-black uppercase tracking-[-0.02em] text-content line-clamp-2 leading-tight group-hover:text-accent-red transition-colors duration-200">
            {product.title}
          </h4>
          <div className="mt-1.5 pt-1.5 border-t border-line/10">
            <p className="text-[11px] font-bold text-content">
              From {formatPrice(setPrice)}
              <span className="text-content/50 font-semibold"> / set</span>
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-content/45">
              {formatPrice(getPerPiecePrice(setPrice))} / pc
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── section label with lime tick ──────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.28em] text-content/45 flex items-center gap-3 mb-4">
      <span className="h-[1.5px] w-6 bg-accent-lime shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */

export function SearchDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion() ?? false;

  /* scroll-lock + query reset */
  useEffect(() => {
    const prev = document.body.style.overflow;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev;
      timer = setTimeout(() => setQuery(""), 300);
    }
    return () => {
      if (timer) clearTimeout(timer);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /* Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* autofocus */
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* filtered results */
  const results = useMemo<CommerceProduct[]>(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return [];
    return MOCK_PRODUCTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [deferredQuery]);

  const hasQuery = query.trim().length > 0;
  const hasResults = hasQuery && results.length > 0;
  const noResults = hasQuery && results.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search the catalogue"
          variants={reduced ? undefined : overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] bg-surface flex flex-col h-[100dvh] overflow-hidden"
        >
          {/* ── decorative bg marks ────────────────────────────────────── */}
          <div
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none"
            aria-hidden
          >
            {/* large rotated rule — top right */}
            <div className="absolute -top-20 -right-24 w-[420px] h-[420px] border border-line/[0.04] rotate-[18deg]" />
            <div className="absolute -top-16 -right-20 w-[380px] h-[380px] border border-line/[0.03] rotate-[18deg]" />
            {/* dashed circle — bottom left */}
            <svg
              className="absolute left-[3%] bottom-[8%] w-72 h-72 text-content/[0.04]"
              viewBox="0 0 100 100"
              fill="none"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="3 7"
              />
              <circle
                cx="50"
                cy="50"
                r="34"
                stroke="currentColor"
                strokeWidth="0.4"
                strokeDasharray="2 6"
              />
            </svg>
            {/* lime corner tick — top left */}
            <svg
              className="absolute top-[72px] left-0 w-20 h-20 text-accent-lime/40"
              viewBox="0 0 40 40"
              fill="none"
            >
              <path d="M1 20 L1 1 L20 1" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          {/* ── top bar ────────────────────────────────────────────────── */}
          <div className="relative z-20 flex items-center justify-between px-5 md:px-10 lg:px-14 h-14 border-b border-line/15 shrink-0">
            {/* wordmark / kicker */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-[8px] font-bold uppercase tracking-[0.3em] text-content/35">
                Rangat Index
              </span>
              <span className="hidden sm:block h-3 w-px bg-line/20" aria-hidden />
              <AnimatePresence mode="wait">
                {hasResults ? (
                  <motion.span
                    key="count"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/55"
                  >
                    {results.length} {results.length === 1 ? "style" : "styles"}
                  </motion.span>
                ) : (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/55"
                  >
                    Search
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* close button */}
            <button
              onClick={onClose}
              aria-label="Close search"
              className="group relative flex items-center justify-center w-11 h-11 border border-line/20 bg-surface-2 hover:bg-surface-inverse hover:border-line transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red shrink-0"
            >
              <X
                className={`h-4 w-4 text-content group-hover:text-content-inverse transition-colors duration-200 ${reduced ? "" : "group-hover:rotate-90 transition-transform duration-300"}`}
                aria-hidden
              />
              <span className="absolute -bottom-5 right-0 hidden lg:block text-[8px] font-bold uppercase tracking-[0.2em] text-content/30 whitespace-nowrap">
                Esc
              </span>
            </button>
          </div>

          {/* ── scrollable body ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 px-5 md:px-10 lg:px-14 pb-16 md:pb-20">
            <div className="max-w-6xl mx-auto w-full">

              {/* ── search input ──────────────────────────────────────── */}
              <div className="relative mt-8 md:mt-12 group">
                <label htmlFor="search-input" className="sr-only">
                  Search styles, fabric, category
                </label>
                {/* Search icon */}
                <Search
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 md:h-7 md:w-7 text-content/30 group-focus-within:text-accent-red transition-colors duration-200 pointer-events-none"
                  aria-hidden
                />
                <input
                  id="search-input"
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Search the line — style, fabric, category"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="
                    w-full bg-transparent
                    pl-9 md:pl-12
                    py-4
                    text-2xl sm:text-3xl md:text-4xl lg:text-5xl
                    font-black uppercase tracking-[-0.04em]
                    text-content
                    placeholder:text-content/18
                    focus:outline-none
                    min-w-0
                  "
                  style={{ caretColor: "#cc2f4a" }}
                />
                {/* base underline */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-line/15" aria-hidden />
                {/* animated accent underline */}
                <motion.div
                  initial={false}
                  animate={{
                    scaleX: query ? 1 : 0,
                    backgroundColor: query ? "#cc2f4a" : "#d8ff4f",
                  }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
                  aria-hidden
                />
              </div>

              {/* ── results area ──────────────────────────────────────── */}
              <div className="mt-10 md:mt-14">

                {/* ── state A: empty query — browse + trending + previews ── */}
                <AnimatePresence mode="wait">
                  {!hasQuery && (
                    <motion.div
                      key="empty"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      {/* Browse by category */}
                      <div className="mb-10">
                        <SectionLabel>Browse by category</SectionLabel>
                        <motion.div
                          variants={reduced ? undefined : staggerParent}
                          initial="hidden"
                          animate="visible"
                          className="flex flex-wrap gap-2.5"
                        >
                          {CATEGORIES.map((cat) => (
                            <Chip
                              key={cat}
                              label={cat}
                              onClick={() => setQuery(cat)}
                              accent
                            />
                          ))}
                        </motion.div>
                      </div>

                      {/* Trending */}
                      <div className="mb-12">
                        <SectionLabel>Trending</SectionLabel>
                        <motion.div
                          variants={reduced ? undefined : staggerParent}
                          initial="hidden"
                          animate="visible"
                          className="flex flex-wrap gap-2"
                        >
                          {TRENDING.map((term) => (
                            <Chip
                              key={term}
                              label={term}
                              onClick={() => setQuery(term)}
                            />
                          ))}
                        </motion.div>
                      </div>

                      {/* Popular mini-preview — desktop+ only to avoid clutter on mobile */}
                      <div className="hidden md:block">
                        <SectionLabel>Popular right now</SectionLabel>
                        <motion.div
                          variants={reduced ? undefined : staggerParent}
                          initial="hidden"
                          animate="visible"
                          className="grid grid-cols-4 gap-4"
                        >
                          {PREVIEW_PRODUCTS.map((product) => (
                            <motion.div
                              key={product.id}
                              variants={reduced ? undefined : staggerChild}
                            >
                              <Link
                                href={`/shop/${product.handle}`}
                                onClick={onClose}
                                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
                              >
                                <div className="relative aspect-[4/5] w-full bg-surface-hover overflow-hidden mb-2">
                                  <Image
                                    src={product.image}
                                    alt={product.title}
                                    fill
                                    className={`object-cover ${reduced ? "" : "transition-transform duration-700 group-hover:scale-[1.05]"}`}
                                    sizes="25vw"
                                  />
                                  {product.isNew && (
                                    <span className="absolute top-2 left-2 bg-accent-lime text-on-accent text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-0.5">
                                      New
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/40 mb-0.5">
                                  {product.category}
                                </p>
                                <p className="text-xs font-black uppercase tracking-[-0.02em] text-content line-clamp-1 group-hover:text-accent-red transition-colors">
                                  {product.title}
                                </p>
                              </Link>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── state B: results ──────────────────────────────── */}
                  {hasResults && (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {/* Results header */}
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-line/15">
                        <SectionLabel>
                          Found {results.length}{" "}
                          {results.length === 1 ? "style" : "styles"}
                        </SectionLabel>
                        <Link
                          href="/shop"
                          onClick={onClose}
                          className="group flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-accent-red hover:text-content transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
                        >
                          View all
                          <ArrowUpRight
                            className={`h-3 w-3 ${reduced ? "" : "transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`}
                            aria-hidden
                          />
                        </Link>
                      </div>

                      {/* Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                        {results.slice(0, 8).map((product, i) => (
                          <ProductTile
                            key={product.id}
                            product={product}
                            index={i}
                            onClose={onClose}
                            reduced={reduced}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ── state C: no match ─────────────────────────────── */}
                  {noResults && (
                    <motion.div
                      key="no-results"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="py-16 md:py-24 flex flex-col items-center text-center"
                    >
                      {/* editorial glyph */}
                      <div className="mb-8 flex items-center justify-center w-16 h-16 border border-line/15 relative" aria-hidden>
                        <Search className="h-6 w-6 text-content/20" />
                        <span className="absolute -top-px -right-px w-3 h-3 border-t border-r border-accent-lime/60" />
                        <span className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-accent-lime/60" />
                      </div>

                      <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-content/35 mb-3">
                        No results
                      </p>
                      <p className="text-xl md:text-2xl font-black uppercase tracking-[-0.03em] text-content mb-2 max-w-xs">
                        Nothing for{" "}
                        <span className="text-accent-red">
                          &ldquo;{query}&rdquo;
                        </span>
                      </p>
                      <p className="text-sm text-content/50 max-w-[30ch] leading-relaxed mb-8">
                        Try a different term, or browse a category below.
                      </p>

                      <div className="flex flex-wrap gap-2 justify-center">
                        {CATEGORIES.map((cat) => (
                          <Chip
                            key={cat}
                            label={cat}
                            onClick={() => setQuery(cat)}
                            accent
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
