"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ArrowUpRight } from "lucide-react";
import { MOCK_PRODUCTS, formatPrice } from "@/lib/commerce/catalog";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import type { CommerceProduct } from "@/lib/commerce/catalog";

/* ─── recent style codes (localStorage) ──────────────────────────────────────
   Repeat buyers reorder by code. A visited style page records its code here
   (see navbar); the empty search state lists them for one-tap reorder. */
const RECENT_CODES_KEY = "rangat-recent-codes";
const RECENT_CODES_MAX = 6;

export function readRecentCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CODES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((code): code is string => typeof code === "string")
          .slice(0, RECENT_CODES_MAX)
      : [];
  } catch {
    return [];
  }
}

export function recordRecentCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = [code, ...readRecentCodes().filter((c) => c !== code)].slice(
      0,
      RECENT_CODES_MAX,
    );
    window.localStorage.setItem(RECENT_CODES_KEY, JSON.stringify(next));
  } catch {
    /* private mode — recents just don't persist */
  }
}

/* ─── catalog-derived data — never a hardcoded category list ────────────── */
const CATEGORIES: string[] = Array.from(
  new Set(MOCK_PRODUCTS.map((product) => product.category)),
);

const PREVIEW_PRODUCTS = MOCK_PRODUCTS.slice(0, 4);

const LISTBOX_ID = "rangat-search-listbox";
const MAX_VISIBLE = 8;

/* ─── code-literate search index ─────────────────────────────────────────────
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

/** A quiet chip button — category or recent style code */
function Chip({
  label,
  onClick,
  mono = false,
}: {
  label: string;
  onClick: () => void;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] border border-line/25 bg-transparent px-4 py-2.5 text-content transition-colors duration-200 hover:border-line hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime ${
        mono
          ? "font-mono text-[11px] tracking-[0.08em]"
          : "text-[10px] font-bold uppercase tracking-[0.18em]"
      }`}
    >
      {label}
    </button>
  );
}

/** Style code with the query-matched fragment marked */
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

/* ─── section label ──────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-content/45 md:text-[10px]">
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
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* open/close state adjust during render (no effect): refresh recent codes
     on open, reset the query on close. */
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setRecentCodes(readRecentCodes());
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }

  /* scroll-lock while open */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
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
      const t = setTimeout(() => inputRef.current?.focus(), 0);
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

  /* keyboard contract: Esc close, Tab trap, arrows, Enter */
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
        const hit = visible[activeRow];
        recordRecentCode(hit.code);
        router.push(`/shop/${hit.product.handle}`);
        onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, visible, activeRow, router]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Search styles"
      className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden bg-surface"
    >
      {/* screen-reader result announcements */}
      <span role="status" aria-live="polite" className="sr-only">
        {hasQuery
          ? `${results.length} ${results.length === 1 ? "style" : "styles"} found`
          : ""}
      </span>

      {/* ── top bar ────────────────────────────────────────────────── */}
      <div className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-line/15 px-5 md:px-10 lg:px-14">
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/55">
          {hasResults
            ? `${results.length} ${results.length === 1 ? "style" : "styles"}`
            : "Search"}
        </span>

        {/* close button */}
        <button
          onClick={onClose}
          aria-label="Close search"
          className="group relative flex h-11 w-11 shrink-0 items-center justify-center border border-line/20 bg-surface-2 transition-colors duration-200 hover:border-line hover:bg-surface-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
        >
          <X
            className="h-4 w-4 text-content transition-colors duration-200 group-hover:text-content-inverse"
            aria-hidden
          />
          <span className="absolute -bottom-5 right-0 hidden whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.2em] text-content/30 lg:block">
            Esc
          </span>
        </button>
      </div>

      {/* ── scrollable body ────────────────────────────────────────── */}
      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 pb-16 md:px-10 md:pb-20 lg:px-14">
        <div className="mx-auto w-full max-w-6xl">
          {/* ── search input ──────────────────────────────────────── */}
          <div className="relative mt-8 md:mt-12">
            <label htmlFor="search-input" className="sr-only">
              Search styles by name, fabric, category, or style code
            </label>
            <Search
              className="pointer-events-none absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-content/30 md:h-6 md:w-6"
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
              className="ledger w-full min-w-0 border-b border-line/25 bg-transparent py-4 pl-8 text-xl font-bold tracking-[-0.01em] text-content placeholder:text-content/30 focus:border-content focus:outline-none md:pl-10 md:text-2xl"
            />
          </div>

          {/* ── results area ──────────────────────────────────────── */}
          <div className="mt-10 md:mt-14">
            {/* ── state A: empty query — recent codes + categories ── */}
            {!hasQuery && (
              <div>
                {recentCodes.length > 0 && (
                  <div className="mb-10">
                    <SectionLabel>Recent style codes</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {recentCodes.map((code) => (
                        <Chip
                          key={code}
                          label={code}
                          mono
                          onClick={() => {
                            setQuery(code);
                            setActiveIndex(0);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Browse by category — derived from the live catalog */}
                <div className="mb-10">
                  <SectionLabel>Browse by category</SectionLabel>
                  <div className="flex flex-wrap gap-2.5">
                    {CATEGORIES.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat}
                        onClick={() => {
                          setQuery(cat);
                          setActiveIndex(0);
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Current styles preview — desktop+ only */}
                <div className="hidden md:block">
                  <SectionLabel>Current styles</SectionLabel>
                  <div className="grid grid-cols-4 gap-4">
                    {PREVIEW_PRODUCTS.map((product) => (
                      <Link
                        key={product.id}
                        href={`/shop/${product.handle}`}
                        onClick={() => {
                          recordRecentCode(getStyleCode(product));
                          onClose();
                        }}
                        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
                      >
                        <div className="plate-frame relative mb-2 aspect-[4/5] w-full overflow-hidden bg-surface-hover">
                          <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            className="object-cover"
                            sizes="25vw"
                          />
                        </div>
                        <p className="ledger mb-0.5 font-mono text-[10px] tracking-[0.08em] text-content/45">
                          {getStyleCode(product)}
                        </p>
                        <p className="line-clamp-1 text-[13px] font-semibold text-content group-hover:underline">
                          {product.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── state B: results — ledger rows ────────────────────── */}
            {hasResults && (
              <div>
                {/* Results header */}
                <div className="mb-6 flex items-center justify-between border-b border-line/15 pb-4">
                  <SectionLabel>
                    Found {results.length}{" "}
                    {results.length === 1 ? "style" : "styles"}
                  </SectionLabel>
                  <Link
                    href="/shop"
                    onClick={onClose}
                    className="group flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-content/60 transition-colors duration-200 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
                  >
                    View all styles
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>

                {/* Ledger rows — arrows move the rule, Enter opens */}
                <div
                  role="listbox"
                  id={LISTBOX_ID}
                  aria-label="Matching styles"
                  className="ledger divide-y divide-line/12 border border-line/15"
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
                        onClick={() => {
                          recordRecentCode(code);
                          onClose();
                        }}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`relative flex items-center gap-3 px-3 py-3 transition-colors duration-150 md:gap-5 md:px-5 ${
                          active ? "bg-surface-2" : "bg-transparent"
                        }`}
                      >
                        {/* active mark — an ink rule at the row's left edge */}
                        <span
                          aria-hidden
                          className={`absolute bottom-0 left-0 top-0 w-[2px] bg-content transition-opacity duration-150 ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {/* result index — a real count */}
                        <span
                          className="hidden w-5 shrink-0 text-[10px] font-bold tabular-nums text-content/30 sm:block"
                          aria-hidden
                        >
                          {i + 1}
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
                          <span className="font-mono text-[10px] tracking-[0.08em] text-content/55 md:text-[11px]">
                            <CodeLabel code={code} compactQuery={compactQuery} />
                          </span>
                          <span
                            className={`truncate text-sm font-semibold leading-tight text-content md:text-[15px] ${
                              active ? "underline" : ""
                            }`}
                          >
                            {product.title}
                          </span>
                        </span>
                        {/* category */}
                        <span className="hidden w-20 shrink-0 text-[9px] font-bold uppercase tracking-[0.2em] text-content/40 md:block">
                          {product.category}
                        </span>
                        {/* price */}
                        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                          <span className="text-[11px] font-bold text-content">
                            {formatPrice(setPrice)}
                            <span className="font-semibold text-content/50">
                              {" "}
                              / set
                            </span>
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-content/45">
                            {formatPrice(getPerPiecePrice(setPrice))} / pc
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── state C: no match ─────────────────────────────── */}
            {noResults && (
              <div className="flex flex-col items-start py-16 md:py-24">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em] text-content/35">
                  No results
                </p>
                <p className="mb-2 text-lg font-semibold text-content md:text-xl">
                  No style matches &ldquo;{query}&rdquo;.
                </p>
                <p className="mb-8 max-w-[40ch] text-sm leading-relaxed text-content/55">
                  Try a style code like RP-KURTI-941, or browse a category
                  below.
                </p>

                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat}
                      label={cat}
                      onClick={() => {
                        setQuery(cat);
                        setActiveIndex(0);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── footer: key contract + code hint ──────────── */}
      <div className="relative z-20 hidden h-10 shrink-0 items-center justify-between border-t border-line/15 bg-surface px-5 md:flex md:px-10 lg:px-14">
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
    </div>
  );
}
