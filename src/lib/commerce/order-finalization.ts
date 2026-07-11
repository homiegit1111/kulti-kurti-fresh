export type VerifiedPaymentForFinalization = {
  paymentId: string;
  paymentOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  commerceOrderId?: string;
  paymentStatus: string;
  captured: true;
};

export type CommerceOrderFinalizationReadiness =
  | {
      ready: false;
      status: "blocked";
      code: "COMMERCE_ORDER_REQUIRED" | "PAYMENT_CAPTURE_REQUIRED";
      message: string;
    }
  | {
      ready: false;
      status: "deferred";
      code: "COMMERCE_ORDER_COMPLETION_DEFERRED";
      commerceOrderId: string;
      message: string;
      nextStep: string;
    }
  | {
      ready: true;
      status: "ready";
      code: "COMMERCE_ORDER_COMPLETION_READY";
      commerceOrderId: string;
      message: string;
    };

/**
 * Decide whether a captured payment can be finalized into a commerce order.
 *
 * `commerceOrderId` is the opaque commerce order id (a Supabase
 * commerce_orders.id) threaded under the legacy field name. Completion requires
 * a captured payment and an order id. `COMMERCE_ORDER_COMPLETION_DISABLED=true`
 * is an optional kill-switch (defaults enabled) so completion can be paused in
 * production without a redeploy; the legacy MEDUSA_ORDER_COMPLETION_ENABLED is
 * still honored as an explicit enable for backward compatibility.
 */
export function assessCommerceOrderFinalizationReadiness(
  payment: VerifiedPaymentForFinalization,
): CommerceOrderFinalizationReadiness {
  if (payment.paymentStatus !== "captured" || payment.captured !== true) {
    return {
      ready: false,
      status: "blocked",
      code: "PAYMENT_CAPTURE_REQUIRED",
      message: "A captured payment is required before order completion.",
    };
  }

  if (!payment.commerceOrderId) {
    return {
      ready: false,
      status: "blocked",
      code: "COMMERCE_ORDER_REQUIRED",
      message: "An order id is required before order completion.",
    };
  }

  // Kill-switch: only blocks when explicitly disabled. Completion is on by
  // default now that the Supabase backend is the primary path.
  const explicitlyDisabled =
    process.env.COMMERCE_ORDER_COMPLETION_DISABLED === "true";

  if (explicitlyDisabled) {
    return {
      ready: false,
      status: "deferred",
      code: "COMMERCE_ORDER_COMPLETION_DEFERRED",
      commerceOrderId: payment.commerceOrderId,
      message:
        "Payment is verified and captured, but order completion is temporarily disabled (COMMERCE_ORDER_COMPLETION_DISABLED=true).",
      nextStep:
        "Unset COMMERCE_ORDER_COMPLETION_DISABLED to resume automatic order completion.",
    };
  }

  return {
    ready: true,
    status: "ready",
    code: "COMMERCE_ORDER_COMPLETION_READY",
    commerceOrderId: payment.commerceOrderId,
    message:
      "Payment is captured and an order is linked. Ready to complete the order.",
  };
}
