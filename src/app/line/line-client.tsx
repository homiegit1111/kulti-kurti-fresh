"use client";

/**
 * /line — the catalog spine.
 *
 * Absorbs /shop, /collections and /line-sheet. No hero, no editorial header, no
 * marquee, no FAQ, no reveal-on-scroll: the catalog IS the page, and rows must be
 * legible on arrival rather than on scroll.
 *
 * All query state lives in the URL, so a filtered /line link IS a line sheet —
 * which is why /line-sheet retires at zero build cost.
 *
 * PRESENTATIONAL: reads the catalog, writes only tray state (localStorage).
 * Touches no cart handler, no checkout, no schema.
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal, X } from "lucide-react";
import type { MockProduct } from "@/lib/commerce/catalog";
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
import { LedgerHead, StyleRow } from "@/components/line/style-row";
import { StyleCard } from "@/components/line/style-card";
import { StylePlate } from "@/components/line/style-plate";
import { cn } from "@/lib/utils";

export function LineClient({ products }: { products: MockProduct[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tray = useTray();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useMemo(
    () => parseLineQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const urlDensity = (searchParams.get("d") as Density | null) ?? null;
  const { density, choose: setDensity } = useDensity(urlDensity);

  /**
   * Lines carry live tray state, so a committed style shows its set count in the
   * ledger without the row owning any state of its own.
   */
  const lines = useMemo(
    () =>
      products.map((product) => {
        const entry = tray.lines.find((l) => l.product.id === product.id);
        return toStyleLine(
          product,
          entry?.sets ?? 0,
          tray.isComparing(product.id),
        );
      }),
    [products, tray],
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
        const on = key === "stock" ? params.get("stock") === "live" : params.get(key) === "1";
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

  const activeCount = activeFacetCount(query);

  return (
    <div className="min-h-screen bg-surface font-sans text-content">
      <CommandBar
        total={lines.length}
        shown={results.length}
        query={query}
        density={density}
        onDensity={changeDensity}
        onSearch={setSearch}
        onSort={setSort}
        compareCount={tray.compareIds.length}
        onOpenCompare={() => {
          /* compare tray lands next — no-op rather than a dead promise */
        }}
        shortlistCount={tray.shortlisted.length}
        committedCount={tray.committed.length}
        onOpenTray={() => router.push("/tray")}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFacets={activeCount}
      />

      {/* Active facet chips */}
      {activeCount > 0 && (
        <div className="border-b border-line/20 bg-surface-2">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-10">
            <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-content/40">
              Filtered
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-[9px] font-bold uppercase tracking-[0.18em] text-accent-red hover:underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
          {/* Facet rail — sticky under the command bar */}
          <aside className="hidden py-8 lg:block">
            <div className="sticky top-[4.5rem]">
              <FacetRail
                query={query}
                {...facets}
                onToggleMulti={toggleMulti}
                onToggleFlag={toggleFlag}
              />
            </div>
          </aside>

          {/* Results */}
          <div className="py-6 lg:py-8">
            {results.length === 0 ? (
              <div className="flex flex-col items-start gap-4 border border-line/20 px-6 py-10">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-accent-red">
                  No styles match
                </p>
                <p className="max-w-[42ch] text-sm leading-6 text-content/60">
                  Nothing in the line fits every filter at once. Clear one and the
                  list widens.
                </p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="linebook-button linebook-button--dark"
                >
                  Clear filters <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : density === "ledger" ? (
              <>
                <LedgerHead />
                <div>
                  {results.map((line) => (
                    <StyleRow
                      key={line.product.id}
                      line={line}
                      shortlisted={tray.isShortlisted(line.product.id)}
                      {...actions}
                    />
                  ))}
                </div>
              </>
            ) : density === "grid" ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {results.map((line) => (
                  <StyleCard
                    key={line.product.id}
                    line={line}
                    shortlisted={tray.isShortlisted(line.product.id)}
                    {...actions}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {results.map((line, index) => (
                  <StylePlate
                    key={line.product.id}
                    line={line}
                    priority={index < 2}
                    shortlisted={tray.isShortlisted(line.product.id)}
                    {...actions}
                  />
                ))}
              </div>
            )}

            {/* Ledger footer — the terms, once, as a hairline */}
            {results.length > 0 && (
              <div className="mt-8 flex flex-col gap-3 border-t border-line/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content/45">
                  Rates are per set and per piece · pack availability is per style
                </p>
                <Link href="/tray" className="linebook-button linebook-button--dark shrink-0">
                  Open tray <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

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
                className="linebook-button linebook-button--dark w-full"
              >
                Show {results.length} styles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
