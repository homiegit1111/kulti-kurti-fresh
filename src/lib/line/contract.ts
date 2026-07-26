/**
 * The single data contract for every catalog surface.
 *
 * One StyleLine drives StylePlate, StyleCard and StyleRow. Renderers read
 * fields — they never call pricing helpers, never derive, never refetch. Add a
 * field here and all three densities gain it at once.
 *
 * PRESENTATIONAL ONLY. This module reads existing b2b config/pricing and owns
 * no commerce behaviour: no cart writes, no tax opinions, no stock invention.
 */

import { B2B_CONFIG, GST_CONFIG } from "@/lib/b2b/config";
import { getBaseSetPrice, getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import type { MockProduct } from "@/lib/commerce/catalog";

/**
 * The only stock states the schema can honestly express today.
 *
 * `MockProduct.availableForSale` is OPTIONAL, so it is three-valued in
 * practice: true | false | undefined. `shop/[handle]/page.tsx` already reads it
 * as `!== false`. That means we can prove a style is flagged sold out, but we
 * can NEVER prove one is in stock — `undefined` is the mock backend's default.
 *
 * So: render a mark only for `sold_out`. `unflagged` renders nothing. Silence
 * is the true statement. No green dots, no "Ready", no invented depth.
 *
 * When the backend grows a real count, extend this union and update
 * deriveStock() only — no renderer changes.
 */
export type StockState = "sold_out" | "unflagged";

export function deriveStock(product: Pick<MockProduct, "availableForSale">): StockState {
  return product.availableForSale === false ? "sold_out" : "unflagged";
}

/**
 * GST rate for a per-piece value, read from GST_CONFIG so the rate/threshold
 * live in exactly one place. GST_CONFIG is flagged verify-before-live; when it
 * is corrected, every surface follows with no component edits.
 */
export function deriveGstRate(perPiece: number): number {
  return perPiece > GST_CONFIG.thresholdPerPiece
    ? GST_CONFIG.highRate
    : GST_CONFIG.lowRate;
}

/**
 * The unit of the catalog and of the tray.
 *
 * `product` stays INTACT — never picked, never flattened. That is what lets a
 * shortlisted tray row show size run, colours and category with no refetch, and
 * it is the asymmetry that made the old wishlist/cart split feel like two
 * different features. Flattening happens once, at the checkout-draft boundary,
 * where CommerceCartLine already defines the wire shape.
 */
export interface StyleLine {
  product: MockProduct;
  /** e.g. "RP-COTTON-482" — up to 13 chars, size the column for it. */
  code: string;
  setPrice: number;
  perPiece: number;
  sizeRun: string[];
  stock: StockState;
  gstRate: number;
  /** 0 = shortlisted · >0 = committed. Absent from tray = absent entirely. */
  sets: number;
  comparing: boolean;
}

/** Sets a single COMMIT click puts in the tray — satisfies MOQ in one action. */
export const COMMIT_DEFAULT_SETS = B2B_CONFIG.minimumOrderSets;

/** Max styles side by side in compare. Beyond this it is a spreadsheet. */
export const COMPARE_MAX = 4;

export function toStyleLine(
  product: MockProduct,
  sets = 0,
  comparing = false,
): StyleLine {
  const setPrice = getBaseSetPrice(product);
  const perPiece = getPerPiecePrice(setPrice);
  return {
    product,
    code: getStyleCode(product),
    setPrice,
    perPiece,
    sizeRun: product.sizes,
    stock: deriveStock(product),
    gstRate: deriveGstRate(perPiece),
    sets,
    comparing,
  };
}

export const isCommitted = (line: StyleLine) => line.sets > 0;
export const isShortlisted = (line: StyleLine) => line.sets === 0;
export const isSoldOut = (line: StyleLine) => line.stock === "sold_out";

/** Pieces a line represents. Set size is a business constant, not a guess. */
export const linePieces = (line: StyleLine) => line.sets * B2B_CONFIG.setSize;

/** Line value at current set count. 0 for shortlisted — no phantom totals. */
export const lineValue = (line: StyleLine) => line.sets * line.setPrice;
