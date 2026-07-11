import type { MockProduct } from "@/lib/shopify";

export type CommerceBackend = "mock" | "shopify" | "supabase";

export type CommerceProduct = MockProduct & {
  /** Authoritative per-variant wholesale set prices, when the backend exposes them. */
  variantPrices?: Record<string, number>;
};

export interface CommerceCollection {
  id: string;
  title: string;
  handle: string;
  image: string;
  itemCount: number;
  description: string;
}

export interface CommerceCartLine {
  productId: string;
  variantId?: string;
  title: string;
  handle: string;
  quantity: number; // wholesale sets
  unitPrice: number; // wholesale set price
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CommerceBuyer {
  email?: string;
  name?: string;
  businessName?: string;
  businessType?: string;
  city?: string;
  phone?: string;
  gstin?: string;
  buyerReference?: string;
  accountSource?: "anonymous_checkout" | "checkout_form" | "wholesale_profile";
}

export interface CommerceCheckoutDraft {
  lines: CommerceCartLine[];
  buyer?: CommerceBuyer;
  /** Verified on the server from Clerk auth; never read from buyerReference. */
  clerkUserId?: string | null;
  currencyCode?: string;
  /** UUID reused by browser retries of the same cart. */
  checkoutIdempotencyKey?: string;
  source: "razorpay" | "phonepe" | "whatsapp";
  /**
   * Wholesale tier discount encoded as a Medusa promotion code (e.g.
   * WHOLESALE5). Applied to the Medusa cart so the cart total — not a
   * client-supplied number — is the authoritative discounted amount. Null when
   * the tier has no discount (0%).
   */
  tierPromoCode?: string | null;
}

export interface CommerceCheckoutCartSummary {
  id: string;
  lineCount: number;
  totalQuantity: number;
  subtotal?: number;
  total?: number;
  currencyCode?: string;
  customerId?: string;
}

export interface CommerceCheckoutResult {
  ok: boolean;
  orderId?: string;
  paymentUrl?: string;
  checkoutUrl?: string;
  message?: string;
  reason?: string;
  cart?: CommerceCheckoutCartSummary;
  diagnostics?: Record<string, string | number | boolean | null>;
}

export interface CommerceOrderCompletionResult {
  ok: boolean;
  cartId: string;
  orderId?: string;
  displayId?: number;
  status?: string;
  paymentStatus?: string;
  total?: number;
  currencyCode?: string;
  buyerEmail?: string;
  message?: string;
  reason?: string;
  diagnostics?: Record<string, string | number | boolean | null>;
}

export interface CommercePaidOrderInput {
  cartId: string;
  paymentProvider: "razorpay" | "phonepe";
  paymentId: string;
  paymentOrderId: string;
  amountPaise: number;
  currency: string;
  /** Present for browser-authorized completion; omitted only for trusted webhooks. */
  clerkUserId?: string | null;
}

export type CommercePaymentAttemptResult =
  | {
      ok: true;
      attemptId: string;
      receipt: string;
      amountPaise: number;
      currency: string;
      expiresAt: string;
      providerOrderId?: string;
    }
  | { ok: false; reason: string };

export interface ProductQuery {
  limit?: number;
  category?: string;
}

export interface CommerceAdapter {
  backend: CommerceBackend;
  getProducts(input?: ProductQuery): Promise<CommerceProduct[]>;
  getProductByHandle(handle: string): Promise<CommerceProduct | null>;
  getCollections(): Promise<CommerceCollection[]>;
  getProductsByCollection(handle: string, limit?: number): Promise<CommerceProduct[]>;
  searchProducts(query: string): Promise<CommerceProduct[]>;
  createCheckoutSession?(
    draft: CommerceCheckoutDraft,
  ): Promise<CommerceCheckoutResult>;
  completeManualOrder?(
    cartId: string,
    clerkUserId?: string | null,
  ): Promise<CommerceOrderCompletionResult>;
  completePaidOrder?(
    input: CommercePaidOrderInput,
  ): Promise<CommerceOrderCompletionResult>;
  /**
   * Read the authoritative total (in minor units / paise) of an existing cart,
   * with all discounts applied. Used to charge exactly what Medusa will
   * reconcile against, eliminating client/server total drift. Returns null if
   * the cart can't be read or the backend doesn't support it.
   */
  getCartChargeAmount?(
    cartId: string,
  ): Promise<{ amountPaise: number; currency: string } | null>;
  /** Atomically claim a draft before an external payment order is created. */
  beginPaymentAttempt?(
    cartId: string,
    idempotencyKey: string,
  ): Promise<CommercePaymentAttemptResult>;
  /** Persist the provider order id after the gateway accepts the payment order. */
  attachPaymentOrder?(
    attemptId: string,
    providerOrderId: string,
  ): Promise<boolean>;
  /** Release a claimed attempt only when no provider order was created. */
  releasePaymentAttempt?(cartId: string): Promise<void>;
}
