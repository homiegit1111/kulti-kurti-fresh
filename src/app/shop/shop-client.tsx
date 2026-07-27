"use client";

/**
 * /shop — the line book (fifth architecture, §5).
 *
 * The /line system mounted inside /shop's URL and SEO shell. One canonical
 * mount of the merged catalog: this file is the only importer of LineResults.
 *
 * Letterhead (R4) → sticky CommandBar → FacetRail + results (three densities,
 * tray-wired) → trade questions as ruled numbered ledger entries → colophon
 * (the route's one ink entry, R9).
 *
 * PRINT IS THE SIGNATURE (§5.3): PrintSheetStyles is attached, the screen body
 * is print-hidden, and a print-only ledger renders the letterhead plus ONLY the
 * filtered rows — so any shared filtered /shop URL prints as a per-buyer A4
 * line sheet, "Prepared for {business_name} · {city}" when the wholesale
 * profile exists.
 *
 * PRESENTATIONAL: reads the catalog, writes only tray state (localStorage).
 * Touches no cart handler, no checkout, no schema.
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, SlidersHorizontal, X } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { EntryHead } from "@/components/document/entry";
import { TermsRule } from "@/components/document/terms-rule";
import { PrintSheetStyles } from "@/components/document/print-sheet-styles";
import { formatPrice, type MockProduct } from "@/lib/commerce/catalog";
import { toStyleLine, type StyleLine } from "@/lib/line/contract";
import {
  applyLineQuery,
  activeFacetCount,
  categoryOptions,
  colorOptions,
  parseLineQuery,
  perPieceOptions,
  sizeRunOptions,
  type SortValue,
} from "@/lib/line/facets";
import { useDensity, markTradeBuyer, type Density } from "@/lib/line/density";
import { useTray } from "@/lib/line/tray-context";
import { CommandBar } from "@/components/line/command-bar";
import { FacetRail } from "@/components/line/facet-rail";
import { LineResults } from "@/components/line/line-results";
import { B2B_CONFIG, GST_CONFIG } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { SHOP_FAQS } from "./faqs";
import ShopLoading from "./loading";
import { cn } from "@/lib/utils";

/* Public contact facts — mirrored from the printed line sheet's letterhead. */
const CONTACT = {
  whatsapp: "8660452247",
  email: "rangatpehnawa@gmail.com",
  address:
    "3rd Floor, NR Complex, 36, Siddanna Ln, Cubbonpete, Bengaluru 560002",
};

/** Rows per printed A4 sheet after the letterhead. Explicit breaks: Chromium
 *  cannot auto-number pages, so sheets are chunked and counters placed (§1.7). */
const PRINT_ROWS_PER_SHEET = 24;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/* ── Print-only ledger — letterhead + ONLY the filtered rows (§5.3) ────────── */

function PrintSheet({ results, season }: { results: StyleLine[]; season: string }) {
  const sheets = chunk(results, PRINT_ROWS_PER_SHEET);

  const headRow = (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)_7rem_5.5rem_5.5rem] gap-3 border-b border-line py-1.5 text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
      <span>Style №</span>
      <span>Style</span>
      <span>Size run</span>
      <span className="text-right">₹ Set</span>
      <span className="text-right">₹ / PC</span>
    </div>
  );

  return (
    <section aria-hidden className="ls-doc hidden bg-surface text-content print:block">
      {/* Letterhead — masthead, season line, terms squares. PrintSheetStyles
          appends "Prepared for …" via .ls-letterhead::after when the wholesale
          profile exists, and .ls-sheet-counter renders "Sheet 1". */}
      <header className="ls-letterhead border-b-2 border-line pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-content/50">
              Rangat Pehnawa · Wholesale line book
            </p>
            <p className="mt-2 text-4xl font-black uppercase leading-[0.9] tracking-[-0.04em]">
              Wholesale kurti line book
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-content/50">
              {season} · {results.length} styles on this sheet
            </p>
          </div>
          <span className="ls-sheet-counter shrink-0 pt-1" />
        </div>
        <TermsRule className="mt-4 border-b-0" />
        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-content/40">
          WhatsApp {CONTACT.whatsapp} · {CONTACT.email} · {CONTACT.address}
        </p>
      </header>

      {sheets.map((rows, sheetIndex) => (
        <div
          key={sheetIndex}
          className={cn(sheetIndex > 0 && "ls-sheet-break")}
        >
          {sheetIndex > 0 && (
            <div className="flex items-center justify-between border-b border-line pb-2 pt-1">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-content/50">
                Rangat Pehnawa · Wholesale kurti line book · {season}
              </p>
              <span className="ls-sheet-counter" />
            </div>
          )}
          {headRow}
          {rows.map((line) => (
            <div
              key={line.product.id}
              className="ls-card ledger grid grid-cols-[7rem_minmax(0,1fr)_7rem_5.5rem_5.5rem] items-baseline gap-3 border-b border-line/25 py-2 text-[11px] leading-4"
            >
              <span className="font-mono text-[10px]">{line.code}</span>
              <span className="font-bold tracking-[-0.01em]">
                {line.product.title}
                {line.stock === "sold_out" && (
                  <span className="ml-2 text-[8px] font-extrabold uppercase tracking-[0.18em] text-accent-red">
                    Sold out
                  </span>
                )}
              </span>
              <span className="text-content/60">{line.sizeRun.join("/")}</span>
              <span className="text-right font-black">{formatPrice(line.setPrice)}</span>
              <span className="text-right font-bold text-content/70">
                {formatPrice(line.perPiece)}
              </span>
            </div>
          ))}
        </div>
      ))}

      {/* Document footer — part of the artifact, prints (.ls-keep). */}
      <footer className="ls-keep mt-8 border-t-2 border-line pt-4">
        <div className="flex flex-col gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-content/40 sm:flex-row sm:justify-between">
          <span>Rangat Pehnawa · Wholesale kurti line book · {season}</span>
          <span>All rates per set · GST at invoice · Subject to availability</span>
        </div>
      </footer>
    </section>
  );
}

/* ── Compare — the 4-column hairline overlay table (§5.4) ──────────────────── */

function CompareOverlay({
  lines,
  onClose,
  onRemove,
}: {
  lines: StyleLine[];
  onClose: () => void;
  onRemove: (line: StyleLine) => void;
}) {
  const facts: { label: string; render: (line: StyleLine) => React.ReactNode }[] = [
    {
      label: "Per pc",
      render: (l) => (
        <span className="text-base font-black tracking-[-0.02em]">
          {formatPrice(l.perPiece)}
        </span>
      ),
    },
    { label: "Set rate", render: (l) => formatPrice(l.setPrice) },
    { label: "Size run", render: (l) => l.sizeRun.join("/") },
    { label: `${GST_CONFIG.label} band`, render: (l) => `${l.gstRate}%` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close compare"
        onClick={onClose}
        className="absolute inset-0 bg-surface-inverse/60"
      />
      <div className="relative max-h-[85vh] w-full max-w-[880px] overflow-y-auto border border-line bg-surface">
        <div className="flex items-center justify-between border-b-2 border-line px-5 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em]">
            Compare ·{" "}
            <span className="ledger text-content/55">{lines.length} of 4</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compare"
            className="flex h-8 w-8 items-center justify-center text-content/50 transition-colors hover:text-content"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <div
            className="ledger grid min-w-[560px]"
            style={{
              gridTemplateColumns: `6rem repeat(${lines.length}, minmax(0, 1fr))`,
            }}
          >
            {/* Head row — code + title per column, vermilion mark register */}
            <span className="border-b border-line/25 px-3 py-3" />
            {lines.map((line) => (
              <div
                key={line.product.id}
                className="border-b border-l border-line/25 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] text-content/70">
                    {line.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(line)}
                    aria-label={`Remove ${line.code} from compare`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center border border-accent-red text-accent-red transition-colors hover:bg-accent-red hover:text-white"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
                <Link
                  href={`/shop/${line.product.handle}`}
                  className="mt-1.5 block text-[12px] font-bold leading-tight tracking-[-0.01em] hover:underline"
                >
                  {line.product.title}
                </Link>
              </div>
            ))}

            {facts.map((fact) => (
              <div key={fact.label} className="contents">
                <span className="border-b border-line/15 px-3 py-2.5 text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                  {fact.label}
                </span>
                {lines.map((line) => (
                  <span
                    key={line.product.id}
                    className="border-b border-l border-line/15 px-3 py-2.5 text-[12px] font-semibold"
                  >
                    {fact.render(line)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── The route body ────────────────────────────────────────────────────────── */

function ShopContent({
  initialProducts,
  season,
}: {
  initialProducts: MockProduct[];
  season: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tray = useTray();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [preparedFor, setPreparedFor] = useState<string | undefined>(undefined);

  const query = useMemo(
    () => parseLineQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const urlDensity = (searchParams.get("d") as Density | null) ?? null;
  const { density, choose: setDensity } = useDensity(urlDensity);

  /** Lines carry live tray state — a committed style shows its set count. */
  const lines = useMemo(
    () =>
      initialProducts.map((product) => {
        const entry = tray.lines.find((l) => l.product.id === product.id);
        return toStyleLine(
          product,
          entry?.sets ?? 0,
          tray.isComparing(product.id),
        );
      }),
    [initialProducts, tray],
  );

  const results = useMemo(() => applyLineQuery(lines, query), [lines, query]);

  const facets = useMemo(
    () => ({
      sizes: sizeRunOptions(lines),
      perPiece: perPieceOptions(lines),
      categories: categoryOptions(lines),
      colors: colorOptions(lines),
      soldOutCount: lines.filter((l) => l.stock === "sold_out").length,
      dropCount: lines.filter((l) => l.product.salePrice != null).length,
      freshCount: lines.filter((l) => l.product.isNew).length,
    }),
    [lines],
  );

  /* Wholesale profile → "Prepared for {business_name} · {city}" on the printed
     letterhead (§5.3). Absent profile or signed-out: no line, no error. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/wholesale-profile")
      .then((res) =>
        res.ok
          ? (res.json() as Promise<{
              profile?: { business_name?: string; city?: string } | null;
            }>)
          : null,
      )
      .then((data) => {
        if (cancelled) return;
        const profile = data?.profile;
        if (profile?.business_name && profile?.city) {
          setPreparedFor(`${profile.business_name} · ${profile.city}`);
        }
      })
      .catch(() => {
        /* profile is optional — the sheet prints unaddressed */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── URL writers ──
  const write = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleMulti = useCallback(
    (key: "run" | "pp" | "cat" | "col", value: string) => {
      write((params) => {
        const current = (params.get(key) ?? "").split(",").filter(Boolean);
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next.length) params.set(key, next.join(","));
        else params.delete(key);
      });
    },
    [write],
  );

  const toggleFlag = useCallback(
    (key: "stock" | "drop" | "fresh") => {
      write((params) => {
        const on =
          key === "stock" ? params.get("stock") === "live" : params.get(key) === "1";
        if (on) params.delete(key);
        else params.set(key, key === "stock" ? "live" : "1");
      });
    },
    [write],
  );

  const setSearch = useCallback(
    (value: string) => {
      write((params) => {
        if (value.trim()) params.set("q", value);
        else params.delete("q");
      });
    },
    [write],
  );

  const setSort = useCallback(
    (value: SortValue) => write((params) => params.set("sort", value)),
    [write],
  );

  const clearAll = useCallback(
    () => router.replace(pathname, { scroll: false }),
    [pathname, router],
  );

  const changeDensity = useCallback(
    (next: Density) => {
      setDensity(next);
      write((params) => params.set("d", next));
    },
    [setDensity, write],
  );

  // ── Tray actions, shared by all three densities ──
  const actions = useMemo(
    () => ({
      onCommit: (line: StyleLine) => {
        tray.commit(line.product);
        markTradeBuyer();
      },
      onSetsChange: (line: StyleLine, sets: number) =>
        tray.setSets(line.product.id, sets),
      onDemote: (line: StyleLine) => tray.demote(line.product.id),
      onToggleShortlist: (line: StyleLine) => tray.toggleShortlist(line.product),
      onToggleCompare: (line: StyleLine) => tray.toggleCompare(line.product),
    }),
    [tray],
  );

  // ── Ledger hover peek plate — pointer:fine only, reduced-motion gated ──
  const resultsRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const [peekIndex, setPeekIndex] = useState<number | null>(null);
  const [peekEnabled, setPeekEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => setPeekEnabled(fine.matches && motionOk.matches);
    update();
    fine.addEventListener("change", update);
    motionOk.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      motionOk.removeEventListener("change", update);
    };
  }, []);

  const peekActive = density === "ledger" && peekEnabled;

  const handlePeekMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!peekActive) return;
      const container = resultsRef.current;
      const row = (event.target as HTMLElement).closest?.(".inventory-row");
      if (!container || !row) {
        setPeekIndex(null);
        return;
      }
      const rows = Array.from(container.querySelectorAll(".inventory-row"));
      const index = rows.indexOf(row as Element);
      setPeekIndex(index >= 0 ? index : null);
      const el = peekRef.current;
      if (el) {
        // Transform-only follow; clamped to the viewport.
        const x = Math.min(event.clientX + 28, window.innerWidth - 248);
        const y = Math.max(
          16,
          Math.min(event.clientY - 138, window.innerHeight - 300),
        );
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    },
    [peekActive],
  );

  const peekLine =
    peekActive && peekIndex !== null ? results[peekIndex] ?? null : null;

  const compareLines = useMemo(
    () => lines.filter((line) => tray.compareIds.includes(line.product.id)),
    [lines, tray.compareIds],
  );

  const activeCount = activeFacetCount(query);

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <PrintSheetStyles preparedFor={preparedFor} />
      <Navbar />

      <main className="flex-1 pb-28">
        {/* ── Letterhead entry (R4): h1 · real unfiltered count · season line ·
               TermsRule. Screen register only — print has its own letterhead. */}
        <div className="print:hidden">
          <div className="mx-auto max-w-[1400px] px-5 pt-28 md:px-10 lg:px-16 lg:pt-36">
            <header className="border-b-0 pb-8 lg:pb-10">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-content/50">
                Rangat Pehnawa · Wholesale line book
              </p>
              <h1 className="mt-4 text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                Wholesale kurti line book
              </h1>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <p className="ledger text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
                  {lines.length} styles
                </p>
                {/* Season line — the letterhead's one serif accent (§1.3c). */}
                <p className="font-serif text-[16px] lowercase italic text-content/60">
                  {season}, issued Bengaluru
                </p>
              </div>
              <TermsRule className="mt-6" />
            </header>
          </div>

          {/* ── Command bar — sticky operating strip under the fixed navbar ── */}
          <div className="sticky top-16 z-40 lg:top-[74px]">
            <CommandBar
              total={lines.length}
              shown={results.length}
              query={query}
              density={density}
              onDensity={changeDensity}
              onSearch={setSearch}
              onSort={setSort}
              compareCount={tray.compareIds.length}
              onOpenCompare={() => setCompareOpen(true)}
              shortlistCount={tray.shortlisted.length}
              committedCount={tray.committed.length}
              onOpenTray={() => router.push("/tray")}
              onOpenFilters={() => setFiltersOpen(true)}
              onPrint={() => window.print()}
              activeFacets={activeCount}
            />
          </div>

          {/* ── The text block, behind the folio rail rule (R2) ── */}
          <div className="mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16">
            <div className="relative lg:pl-[72px]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-[72px] hidden w-px bg-line/25 lg:block"
              />

              {/* Entry A — the line */}
              <EntryHead
                letter="A"
                name="Styles"
                count={results.length}
                countLabel="styles"
                className="mt-8 lg:mt-10"
                action={
                  activeCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-red hover:underline"
                    >
                      Clear filters
                    </button>
                  ) : undefined
                }
              />

              <div className="grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
                {/* Facet rail — sticky under the command bar */}
                <aside className="hidden py-8 lg:block">
                  <div className="sticky top-[8.5rem]">
                    <FacetRail
                      query={query}
                      {...facets}
                      onToggleMulti={toggleMulti}
                      onToggleFlag={toggleFlag}
                    />
                  </div>
                </aside>

                {/* Results — rows swap instantly on filter change (§1.6) */}
                <div
                  ref={resultsRef}
                  onMouseMove={handlePeekMove}
                  onMouseLeave={() => setPeekIndex(null)}
                  className="py-6 lg:py-8"
                >
                  {lines.length === 0 ? (
                    /* Empty catalog — empty means empty, never mock (§1.1.7). */
                    <div className="flex flex-col items-start gap-4 border border-line/25 px-6 py-10">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-content/55">
                        Styles updating — WhatsApp for today&apos;s price list
                      </p>
                      <a
                        href={buildCatalogRequestUrl()}
                        target="_blank"
                        rel="noopener"
                        className="flex h-10 items-center gap-2 bg-surface-inverse px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-content-inverse"
                      >
                        WhatsApp catalog <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <LineResults
                      lines={results}
                      density={density}
                      isShortlisted={tray.isShortlisted}
                      actions={actions}
                    />
                  )}

                  {results.length > 0 && activeCount > 0 && (
                    <div className="mt-6 flex flex-col gap-3 border-t border-line/25 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="ledger text-[10px] font-semibold uppercase tracking-[0.14em] text-content/45">
                        {results.length} of {lines.length} styles under the
                        current filters
                      </p>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-left text-[9px] font-bold uppercase tracking-[0.18em] text-content/55 hover:text-content sm:text-right"
                      >
                        Show the full line
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Entry B — trade questions, as ruled numbered ledger entries.
                  Text is SHOP_FAQS verbatim: the visible answer and the
                  FAQPage JSON-LD share one source. */}
              <EntryHead
                letter="B"
                name="Trade questions"
                count={SHOP_FAQS.length}
                countLabel="entries"
              />
              <ol className="mb-4">
                {SHOP_FAQS.map((faq, index) => (
                  <li
                    key={faq.q}
                    className="grid gap-x-6 gap-y-2 border-b border-line/20 py-6 md:grid-cols-[3rem_minmax(0,1fr)]"
                  >
                    <span className="ledger text-[10px] font-extrabold text-content/40">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold leading-snug tracking-[-0.01em]">
                        {faq.q}
                      </h3>
                      <p className="mt-2 max-w-[62ch] text-sm leading-6 text-content/60">
                        {faq.a}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* ── Colophon — the route's one ink entry (R9) ── */}
              <section className="mb-4 mt-24 bg-surface-inverse text-content-inverse lg:mt-32">
                <div className="px-6 py-12 lg:px-10 lg:py-16">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-content-inverse/50">
                    Contact
                  </p>
                  <p className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                    Rangat Pehnawa
                  </p>
                  <dl className="ledger mt-8 max-w-xl">
                    {[
                      { label: "WhatsApp", value: CONTACT.whatsapp },
                      { label: "Email", value: CONTACT.email },
                      { label: "Address", value: CONTACT.address },
                      {
                        label: "Terms",
                        value: `Minimum order ${B2B_CONFIG.minimumOrderSets} sets · GST ${GST_CONFIG.lowRate}–${GST_CONFIG.highRate}%, invoice at dispatch`,
                      },
                    ].map((fact) => (
                      <div
                        key={fact.label}
                        className="flex flex-col gap-1 border-b border-content-inverse/15 py-3 sm:flex-row sm:items-baseline sm:gap-6"
                      >
                        <dt className="w-24 shrink-0 text-[8px] font-extrabold uppercase tracking-[0.24em] text-content-inverse/45">
                          {fact.label}
                        </dt>
                        <dd className="text-sm font-semibold">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      href={buildCatalogRequestUrl()}
                      target="_blank"
                      rel="noopener"
                      className="flex h-10 items-center gap-2 bg-accent-lime px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-on-accent"
                    >
                      WhatsApp catalog <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                    <Link
                      href="/bulk-order"
                      className="flex h-10 items-center border border-content-inverse/35 px-4 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:border-content-inverse"
                    >
                      Open the bulk desk
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* ── The printed sheet (§5.3) — the only body that prints ── */}
        <PrintSheet results={results} season={season} />
      </main>

      {/* Ledger peek plate — fixed, transform-only, never printed. */}
      {peekLine && (
        <div
          ref={peekRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-30 hidden w-[220px] lg:block"
        >
          <div className="plate-frame relative aspect-[4/5] w-full overflow-hidden bg-surface-hover">
            <Image
              src={peekLine.product.image}
              alt=""
              fill
              sizes="220px"
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Compare overlay (§5.4) — opens from the command bar. */}
      {compareOpen && compareLines.length > 0 && (
        <CompareOverlay
          lines={compareLines}
          onClose={() => setCompareOpen(false)}
          onRemove={(line) => {
            tray.toggleCompare(line.product);
            if (compareLines.length <= 1) setCompareOpen(false);
          }}
        />
      )}

      {/* Mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-surface-inverse/60"
          />
          <div
            className={cn(
              "absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col",
              "border-l border-line/25 bg-surface",
            )}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-line px-4">
              <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.24em]">
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
                Filters
              </span>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center text-content/50 hover:text-content"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FacetRail
                query={query}
                {...facets}
                onToggleMulti={toggleMulti}
                onToggleFlag={toggleFlag}
              />
            </div>
            <div className="shrink-0 border-t border-line/20 p-4">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex h-11 w-full items-center justify-center bg-surface-inverse text-[10px] font-bold uppercase tracking-[0.18em] text-content-inverse"
              >
                Show {results.length} styles
              </button>
            </div>
          </div>
        </div>
      )}

      <StickyMobileB2BCta />
      <Footer />
    </div>
  );
}

export default function ShopClient({
  initialProducts,
  season,
}: {
  initialProducts: MockProduct[];
  season: string;
}) {
  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopContent initialProducts={initialProducts} season={season} />
    </Suspense>
  );
}
