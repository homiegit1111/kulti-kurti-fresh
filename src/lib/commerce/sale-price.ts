/**
 * Effective set price — the TypeScript mirror of the SQL function
 * `public.commerce_effective_set_price` in
 * supabase/20260726_configurable_pricing_and_sales.sql.
 *
 * These two implementations MUST agree. The database one decides what a buyer is
 * charged; this one decides what the buyer is shown. If they diverge, the site
 * quotes one number and the card is debited another — which is the exact bug this
 * pair was written to close (before it, the storefront ignored sale prices
 * entirely while checkout was about to start honouring them).
 *
 * The rule, stated once:
 *   a sale price applies when it exists, is positive, is genuinely lower than the
 *   list price, and the current moment falls inside the product's sale window
 *   (an absent start means "already started", an absent end means "no expiry").
 *
 * Client-safe: pure, no imports.
 */

export type SaleWindow = {
  /** Inclusive start. Null/undefined means the sale is already running. */
  startsAt?: string | null;
  /** Exclusive end. Null/undefined means the sale never expires. */
  endsAt?: string | null;
};

/** True when the product's sale window contains `now`. */
export function isSaleWindowOpen(window: SaleWindow, now: Date = new Date()): boolean {
  const t = now.getTime();
  if (window.startsAt) {
    const start = Date.parse(window.startsAt);
    // An unparseable date is treated as "not on sale". Failing closed here means
    // a corrupt timestamp can only ever charge the full price, never give away
    // an unintended discount.
    if (!Number.isFinite(start) || start > t) return false;
  }
  if (window.endsAt) {
    const end = Date.parse(window.endsAt);
    if (!Number.isFinite(end) || end <= t) return false;
  }
  return true;
}

/**
 * The price to charge and display for one variant.
 * Returns `listPrice` whenever no valid sale applies.
 */
export function effectiveSetPrice(
  listPrice: number,
  salePrice: number | null | undefined,
  window: SaleWindow = {},
  now?: Date,
): number {
  if (
    typeof salePrice !== "number" ||
    !Number.isFinite(salePrice) ||
    salePrice <= 0 ||
    salePrice >= listPrice
  ) {
    return listPrice;
  }
  return isSaleWindowOpen(window, now) ? salePrice : listPrice;
}
