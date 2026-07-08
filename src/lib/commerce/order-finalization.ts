export type VerifiedPaymentForFinalization = {
  paymentId: string;
  paymentOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  medusaCartId?: string;
  paymentStatus: string;
  captured: true;
};

export type MedusaOrderFinalizationReadiness =
  | {
      ready: false;
      status: "blocked";
      code: "MEDUSA_CART_REQUIRED" | "PAYMENT_CAPTURE_REQUIRED";
      message: string;
    }
  | {
      ready: false;
      status: "deferred";
      code: "MEDUSA_ORDER_COMPLETION_DEFERRED";
      medusaCartId: string;
      message: string;
      nextStep: string;
    }
  | {
      ready: false;
      status: "blocked";
      code: "MEDUSA_ORDER_COMPLETION_NOT_IMPLEMENTED";
      medusaCartId: string;
      message: string;
    };

export function assessMedusaOrderFinalizationReadiness(
  payment: VerifiedPaymentForFinalization,
): MedusaOrderFinalizationReadiness {
  if (payment.paymentStatus !== "captured" || payment.captured !== true) {
    return {
      ready: false,
      status: "blocked",
      code: "PAYMENT_CAPTURE_REQUIRED",
      message: "A captured Razorpay payment is required before Medusa order completion.",
    };
  }

  if (!payment.medusaCartId) {
    return {
      ready: false,
      status: "blocked",
      code: "MEDUSA_CART_REQUIRED",
      message: "A Medusa cart id is required before Medusa order completion.",
    };
  }

  if (process.env.MEDUSA_ORDER_COMPLETION_ENABLED === "true") {
    return {
      ready: false,
      status: "blocked",
      code: "MEDUSA_ORDER_COMPLETION_NOT_IMPLEMENTED",
      medusaCartId: payment.medusaCartId,
      message:
        "MEDUSA_ORDER_COMPLETION_ENABLED is true, but the Medusa order completion implementation is not installed yet.",
    };
  }

  return {
    ready: false,
    status: "deferred",
    code: "MEDUSA_ORDER_COMPLETION_DEFERRED",
    medusaCartId: payment.medusaCartId,
    message:
      "Payment is verified and captured, but Medusa order completion is intentionally deferred until the final payment cycle.",
    nextStep:
      "After live Razorpay testing, replace this boundary with an idempotent Medusa payment/order completion workflow.",
  };
}
