/**
 * @deprecated — the backend has migrated to Shopify.
 * This file keeps old named exports alive so existing imports don't break.
 * Prefer importing from "@/lib/shopify-cart" in new code.
 */

// Re-export all Shopify cart utilities under their old Medusa names
export {
  SHOPIFY_CART_ID_KEY as MEDUSA_CART_ID_KEY,
  createCart,
  getCart,
  getOrCreateCart,
  cartLinesAdd as addLineItem,
  cartLinesRemove as removeLineItem,
  cartLinesUpdate as updateLineItem,
  isShopifyCartEnabled as isMedusaCartEnabled,
  type ShopifyCart as MedusaCart,
  type ShopifyCartLine as MedusaLineItem,
  type ShopifyOrder as MedusaOrder,
  type ShopifyOrder as MedusaOrderDetail,
} from "./shopify-cart";

// Keep the region key around so nothing crashes if imported
export const MEDUSA_REGION_ID_KEY = "rp_medusa_region_id";
