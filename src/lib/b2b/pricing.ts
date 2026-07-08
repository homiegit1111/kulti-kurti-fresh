import type { CartItem } from "@/lib/cart-context";
import type { MockProduct } from "@/lib/commerce/catalog";
import { B2B_CONFIG } from "./config";

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
