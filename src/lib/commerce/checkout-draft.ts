import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import {
  calculateWholesaleTotals,
  getBaseSetPrice,
  wholesaleTierPromoCode,
  type WholesaleTotals,
} from "@/lib/b2b/pricing";
import { validateCartMOQ } from "@/lib/b2b/validation";
import { getStyleCode } from "@/lib/b2b/style-code";
import { getProductByHandle } from "@/lib/commerce/catalog";
import { isValidEmail } from "@/lib/email-validation";
import type { CartItem } from "@/lib/cart-context";
import type {
  CommerceBuyer,
  CommerceCartLine,
  CommerceCheckoutDraft,
} from "./types";
import { buyerIdentityMetadata, withBuyerIdentity } from "./buyer-identity";

type RawRecord = Record<string, unknown>;

export type CheckoutSource = "razorpay" | "phonepe" | "whatsapp";

export type CheckoutDraftErrorCode =
  | "EMPTY_CART"
  | "BELOW_MOQ"
  | "INVALID_CART"
  | "UNKNOWN_PRODUCT"
  | "INVALID_BUYER";

export interface WholesaleCheckoutBuyer extends CommerceBuyer {
  buyerName?: string;
  whatsappPhone?: string;
  wantsGstInvoice?: boolean;
  shippingCity?: string;
  shippingRecipient?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingState?: string;
  shippingPinCode?: string;
  termsAccepted?: boolean;
}

export interface WholesaleCheckoutLine
  extends Pick<
    CartItem,
    | "id"
    | "productId"
    | "title"
    | "handle"
    | "image"
    | "price"
    | "salePrice"
    | "size"
    | "color"
    | "quantity"
    | "variantId"
  > {
  styleCode: string;
  setPrice: number;
  pieces: number;
  lineBaseTotal: number;
}

export interface WholesaleCheckoutDraft {
  source: CheckoutSource;
  items: WholesaleCheckoutLine[];
  buyer: WholesaleCheckoutBuyer;
  totals: WholesaleTotals;
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
  commerceDraft: CommerceCheckoutDraft;
}

export type WholesaleCheckoutDraftResult =
  | { ok: true; draft: WholesaleCheckoutDraft }
  | {
      ok: false;
      status: 400;
      code: CheckoutDraftErrorCode;
      error: string;
      moq?: false;
      remainingSets?: number;
      totalSets?: number;
      minimumSets?: number;
    };

function stringValue(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true";
}

function parseItems(value: unknown): WholesaleCheckoutLine[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): WholesaleCheckoutLine | null => {
      if (!item || typeof item !== "object") return null;
      const line = item as RawRecord;
      const quantity = Math.floor(Number(line.quantity));
      const price = Number(line.price);
      const salePrice =
        line.salePrice === null || line.salePrice === undefined
          ? null
          : Number(line.salePrice);
      const title = stringValue(line.title, 180);
      const handle = stringValue(line.handle, 120);
      const id = stringValue(line.id, 160);
      const productId = stringValue(line.productId, 160) || id;
      const image = stringValue(line.image, 400);
      const size = stringValue(line.size, 40) || SIZE_RATIO_LABEL;
      const color = stringValue(line.color, 80) || "default";
      const variantId = stringValue(line.variantId, 180) || undefined;

      if (
        !id ||
        !productId ||
        !title ||
        !handle ||
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isFinite(quantity) ||
        quantity < B2B_CONFIG.minimumStyleSets
      ) {
        return null;
      }

      const safeSalePrice = Number.isFinite(salePrice) ? salePrice : null;
      const setPrice = safeSalePrice ?? price;

      return {
        id,
        productId,
        title,
        handle,
        image,
        price,
        salePrice: safeSalePrice,
        size,
        color,
        quantity,
        ...(variantId ? { variantId } : {}),
        styleCode: getStyleCode({ id: productId, handle }),
        setPrice,
        pieces: quantity * B2B_CONFIG.setSize,
        lineBaseTotal: setPrice * quantity,
      };
    })
    .filter((item): item is WholesaleCheckoutLine => item !== null);
}

/**
 * Re-price every line from the authoritative catalog (active commerce backend),
 * ignoring whatever price the client sent. This is the sole defence against a
 * tampered request body setting `price: 1` to pay ₹1 for a real order — the
 * signed Razorpay amount is derived from these totals, so it MUST come from the
 * server, never the client. A handle we can't price is rejected (fail-closed).
 */
async function repriceLinesFromCatalog(
  items: WholesaleCheckoutLine[],
): Promise<
  | { ok: true; items: WholesaleCheckoutLine[] }
  | { ok: false; unknownHandle: string }
> {
  const productByHandle = new Map<string, Awaited<ReturnType<typeof getProductByHandle>>>();
  const repriced: WholesaleCheckoutLine[] = [];
  for (const line of items) {
    let product = productByHandle.get(line.handle);
    if (product === undefined) {
      product = await getProductByHandle(line.handle);
      productByHandle.set(line.handle, product);
    }
    const selectedVariantPrice = line.variantId
      ? product?.variantPrices?.[line.variantId]
      : undefined;
    const setPrice = selectedVariantPrice ?? (product ? getBaseSetPrice(product) : null);
    if (setPrice === null || !Number.isFinite(setPrice) || setPrice <= 0) {
      return { ok: false, unknownHandle: line.handle };
    }
    repriced.push({
      ...line,
      price: setPrice,
      salePrice: null,
      setPrice,
      lineBaseTotal: setPrice * line.quantity,
    });
  }

  return { ok: true, items: repriced };
}

function parseBuyer(body: RawRecord): WholesaleCheckoutBuyer {
  const city = stringValue(body.city, 80);
  const whatsappPhone = stringValue(body.whatsappPhone, 40);
  const buyerName = stringValue(body.buyerName, 120);
  const businessType =
    stringValue(body.businessType, 60) || stringValue(body.business_type, 60);
  const accountSource = stringValue(body.accountSource, 40);
  const shippingRecipient = stringValue(body.shippingRecipient, 120);
  const shippingAddress1 = stringValue(body.shippingAddress1, 240);
  const shippingAddress2 = stringValue(body.shippingAddress2, 240);
  const shippingState = stringValue(body.shippingState, 80);
  const shippingPinCode = stringValue(body.shippingPinCode, 10);

  return {
    name: buyerName,
    buyerName,
    businessName: stringValue(body.businessName, 120),
    businessType,
    city,
    phone: whatsappPhone,
    whatsappPhone,
    gstin: stringValue(body.gstin, 20).toUpperCase(),
    wantsGstInvoice: booleanValue(body.wantsGstInvoice),
    shippingCity: stringValue(body.shippingCity, 80) || city,
    shippingRecipient,
    shippingAddress1,
    shippingAddress2,
    shippingState,
    shippingPinCode,
    termsAccepted: booleanValue(body.termsAccepted),
    email: stringValue(body.email, 160),
    buyerReference: stringValue(body.buyerReference, 64),
    accountSource:
      accountSource === "wholesale_profile" || accountSource === "checkout_form"
        ? accountSource
        : undefined,
  };
}

function buildReceipt(source: CheckoutSource): string {
  const prefix = source === "razorpay" ? "rp" : "wa";
  // Razorpay receipts must be unique and no longer than 40 chars.
  return `${prefix}_${Date.now().toString(36)}`.slice(0, 40);
}

function buildNotes(
  source: CheckoutSource,
  buyer: WholesaleCheckoutBuyer,
  totals: WholesaleTotals,
): Record<string, string> {
  return {
    source: `rangat_phase_2_${source}`,
    total_sets: String(totals.totalSets),
    total_pieces: String(totals.totalPieces),
    tier: totals.appliedTier?.label ?? "MOQ pending",
    business_name: (buyer.businessName ?? "").slice(0, 120),
    buyer_name: (buyer.buyerName ?? buyer.name ?? "").slice(0, 120),
    city: (buyer.city ?? "").slice(0, 80),
    whatsapp: (buyer.whatsappPhone ?? buyer.phone ?? "").slice(0, 40),
    gstin: (buyer.gstin ?? "").slice(0, 20),
    gst_invoice: buyer.wantsGstInvoice ? "yes" : "confirm",
    pack_ratio: SIZE_RATIO_LABEL,
    ...buyerIdentityMetadata(buyer),
  };
}

function toCommerceLine(line: WholesaleCheckoutLine): CommerceCartLine {
  return {
    productId: line.productId,
    variantId: line.variantId,
    title: line.title,
    handle: line.handle,
    quantity: line.quantity,
    unitPrice: line.setPrice,
    metadata: {
      local_line_id: line.id,
      size: line.size,
      color: line.color,
      style_code: line.styleCode,
      set_size: B2B_CONFIG.setSize,
      pieces: line.pieces,
      ratio: SIZE_RATIO_LABEL,
      image: line.image,
    },
  };
}

export async function buildWholesaleCheckoutDraft(
  rawBody: unknown,
  source: CheckoutSource,
  context: { clerkUserId?: string | null; checkoutIdempotencyKey?: string } = {},
): Promise<WholesaleCheckoutDraftResult> {
  const body = rawBody && typeof rawBody === "object" ? (rawBody as RawRecord) : {};
  const parsedItems = parseItems(body.items);

  if (parsedItems.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "EMPTY_CART",
      error: "Cart is empty.",
    };
  }

  const repriced = await repriceLinesFromCatalog(parsedItems);
  if (!repriced.ok) {
    return {
      ok: false,
      status: 400,
      code: "UNKNOWN_PRODUCT",
      error: `A product in your cart is no longer available (${repriced.unknownHandle}). Please refresh your cart.`,
    };
  }
  const items = repriced.items;

  const totals = calculateWholesaleTotals(items as CartItem[]);
  const moq = validateCartMOQ(items as CartItem[]);
  if (!moq.ok) {
    return {
      ok: false,
      status: 400,
      code: "BELOW_MOQ",
      error: `Add ${moq.remainingSets} more sets to reach MOQ.`,
      moq: false,
      remainingSets: moq.remainingSets,
      totalSets: moq.totalSets,
      minimumSets: moq.minimumSets,
    };
  }

  if (!Number.isFinite(totals.subtotal) || totals.subtotal <= 0) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_CART",
      error: "Cart total is invalid.",
    };
  }

  const buyer = withBuyerIdentity(parseBuyer(body));
  const buyerName = buyer.buyerName?.trim() || buyer.name?.trim() || "";
  const phoneDigits = (buyer.whatsappPhone || buyer.phone || "").replace(/D/g, "");
  if (
    !buyerName ||
    !buyer.businessName?.trim() ||
    !buyer.businessType?.trim() ||
    phoneDigits.length !== 10 ||
    !buyer.email ||
    !isValidEmail(buyer.email) ||
    !buyer.shippingRecipient?.trim() ||
    !buyer.shippingAddress1?.trim() ||
    !buyer.shippingCity?.trim() ||
    !buyer.shippingState?.trim() ||
    !/^[1-9][0-9]{5}$/.test(buyer.shippingPinCode ?? "") ||
    !buyer.termsAccepted
  ) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_BUYER",
      error: "Complete contact, dispatch address, and wholesale terms are required.",
    };
  }
  const receipt = buildReceipt(source);
  const notes = buildNotes(source, buyer, totals);

  return {
    ok: true,
    draft: {
      source,
      items,
      buyer,
      totals,
      amountPaise: Math.round(totals.subtotal * 100),
      receipt,
      notes,
      commerceDraft: {
        lines: items.map(toCommerceLine),
        buyer,
        clerkUserId: context.clerkUserId ?? null,
        checkoutIdempotencyKey: context.checkoutIdempotencyKey,
        currencyCode: "INR",
        source,
        tierPromoCode: wholesaleTierPromoCode(totals.discountPercent),
      },
    },
  };
}
