"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { MOCK_PRODUCTS, formatPrice } from "@/lib/commerce/catalog";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import type { CommerceProduct } from "@/lib/commerce/catalog";

/**
 * 404 helper (Chapter 4) — fuzzy-match the missed path against real style
 * codes and offer "Did you mean" as plain ledger rows. Client-only because
 * the not-found boundary has no access to the requested path on the server;
 * renders nothing until it has read `location.pathname`, and nothing at all
 * when no code comes close.
 */

type Suggestion = { product: CommerceProduct; code: string };

const CODE_INDEX: Suggestion[] = MOCK_PRODUCTS.map((product) => ({
  product,
  code: getStyleCode(product),
}));

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

function suggestForPath(pathname: string): Suggestion[] {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    /* malformed escape — match the raw segment */
  }
  const q = compact(decoded);
  if (q.length < 3) return [];
  const qDigits = q.replace(/\D/g, "");

  const scored = CODE_INDEX.map((entry) => {
    const c = compact(entry.code);
    const h = compact(entry.product.handle);
    let score = 0;
    if (c.includes(q) || q.includes(c)) score = 100;
    else if (h.includes(q) || q.includes(h)) score = 80;
    else if (qDigits.length >= 2 && c.replace(/\D/g, "").includes(qDigits))
      score = 60;
    else {
      const prefix = Math.max(commonPrefixLength(c, q), commonPrefixLength(h, q));
      if (prefix >= 4) score = prefix * 10;
    }
    return { entry, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map((s) => s.entry);
}

/** Stable no-op subscribe — the missed pathname never changes on a 404 page. */
const subscribeNever = () => () => {};

export function NotFoundSuggestions() {
  // SSR-safe read of the missed path: null on the server, the real pathname
  // after hydration (the not-found boundary has no server access to it).
  const pathname = useSyncExternalStore(
    subscribeNever,
    () => window.location.pathname,
    () => null,
  );
  const suggestions = useMemo(
    () => (pathname ? suggestForPath(pathname) : []),
    [pathname],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-12 w-full max-w-lg text-left">
      <p className="mb-3 text-[9px] font-extrabold uppercase tracking-[0.28em] text-content/45">
        Did you mean
      </p>
      <ul className="ledger divide-y divide-line/15 border-y border-line/25">
        {suggestions.map(({ product, code }) => (
          <li key={product.id}>
            <Link
              href={`/shop/${product.handle}`}
              className="flex items-baseline gap-3 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
            >
              <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-content/55">
                {code}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-content">
                {product.title}
              </span>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-content">
                {formatPrice(getPerPiecePrice(product.salePrice ?? product.price))}
                <span className="font-semibold text-content/50"> /pc</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
