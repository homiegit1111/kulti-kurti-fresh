"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ArrowUpRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { MOCK_PRODUCTS, formatPrice } from "@/lib/commerce/catalog";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
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

const LISTBOX_ID = "rangat-search-listbox";
const MAX_VISIBLE = 8;

/* ─── code-literate search index ─────────────────────────────────────────────
   Repeat buyers reorder by style code (RP-KURTI-941), not by browsing.
   Each product is indexed with its canonical code plus a compact form
   ("rpkurti941") so "941", "kurti-941" and "rp kurti 941" all resolve. */
type IndexEntry = {
  product: CommerceProduct;
  code: string;
  compactCode: string;
};

const SEARCH_INDEX: IndexEntry[] = MOCK_PRODUCTS.map((product) => {
  const code = getStyleCode(product);
  return { product, code, compactCode: code.replace(/-/g, "").toLowerCase() };
});

type Hit = IndexEntry & { score: number };

function searchCatalogue(rawQuery: string): Hit[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const compactQ = q.replace(/[\s-]/g, "");

  const hits: Hit[] = [];
  for (const entry of SEARCH_INDEX) {
    const { product, compactCode } = entry;
    let score = -1;
    if (compactQ && compactCode === compactQ) score = 0;
    else if (compactQ && compactCode.startsWith(compactQ)) score = 1;
    else if (compactQ && compactCode.includes(compactQ)) score = 2;
    else if (product.title.toLowerCase().includes(q)) score = 3;
    else if (product.category.toLowerCase().includes(q)) score = 4;
    else if ((product.description ?? "").toLowerCase().includes(q)) score = 5;
    if (score >= 0) hits.push({ ...entry, score });
  }
  return hits.sort((a, b) => a.score - b.score);
}

function optionDomId(productId: string): string {
  return `rangat-search-option-${productId}`;
}

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

/** Style code with the query-matched fragment marked in lime */
function CodeLabel({
  code,
  compactQuery,
}: {
  code: string;
  compactQuery: string;
}) {
  const compact = code.replace(/-/g, "").toLowerCase();
  const start = compactQuery ? compact.indexOf(compactQuery) : -1;
  if (start === -1) return <>{code}</>;
  const end = start + compactQuery.length;

  const nodes: React.ReactNode[] = [];
  let compactPos = 0;
  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    const isDash = ch === "-";
    const pos = compactPos;
    if (!isDash) compactPos += 1;
    const hit = isDash ? pos > start && pos < end : pos >= start && pos < end;
    nodes.push(
      hit ? (
        <mark key={i} className="bg-accent-lime text-on-accent">
          {ch}
        </mark>
      ) : (
        <span key={i}>{ch}</span>
      ),
    );
  }
  return <>{nodes}</>;
}

/** Footer key hint */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center border border-line/25 bg-surface-2 px-1.5 font-sans text-[9px] font-bold text-content/60">
      {children}
    </kbd>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const router = useRouter();

  /* scroll-lock + query reset */
  useEffect(() => {
    const prev = document.body.style.overflow;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev;
      timer = setTimeout(() => {
        setQuery("");
        setActiveIndex(0);
      }, 300);
    }
    return () => {
      if (timer) clearTimeout(timer);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /* focus capture on open → restore to trigger on close */
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  /* autofocus the input */
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* filtered + ranked results */
  const results = useMemo<Hit[]>(
    () => searchCatalogue(deferredQuery),
    [deferredQuery],
  );
  const visible = useMemo(() => results.slice(0, MAX_VISIBLE), [results]);

  const compactQuery = deferredQuery.trim().toLowerCase().replace(/[\s-]/g, "");
  const hasQuery = query.trim().length > 0;
  const hasResults = hasQuery && results.length > 0;
  const noResults = hasQuery && results.length === 0;

  /* active row, clamped against the current result set (pure derivation) */
  const activeRow = visible.length
    ? Math.min(activeIndex, visible.length - 1)
    : -1;
  const activeDescendant =
    activeRow >= 0 ? optionDomId(visible[activeRow].product.id) : undefined;

  /* command-desk keyboard contract: Esc close, Tab trap, arrows, Enter */
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input, select, textarea, [tabindex]',
          ),
        ).filter((el) => el.tabIndex >= 0 && el.offsetParent !== null);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement;
        if (!(current instanceof HTMLElement) || !root.contains(current)) {
          e.preventDefault();
          (inputRef.current ?? first).focus();
          return;
        }
        if (e.shiftKey && current === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && current === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        visible.length > 0
      ) {
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const next =
          (Math.max(activeRow, 0) + delta + visible.length) % visible.length;
        setActiveIndex(next);
        const id = optionDomId(visible[next].product.id);
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ block: "nearest" });
        });
        return;
      }

      if (
        e.key === "Enter" &&
        document.activeElement === inputRef.current &&
        activeRow >= 0
      ) {
        e.preventDefault();
        router.push(`/shop/${visible[activeRow].product.handle}`);
        onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, visible, activeRow, router]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-overlay"
          ref={dialogRef}
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

          {/* screen-reader result announcements */}
          <span role="status" aria-live="polite" className="sr-only">
            {hasQuery
              ? `${results.length} ${results.length === 1 ? "style" : "styles"} found`
              : ""}
          </span>

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
                  Search styles by name, fabric, category, or style code
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
                  role="combobox"
                  aria-expanded={hasResults}
                  aria-controls={hasResults ? LISTBOX_ID : undefined}
                  aria-activedescendant={activeDescendant}
                  aria-autocomplete="list"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Search style, fabric, or code"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
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
                              onClick={() => {
                                setQuery(cat);
                                setActiveIndex(0);
                              }}
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
                              onClick={() => {
                                setQuery(term);
                                setActiveIndex(0);
                              }}
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
                                  {getStyleCode(product)}
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

                  {/* ── state B: results — command-desk ledger rows ────── */}
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

                      {/* Ledger rows — arrows move the lime rule, Enter opens */}
                      <div
                        role="listbox"
                        id={LISTBOX_ID}
                        aria-label="Matching styles"
                        className="border border-line/15 divide-y divide-line/12"
                      >
                        {visible.map((hit, i) => {
                          const { product, code } = hit;
                          const active = i === activeRow;
                          const setPrice = product.salePrice ?? product.price;
                          return (
                            <Link
                              key={product.id}
                              id={optionDomId(product.id)}
                              role="option"
                              aria-selected={active}
                              tabIndex={-1}
                              href={`/shop/${product.handle}`}
                              onClick={onClose}
                              onMouseEnter={() => setActiveIndex(i)}
                              className={`relative flex items-center gap-3 md:gap-5 px-3 md:px-5 py-3 transition-colors duration-150 ${
                                active ? "bg-accent-lime/12" : "bg-transparent"
                              }`}
                            >
                              {/* lime left-rule — the active mark */}
                              <span
                                aria-hidden
                                className={`absolute left-0 top-0 bottom-0 w-[3px] bg-accent-lime transition-opacity duration-150 ${
                                  active ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {/* ledger index */}
                              <span
                                className="hidden sm:block w-6 shrink-0 text-[9px] font-bold tabular-nums text-content/30"
                                aria-hidden
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              {/* thumb */}
                              <span className="relative block h-14 w-11 shrink-0 overflow-hidden bg-surface-hover">
                                <Image
                                  src={product.image}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              </span>
                              {/* code + title */}
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-content/55">
                                  <CodeLabel code={code} compactQuery={compactQuery} />
                                  {product.isNew && (
                                    <span className="ml-2 bg-accent-lime px-1 py-px text-[8px] tracking-[0.18em] text-on-accent">
                                      New
                                    </span>
                                  )}
                                </span>
                                <span className="truncate text-sm md:text-base font-black uppercase leading-tight tracking-[-0.02em] text-content">
                                  {product.title}
                                </span>
                              </span>
                              {/* category */}
                              <span className="hidden md:block w-20 shrink-0 text-[9px] font-bold uppercase tracking-[0.2em] text-content/40">
                                {product.category}
                              </span>
                              {/* price */}
                              <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                                <span className="text-[11px] font-bold text-content">
                                  {formatPrice(setPrice)}
                                  <span className="font-semibold text-content/50"> / set</span>
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-content/45">
                                  {formatPrice(getPerPiecePrice(setPrice))} / pc
                                </span>
                              </span>
                              {/* open affordance */}
                              <ArrowUpRight
                                className={`hidden sm:block h-3.5 w-3.5 shrink-0 transition-opacity duration-150 ${
                                  active ? "text-content opacity-100" : "text-content/40 opacity-40"
                                }`}
                                aria-hidden
                              />
                            </Link>
                          );
                        })}
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
                      <p className="text-xl md:text-2xl font-black uppercase tracking-[-0.03em] text-content mb-2 max-w-sm">
                        No style matches{" "}
                        <span className="text-accent-red">
                          &ldquo;{query}&rdquo;
                        </span>
                      </p>
                      <p className="text-sm text-content/50 max-w-[36ch] leading-relaxed mb-8">
                        Try a code like RP-KURTI-941, or browse a category below.
                      </p>

                      <motion.div
                        variants={reduced ? undefined : staggerParent}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-wrap gap-2 justify-center"
                      >
                        {CATEGORIES.map((cat) => (
                          <Chip
                            key={cat}
                            label={cat}
                            onClick={() => {
                              setQuery(cat);
                              setActiveIndex(0);
                            }}
                            accent
                          />
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── command-desk footer: key contract + code hint ──────────── */}
          <div className="relative z-20 hidden md:flex h-10 shrink-0 items-center justify-between border-t border-line/15 bg-surface px-5 md:px-10 lg:px-14">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.2em] text-content/40">
                <Kbd>&uarr;&darr;</Kbd> Navigate
              </span>
              <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.2em] text-content/40">
                <Kbd>&crarr;</Kbd> Open style
              </span>
              <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.2em] text-content/40">
                <Kbd>Esc</Kbd> Close
              </span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-content/30">
              Reorder by code — RP-KURTI-941
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
