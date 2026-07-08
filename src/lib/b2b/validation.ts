import type { CartItem } from "@/lib/cart-context";
import { B2B_CONFIG } from "./config";
import { calculateWholesaleTotals, normalizeSetQuantity } from "./pricing";

export function validateCartMOQ(items: CartItem[]) {
  const totals = calculateWholesaleTotals(items);
  const remainingSets = Math.max(
    0,
    B2B_CONFIG.minimumOrderSets - totals.totalSets,
  );

  return {
    ok: remainingSets === 0,
    remainingSets,
    totalSets: totals.totalSets,
    minimumSets: B2B_CONFIG.minimumOrderSets,
  };
}

export function sanitizeSetInput(value: string | number): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value.trim(), 10);
  return normalizeSetQuantity(parsed);
}

export function isValidGSTIN(value: string): boolean {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return true;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(trimmed);
}

export function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export function isValidWhatsappPhone(value: string): boolean {
  const phone = normalizeIndianPhone(value);
  return /^91[6-9]\d{9}$/.test(phone);
}
