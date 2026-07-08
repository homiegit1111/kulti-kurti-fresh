import type { MockProduct } from "@/lib/shopify";

export type CommerceBackend = "mock" | "shopify" | "medusa";

export type CommerceProduct = MockProduct;

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
  currencyCode?: string;
  source: "razorpay" | "whatsapp" | "medusa";
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
  message?: string;
  reason?: string;
  diagnostics?: Record<string, string | number | boolean | null>;
}

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
  ): Promise<CommerceOrderCompletionResult>;
}
