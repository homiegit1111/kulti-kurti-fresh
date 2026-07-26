/**
 * Facet definitions and the single filter/sort pass for /line.
 *
 * Pure functions over StyleLine[]. No React, no fetching — so the filtering
 * logic is checkable on its own, independent of any renderer.
 *
 * Every facet here is backed by a field that actually exists on MockProduct.
 * Notably ABSENT, and deliberately so:
 *
 *   • "MOQ ready" — B2B_CONFIG.minimumOrderSets is ORDER-level (4 sets total
 *     across styles) while minimumStyleSets is 1. Any single style therefore
 *     satisfies MOQ on its own at 4 sets, so the filter would pass the entire
 *     catalog. Making it mean "4 sets in stock" needs depth data the schema
 *     does not have.
 *   • "In stock" as a positive filter — availableForSale is optional, so we can
 *     only ever prove the negative. The facet hides flagged sold-out styles; it
 *     never claims the remainder are available.
 */

import { COLOR_MAP, type MockProduct } from "@/lib/commerce/catalog";
import type { StyleLine } from "./contract";

// ── Per-piece bands ───────────────────────────────────────────────────────────

/**
 * Bands set against the real catalog spread. Per-piece across MOCK_PRODUCTS runs
 * ₹825 (round(3299/4)) to ₹2,250 (round(8999/4)), so all four are populated —
 * no dead UI.
 */
export const PER_PIECE_BANDS = [
  { value: "1", label: "Under ₹1,000", min: 0, max: 999 },
  { value: "2", label: "₹1,000 – ₹1,500", min: 1000, max: 1499 },
  { value: "3", label: "₹1,500 – ₹2,000", min: 1500, max: 1999 },
  { value: "4", label: "₹2,000 & above", min: 2000, max: Infinity },
] as const;

export type PerPieceBand = (typeof PER_PIECE_BANDS)[number];

export function bandForPerPiece(perPiece: number): PerPieceBand | undefined {
  return PER_PIECE_BANDS.find((b) => perPiece >= b.min && perPiece <= b.max);
}

// ── Sort ──────────────────────────────────────────────────────────────────────

export const SORTS = [
  { value: "pp-asc", label: "Per piece · low first" },
  { value: "pp-desc", label: "Per piece · high first" },
  { value: "set-asc", label: "Set rate · low first" },
  { value: "set-desc", label: "Set rate · high first" },
  { value: "newest", label: "Newest first" },
] as const;

export type SortValue = (typeof SORTS)[number]["value"];
export const DEFAULT_SORT: SortValue = "pp-asc";

// ── Query state ───────────────────────────────────────────────────────────────

/** All of it lives in the URL, so a filtered /line link IS a line sheet. */
export interface LineQuery {
  /** size labels, e.g. ["M","L"] — a style matches if it offers ANY of them */
  run: string[];
  /** per-piece band values */
  pp: string[];
  /** categories */
  cat: string[];
  /** colour names (already flattened from families) */
  col: string[];
  /** true = hide styles flagged sold out */
  hideSoldOut: boolean;
  /** true = only styles with a salePrice */
  drop: boolean;
  /** true = only isNew styles */
  fresh: boolean;
  q: string;
  sort: SortValue;
}

export const EMPTY_QUERY: LineQuery = {
  run: [],
  pp: [],
  cat: [],
  col: [],
  hideSoldOut: false,
  drop: false,
  fresh: false,
  q: "",
  sort: DEFAULT_SORT,
};

const csv = (v: string | null): string[] =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

export function parseLineQuery(params: URLSearchParams): LineQuery {
  const sort = params.get("sort") as SortValue | null;
  return {
    run: csv(params.get("run")),
    pp: csv(params.get("pp")),
    cat: csv(params.get("cat")),
    col: csv(params.get("col")),
    hideSoldOut: params.get("stock") === "live",
    drop: params.get("drop") === "1",
    fresh: params.get("fresh") === "1",
    q: params.get("q") ?? "",
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortValue) : DEFAULT_SORT,
  };
}

export function activeFacetCount(query: LineQuery): number {
  return (
    query.run.length +
    query.pp.length +
    query.cat.length +
    query.col.length +
    (query.hideSoldOut ? 1 : 0) +
    (query.drop ? 1 : 0) +
    (query.fresh ? 1 : 0) +
    (query.q.trim() ? 1 : 0)
  );
}

// ── The single filter + sort pass ─────────────────────────────────────────────

export function applyLineQuery(lines: StyleLine[], query: LineQuery): StyleLine[] {
  const needle = query.q.trim().toLowerCase();

  const filtered = lines.filter((line) => {
    const p = line.product;

    if (query.hideSoldOut && line.stock === "sold_out") return false;
    if (query.drop && p.salePrice == null) return false;
    if (query.fresh && !p.isNew) return false;

    if (query.cat.length && !query.cat.includes(p.category)) return false;

    if (query.run.length) {
      const offered = new Set(line.sizeRun.map((s) => s.toUpperCase()));
      if (!query.run.some((s) => offered.has(s.toUpperCase()))) return false;
    }

    if (query.col.length) {
      const lower = p.colors.map((c) => c.toLowerCase());
      if (!query.col.some((c) => lower.includes(c.toLowerCase()))) return false;
    }

    if (query.pp.length) {
      const band = bandForPerPiece(line.perPiece);
      if (!band || !query.pp.includes(band.value)) return false;
    }

    if (needle) {
      const haystack = `${p.title} ${p.category} ${line.code} ${p.colors.join(" ")}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });

  return sortLines(filtered, query.sort);
}

function sortLines(lines: StyleLine[], sort: SortValue): StyleLine[] {
  const out = [...lines];
  switch (sort) {
    case "pp-asc":
      return out.sort((a, b) => a.perPiece - b.perPiece);
    case "pp-desc":
      return out.sort((a, b) => b.perPiece - a.perPiece);
    case "set-asc":
      return out.sort((a, b) => a.setPrice - b.setPrice);
    case "set-desc":
      return out.sort((a, b) => b.setPrice - a.setPrice);
    case "newest":
      return out.sort((a, b) => Number(b.product.isNew) - Number(a.product.isNew));
    default:
      return out;
  }
}

// ── Facet option derivation (counts come from the unfiltered set) ─────────────

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  hexes?: string[];
}

/** Sizes present anywhere in the catalog, in wholesale order rather than A–Z. */
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];

export function sizeRunOptions(lines: StyleLine[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    for (const size of line.sizeRun) {
      const key = size.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a[0]);
      const bi = SIZE_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([value, count]) => ({ value, label: value, count }));
}

export function perPieceOptions(lines: StyleLine[]): FacetOption[] {
  return PER_PIECE_BANDS.map((band) => ({
    value: band.value,
    label: band.label,
    count: lines.filter((l) => bandForPerPiece(l.perPiece)?.value === band.value)
      .length,
  })).filter((o) => o.count > 0);
}

export function categoryOptions(lines: StyleLine[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const c = line.product.category;
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}

/**
 * Colour options, collapsing near-identical shades into one swatch. Carried over
 * from shop-client: ivory/cream/pearl/white read as four random dots otherwise.
 * The URL holds the family members as CSV so links stay shareable.
 */
const COLOR_GROUPS: { label: string; members: string[] }[] = [
  { label: "Ivory & cream", members: ["ivory", "cream", "pearl", "white"] },
];

export function colorOptions(lines: StyleLine[]): FacetOption[] {
  const products: MockProduct[] = lines.map((l) => l.product);
  const unique = [...new Set(products.flatMap((p) => p.colors).filter(Boolean))];
  const seen = new Set<string>();
  const out: FacetOption[] = [];

  const countFor = (members: string[]) =>
    products.filter((p) =>
      p.colors.some((c) => members.includes(c.toLowerCase())),
    ).length;

  for (const color of unique) {
    if (seen.has(color)) continue;
    const group = COLOR_GROUPS.find((g) => g.members.includes(color.toLowerCase()));
    if (group) {
      const members = unique.filter((c) => group.members.includes(c.toLowerCase()));
      members.forEach((m) => seen.add(m));
      out.push({
        value: members.join(","),
        label: group.label,
        count: countFor(members.map((m) => m.toLowerCase())),
        hexes: members.slice(0, 2).map((m) => COLOR_MAP[m.toLowerCase()] ?? "#D9D4CC"),
      });
    } else {
      seen.add(color);
      out.push({
        value: color,
        label: color,
        count: countFor([color.toLowerCase()]),
        hexes: [COLOR_MAP[color.toLowerCase()] ?? "#D9D4CC"],
      });
    }
  }
  return out;
}
