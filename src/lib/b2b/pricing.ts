import type { CartItem } from "@/lib/cart-context";
import type { MockProduct } from "@/lib/commerce/catalog";
import { B2B_CONFIG, GST_CONFIG } from "./config";

export interface WholesaleTier {
  minSets: number;
  maxSets: number | null;
  discountPercent: number;
  label: string;
}

export interface WholesaleTotals {
  totalSets: number;
  totalPieces: number;
  baseSubtotal: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  appliedTier: WholesaleTier | null;
  nextTier: WholesaleTier | null;
  setsToNextTier: number | null;
}

export function normalizeSetQuantity(value: number): number {
  if (!Number.isFinite(value)) return B2B_CONFIG.minimumStyleSets;
  return Math.max(B2B_CONFIG.minimumStyleSets, Math.floor(value));
}

export function getBaseSetPrice(product: Pick<MockProduct, "price" | "salePrice">): number {
  return product.salePrice ?? product.price;
}

export function getPerPiecePrice(setPrice: number): number {
  return Math.round(setPrice / B2B_CONFIG.setSize);
}

export function getTier(totalSets: number): WholesaleTier | null {
  return (
    B2B_CONFIG.tiers.find(
      (tier) =>
        totalSets >= tier.minSets &&
        (tier.maxSets === null || totalSets <= tier.maxSets),
    ) ?? null
  );
}

export function getNextTier(totalSets: number): WholesaleTier | null {
  return (
    B2B_CONFIG.tiers.find((tier) => totalSets < tier.minSets) ?? null
  );
}

export function applyTierDiscount(amount: number, totalSets: number): number {
  const tier = getTier(totalSets);
  if (!tier) return amount;
  return Math.round(amount * (1 - tier.discountPercent / 100));
}

/**
 * Medusa promotion code that encodes a wholesale tier discount. The storefront
 * computes the tier server-side, then applies this code to the Medusa cart so
 * the cart total (and therefore the charged amount + order reconciliation) is
 * discounted by Medusa itself — never by trusting a client number.
 *
 * Convention: `WHOLESALE<percent>` (e.g. WHOLESALE5, WHOLESALE10). The backend
 * seed script `rangat-b2b-promotions-sync.ts` MUST create promotions with
 * exactly these codes. A 0% tier maps to no code. Keep the two in lockstep.
 */
export function wholesaleTierPromoCode(discountPercent: number): string | null {
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return null;
  return `WHOLESALE${Math.round(discountPercent)}`;
}

export function calculateWholesaleTotals(items: CartItem[]): WholesaleTotals {
  const totalSets = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPieces = totalSets * B2B_CONFIG.setSize;
  const baseSubtotal = items.reduce(
    (sum, item) => sum + (item.salePrice ?? item.price) * item.quantity,
    0,
  );
  const appliedTier = getTier(totalSets);
  const nextTier = getNextTier(totalSets);
  const discountPercent = appliedTier?.discountPercent ?? 0;
  const subtotal = applyTierDiscount(baseSubtotal, totalSets);
  const discountAmount = Math.max(0, baseSubtotal - subtotal);

  return {
    totalSets,
    totalPieces,
    baseSubtotal,
    discountPercent,
    discountAmount,
    subtotal,
    appliedTier,
    nextTier,
    setsToNextTier: nextTier ? Math.max(0, nextTier.minSets - totalSets) : null,
  };
}

export function calculateLineTotal(
  item: Pick<CartItem, "price" | "salePrice" | "quantity">,
  totalSets: number,
): number {
  return applyTierDiscount((item.salePrice ?? item.price) * item.quantity, totalSets);
}

export interface GstBreakdown {
  /** Post-discount taxable value GST is computed on (equals subtotal). */
  taxableAmount: number;
  /** Single rate when all lines share a bracket, else null (see isMixed). */
  gstRate: number | null;
  /** Human label for the rate: "5%", "12%", or "5–12%" for mixed carts. */
  gstRateLabel: string;
  gstAmount: number;
  grandTotal: number;
  /** True when lines span both the 5% and 12% brackets. */
  isMixed: boolean;
}

/**
 * Per-piece GST for an apparel cart. Each line's per-piece value selects the
 * 5% or 12% bracket; GST is charged on that line's post-tier (discounted)
 * amount, then summed. See {@link GST_CONFIG} for the (verify-before-live)
 * rates and threshold.
 */
export function calculateGstBreakdown(
  items: CartItem[],
  totalSets: number,
): GstBreakdown {
  const { lowRate, highRate, thresholdPerPiece } = GST_CONFIG;
  let taxableAmount = 0;
  let gstAmount = 0;
  const bracketsSeen = new Set<number>();

  for (const item of items) {
    const setPrice = item.salePrice ?? item.price;
    const perPiece = getPerPiecePrice(setPrice);
    const rate = perPiece > thresholdPerPiece ? highRate : lowRate;
    // Match the money the buyer actually pays: discounted line total.
    const lineTaxable = calculateLineTotal(item, totalSets);
    taxableAmount += lineTaxable;
    gstAmount += Math.round((lineTaxable * rate) / 100);
    bracketsSeen.add(rate);
  }

  const isMixed = bracketsSeen.size > 1;
  const gstRate = isMixed ? null : (bracketsSeen.values().next().value ?? lowRate);
  const gstRateLabel = isMixed
    ? `${lowRate}–${highRate}%`
    : `${gstRate}%`;

  return {
    taxableAmount,
    gstRate,
    gstRateLabel,
    gstAmount,
    grandTotal: taxableAmount + gstAmount,
    isMixed,
  };
}
