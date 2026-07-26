"use client";

/**
 * FacetRail — the six dimensions, all visible at once.
 *
 * No accordions above the fold: a wholesale buyer should see every dimension
 * without discovering it. Groups are ordered by decision weight, not by what the
 * old shop page happened to offer — size run and per-piece lead, because those
 * are what gate a wholesale decision. Category and colour follow.
 *
 * Counts come from the UNFILTERED set so a buyer can see what narrowing costs
 * before they commit to it.
 */

import type { FacetOption, LineQuery } from "@/lib/line/facets";
import { cn } from "@/lib/utils";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-line/20 pb-2 text-[9px] font-bold uppercase tracking-[0.24em] text-content/40">
      {children}
    </p>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="ml-auto text-[10px] font-semibold tabular-nums text-content/30">
      {n}
    </span>
  );
}

/** Square hairline checkbox row. No radius, no custom SVG — the fill is the state. */
function CheckRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="group flex w-full items-center gap-2.5 py-1.5 text-left"
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors duration-200",
          checked
            ? "border-accent-lime bg-accent-lime"
            : "border-line/35 group-hover:border-content",
        )}
      >
        {checked && (
          <span className="h-1.5 w-1.5 bg-on-accent" aria-hidden />
        )}
      </span>
      <span
        className={cn(
          "truncate text-[11px] font-semibold capitalize transition-colors duration-200",
          checked ? "text-content" : "text-content/65 group-hover:text-content",
        )}
      >
        {label}
      </span>
      <Count n={count} />
    </button>
  );
}

export interface FacetRailProps {
  query: LineQuery;
  sizes: FacetOption[];
  perPiece: FacetOption[];
  categories: FacetOption[];
  colors: FacetOption[];
  soldOutCount: number;
  dropCount: number;
  freshCount: number;
  onToggleMulti: (key: "run" | "pp" | "cat" | "col", value: string) => void;
  onToggleFlag: (key: "stock" | "drop" | "fresh") => void;
}

export function FacetRail({
  query,
  sizes,
  perPiece,
  categories,
  colors,
  soldOutCount,
  dropCount,
  freshCount,
  onToggleMulti,
  onToggleFlag,
}: FacetRailProps) {
  return (
    <div className="flex flex-col gap-7">
      {/* 01 · Size run — highest decision weight, zero new data */}
      {sizes.length > 0 && (
        <section>
          <GroupLabel>Size run</GroupLabel>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {sizes.map((size) => {
              const on = query.run.includes(size.value);
              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => onToggleMulti("run", size.value)}
                  aria-pressed={on}
                  title={`${size.count} styles`}
                  className={cn(
                    "flex h-8 items-center justify-center border text-[10px] font-bold uppercase tracking-[0.1em] transition-colors duration-200",
                    on
                      ? "border-accent-lime bg-accent-lime text-on-accent"
                      : "border-line/25 text-content/65 hover:border-content hover:text-content",
                  )}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-content/30">
            Matches any selected size
          </p>
        </section>
      )}

      {/* 02 · Per piece — the number a buyer converts to MRP */}
      {perPiece.length > 0 && (
        <section>
          <GroupLabel>Per piece</GroupLabel>
          <div className="mt-2">
            {perPiece.map((band) => (
              <CheckRow
                key={band.value}
                label={band.label}
                count={band.count}
                checked={query.pp.includes(band.value)}
                onToggle={() => onToggleMulti("pp", band.value)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 03 · Availability + flags. Negative filter only — see facets.ts. */}
      <section>
        <GroupLabel>Availability</GroupLabel>
        <div className="mt-2">
          <CheckRow
            label="Hide sold out"
            count={soldOutCount}
            checked={query.hideSoldOut}
            onToggle={() => onToggleFlag("stock")}
          />
          <CheckRow
            label="Rate drop"
            count={dropCount}
            checked={query.drop}
            onToggle={() => onToggleFlag("drop")}
          />
          <CheckRow
            label="New this season"
            count={freshCount}
            checked={query.fresh}
            onToggle={() => onToggleFlag("fresh")}
          />
        </div>
      </section>

      {/* 04 · Category */}
      {categories.length > 0 && (
        <section>
          <GroupLabel>Category</GroupLabel>
          <div className="mt-2">
            {categories.map((cat) => (
              <CheckRow
                key={cat.value}
                label={cat.label}
                count={cat.count}
                checked={query.cat.includes(cat.value)}
                onToggle={() => onToggleMulti("cat", cat.value)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 05 · Colour — square swatches, no radius */}
      {colors.length > 0 && (
        <section>
          <GroupLabel>Colour</GroupLabel>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {colors.map((color) => {
              const on = query.col.includes(color.value);
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => onToggleMulti("col", color.value)}
                  aria-pressed={on}
                  aria-label={`${color.label} — ${color.count} styles`}
                  title={`${color.label} · ${color.count}`}
                  className={cn(
                    "relative h-6 w-6 border transition-all duration-200",
                    on
                      ? "border-content ring-1 ring-content ring-offset-2 ring-offset-surface"
                      : "border-line/30 hover:border-content",
                  )}
                  style={
                    color.hexes && color.hexes.length > 1
                      ? {
                          background: `linear-gradient(135deg, ${color.hexes[0]} 50%, ${color.hexes[1]} 50%)`,
                        }
                      : { background: color.hexes?.[0] ?? "#D9D4CC" }
                  }
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
