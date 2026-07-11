import { getCommerceAdapter } from "@/lib/commerce";

export type ChargeAmountResolution =
  | { ok: true; amountPaise: number; currency: string; source: "backend" | "draft" }
  | { ok: false; reason: string; diagnostics?: Record<string, number | string> };

/**
 * Decide the authoritative amount to charge (in paise).
 *
 * The commerce backend (Supabase) snapshots the wholesale total into the order
 * row at creation, recomputed server-side from the catalog — so the order total
 * is the single source of truth for both the charge and later payment
 * reconciliation (completePaidOrder compares the captured amount against it).
 *
 * - No commerce order id (fallback/WhatsApp path): trust the server-repriced
 *   draft amount — there is no persisted order to reconcile against.
 * - Order id present: the persisted order total wins. If it diverges from the
 *   draft amount beyond a 1-rupee rounding tolerance, fail closed rather than
 *   charge an amount the order can't reconcile.
 *
 * `commerceOrderId` is the opaque id returned by createCheckoutSession (a
 * Supabase commerce_orders.id). It is threaded through the payment routes under
 * directly through the payment routes.
 */
export async function resolveCommerceOrderChargeAmount(
  commerceOrderId: string,
  draftAmountPaise: number,
): Promise<ChargeAmountResolution> {
  if (!commerceOrderId) {
    return {
      ok: true,
      amountPaise: draftAmountPaise,
      currency: "INR",
      source: "draft",
    };
  }

  const adapter = getCommerceAdapter();
  if (!adapter.getCartChargeAmount) {
    // An order id was supplied but the active backend can't price it — the draft
    // amount is the only number we have.
    return {
      ok: true,
      amountPaise: draftAmountPaise,
      currency: "INR",
      source: "draft",
    };
  }

  const backend = await adapter.getCartChargeAmount(commerceOrderId);
  if (!backend) {
    return {
      ok: false,
      reason:
        "Could not read the order total to price this checkout. Please retry or confirm on WhatsApp.",
    };
  }

  // Tolerate at most 1 rupee (100 paise) of rounding drift between the client
  // draft and the backend's snapshotted total. Anything larger means the
  // discount or line pricing genuinely disagree — hold the order.
  const drift = Math.abs(backend.amountPaise - draftAmountPaise);
  if (drift > 100) {
    return {
      ok: false,
      reason:
        "Wholesale pricing could not be confirmed against the catalog. Please refresh your cart and try again.",
      diagnostics: {
        backend_amount_paise: backend.amountPaise,
        draft_amount_paise: draftAmountPaise,
        drift_paise: drift,
      },
    };
  }

  return {
    ok: true,
    amountPaise: backend.amountPaise,
    currency: backend.currency,
    source: "backend",
  };
}
