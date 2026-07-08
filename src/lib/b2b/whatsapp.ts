import type { CartItem } from "@/lib/cart-context";
import { formatPrice } from "@/lib/commerce/catalog";
import type { MockProduct } from "@/lib/commerce/catalog";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "./config";
import { calculateLineTotal, calculateWholesaleTotals } from "./pricing";
import { getStyleCode } from "./style-code";
import { normalizeIndianPhone } from "./validation";

export interface WholesaleBuyerInfo {
  buyerName?: string;
  businessName?: string;
  city?: string;
  whatsappPhone?: string;
  gstin?: string;
  wantsGstInvoice?: boolean;
  shippingCity?: string;
}

export function buildWholesaleWhatsAppMessage(
  items: CartItem[],
  buyer: WholesaleBuyerInfo = {},
): string {
  const totals = calculateWholesaleTotals(items);
  const lines = [
    "Namaste Rangat Pehnawa,",
    "",
    "I want to place a wholesale kurti order.",
    "",
    `Buyer: ${buyer.buyerName || "Not shared"}`,
    `Business: ${buyer.businessName || "Not shared"}`,
    `City: ${buyer.city || buyer.shippingCity || "Not shared"}`,
    `WhatsApp: ${buyer.whatsappPhone || "Not shared"}`,
    `GST invoice: ${buyer.wantsGstInvoice ? "Yes" : "Please confirm"}`,
    buyer.gstin ? `GSTIN: ${buyer.gstin}` : "",
    "",
    `Size ratio: ${SIZE_RATIO_LABEL}`,
    `Pack rule: 1 set = ${B2B_CONFIG.setSize} pcs`,
    "",
    "Styles:",
    ...items.map((item, index) => {
      const setPrice = item.salePrice ?? item.price;
      const lineTotal = calculateLineTotal(item, totals.totalSets);
      const styleCode = getStyleCode(item);
      return [
        `${index + 1}. ${item.title}`,
        `   Style code: ${styleCode}`,
        `   Handle: ${item.handle}`,
        `   Sets: ${item.quantity}`,
        `   Pieces: ${item.quantity * B2B_CONFIG.setSize}`,
        `   Ratio: ${SIZE_RATIO_LABEL}`,
        `   Price per set: ${formatPrice(setPrice)}`,
        `   Line total: ${formatPrice(lineTotal)}`,
      ].join("\n");
    }),
    "",
    `Applied tier: ${totals.appliedTier?.label || "MOQ pending"}`,
    `Discount: ${totals.discountPercent}%`,
    `Savings: ${formatPrice(totals.discountAmount)}`,
    `Total sets: ${totals.totalSets}`,
    `Total pieces: ${totals.totalPieces}`,
    `Order total: ${formatPrice(totals.subtotal)}`,
    "",
    `Shipping city: ${buyer.shippingCity || buyer.city || "Please confirm"}`,
    "Please confirm availability, GST invoice, dispatch timeline, and Razorpay payment link.",
  ];

  return lines.filter(Boolean).join("\n");
}

function buildWhatsAppUrl(message: string): string {
  const phone = normalizeIndianPhone(B2B_CONFIG.whatsappNumber);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWholesaleWhatsAppUrl(
  items: CartItem[],
  buyer?: WholesaleBuyerInfo,
): string {
  return buildWhatsAppUrl(buildWholesaleWhatsAppMessage(items, buyer));
}

export function buildCatalogRequestMessage(): string {
  return [
    "Namaste Rangat Pehnawa,",
    "",
    "Please send me your latest wholesale kurti catalog with MOQ and price list.",
    "",
    `MOQ: ${B2B_CONFIG.minimumOrderSets} sets`,
    `Pack: 1 set = ${B2B_CONFIG.setSize} pcs`,
    `Size ratio: ${SIZE_RATIO_LABEL}`,
    "",
    "I would also like to know available styles, dispatch timeline, GST invoice process, and Razorpay payment options.",
  ].join("\n");
}

export function buildCatalogRequestUrl(): string {
  return buildWhatsAppUrl(buildCatalogRequestMessage());
}

export function buildProductInquiryMessage(product: MockProduct): string {
  const styleCode = getStyleCode(product);
  const setPrice = product.salePrice ?? product.price;
  return [
    "Namaste Rangat Pehnawa,",
    "",
    "I want to check wholesale availability for this style.",
    "",
    `Style: ${product.title}`,
    `Style code: ${styleCode}`,
    `Handle: ${product.handle}`,
    `Category: ${product.category}`,
    `Wholesale set price: ${formatPrice(setPrice)}`,
    `Pack: 1 set = ${B2B_CONFIG.setSize} pcs`,
    `Size ratio: ${SIZE_RATIO_LABEL}`,
    "",
    "Please confirm stock, color options, GST invoice, dispatch timeline, and Razorpay payment link.",
  ].join("\n");
}

export function buildProductInquiryUrl(product: MockProduct): string {
  return buildWhatsAppUrl(buildProductInquiryMessage(product));
}

export function buildLinesheetInquiryMessage(products: MockProduct[]): string {
  const lines = products.map((product, index) => {
    const setPrice = product.salePrice ?? product.price;
    return `${index + 1}. ${getStyleCode(product)} - ${product.title} - ${formatPrice(setPrice)}/set`;
  });

  return [
    "Namaste Rangat Pehnawa,",
    "",
    "I have saved these wholesale styles in my buyer linesheet.",
    "",
    ...lines,
    "",
    `Pack rule: 1 set = ${B2B_CONFIG.setSize} pcs in ${SIZE_RATIO_LABEL}`,
    `MOQ: ${B2B_CONFIG.minimumOrderSets} sets total`,
    "",
    "Please confirm availability, latest catalog updates, GST invoice, dispatch timeline, and Razorpay payment options.",
  ].join("\n");
}

export function buildLinesheetInquiryUrl(products: MockProduct[]): string {
  return buildWhatsAppUrl(buildLinesheetInquiryMessage(products));
}

export function buildPaymentHelpUrl(): string {
  return buildWhatsAppUrl(
    [
      "Namaste Rangat Pehnawa,",
      "",
      "I need help completing a wholesale payment.",
      "Please confirm my order total and send a Razorpay payment link.",
    ].join("\n"),
  );
}
