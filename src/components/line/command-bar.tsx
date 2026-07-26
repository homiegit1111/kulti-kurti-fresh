"use client";

/**
 * Command bar — the fixed operating strip for /line.
 *
 * Everything a buyer needs to steer the catalog sits in one h-14 row: count,
 * search, sort, density, compare state, tray handoff. No hero, no marquee, no
 * editorial header above it — the catalog IS the page.
 *
 * Sticky offset is a prop, not a constant: it must clear the real navbar and
 * that height is a pixel fact I verify on the dev server, not guess at here.
 */

import { Filter, Search, X } from "lucide-react";
import { SORTS, type LineQuery, type SortValue } from "@/lib/line/facets";
import { COMPARE_MAX } from "@/lib/line/contract";
import type { Density } from "@/lib/line/density";
import { cn } from "@/lib/utils";
import { DensityToggle } from "./density-toggle";

export function CommandBar({
  total,
  shown,
  query,
  density,
  onDensity,
  onSearch,
  onSort,
  compareCount,
  onOpenCompare,
  shortlistCount,
  committedCount,
  onOpenTray,
  onOpenFilters,
  activeFacets,
}: {
  total: number;
  shown: number;
  query: LineQuery;
  density: Density;
  onDensity: (d: Density) => void;
  onSearch: (value: string) => void;
  onSort: (value: SortValue) => void;
  compareCount: number;
  onOpenCompare: () => void;
  shortlistCount: number;
  committedCount: number;
  onOpenTray: () => void;
  onOpenFilters: () => void;
  activeFacets: number;
}) {
  const filtering = shown !== total;

  return (
    <div className="sticky top-0 z-40 border-b-2 border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        {/* Count — the catalog's own label, no page title needed */}
        <p className="hidden shrink-0 text-[9px] font-bold uppercase tracking-[0.28em] text-content/45 lg:block">
          Line /{" "}
          <span className="tabular-nums text-content">
            {filtering ? `${shown} of ${total}` : total}
          </span>{" "}
          styles
        </p>

        {/* Search */}
        <div className="relative flex h-9 min-w-0 flex-1 items-center border border-line/25 bg-surface-2 lg:max-w-[420px]">
          <Search
            className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-content/35"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query.q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Style, code, colour — kurti set rate…"
            aria-label="Search the line"
            className={cn(
              "h-full w-full bg-transparent pl-8 pr-8 text-xs text-content",
              "placeholder:text-content/35 focus:outline-none",
            )}
          />
          {query.q && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="absolute right-1.5 flex h-6 w-6 items-center justify-center text-content/40 transition-colors hover:text-accent-red"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Mobile filter entry */}
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 border px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] lg:hidden",
            activeFacets > 0
              ? "border-accent-lime bg-accent-lime text-on-accent"
              : "border-line/25 text-content/60",
          )}
        >
          <Filter className="h-3.5 w-3.5" strokeWidth={2} />
          {activeFacets > 0 && <span className="tabular-nums">{activeFacets}</span>}
        </button>

        {/* Sort — native select: a wholesale buyer wants the list, not a custom popover */}
        <label className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="sr-only">Sort the line</span>
          <select
            value={query.sort}
            onChange={(e) => onSort(e.target.value as SortValue)}
            className="h-9 border border-line/25 bg-surface-2 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-content/70 focus:outline-none focus:border-content"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <DensityToggle value={density} onChange={onDensity} className="shrink-0" />

        {/* Compare — appears only once a pick exists, never holds space speculatively */}
        {compareCount > 0 && (
          <button
            type="button"
            onClick={onOpenCompare}
            className="hidden h-9 shrink-0 items-center gap-1.5 border border-accent-red px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-accent-red transition-colors hover:bg-accent-red hover:text-white sm:flex"
          >
            Cmp{" "}
            <span className="tabular-nums">
              {compareCount}/{COMPARE_MAX}
            </span>
          </button>
        )}

        {/* Tray handoff */}
        <button
          type="button"
          onClick={onOpenTray}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 border-l border-line/20 pl-3 text-[9px] font-bold uppercase tracking-[0.16em]",
            "transition-colors duration-200",
            committedCount > 0 ? "text-content" : "text-content/55 hover:text-content",
          )}
        >
          {committedCount > 0 && (
            <span className="bg-accent-lime px-1.5 py-0.5 tabular-nums text-on-accent">
              {committedCount}
            </span>
          )}
          {shortlistCount > 0 && committedCount === 0 && (
            <span className="tabular-nums">{shortlistCount}</span>
          )}
          <span className="hidden sm:inline">Tray</span>
        </button>
      </div>
    </div>
  );
}
