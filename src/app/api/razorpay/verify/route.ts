import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayIntentToken } from "@/lib/payments/razorpay-intent";
import {
  fetchRazorpayPayment,
  reconcileRazorpayPayment,
} from "@/lib/payments/razorpay-api";
import { assessCommerceOrderFinalizationReadiness } from "@/lib/commerce/order-finalization";
import { getCommerceAdapter } from "@/lib/commerce";
import {
  findPaymentOrder,
  markPaymentOrderCompleted,
  markPaymentOrderFailed,
  recordCapturedPayment,
} from "@/lib/server/payment-orders";
import { markRecoveredByEmail } from "@/lib/server/abandoned-cart";
import {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getRazorpayReadiness,
} from "@/lib/payments/razorpay-config";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { verifyCheckoutSessionBinding } from "@/lib/server/checkout-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayVerifyBody = {
  razorpay_payment_id?: unknown;
  razorpay_order_id?: unknown;
  razorpay_signature?: unknown;
  commerceOrderId?: unknown;
  intentToken?: unknown;
  checkoutToken?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function safeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function isValidSignature({
  orderId,
  paymentId,
  signature,
  secret,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "razorpay-verify", { limit: 15, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await req.json().catch(() => ({}))) as RazorpayVerifyBody;
  const paymentId = safeString(body.razorpay_payment_id, 80);
  const orderId = safeString(body.razorpay_order_id, 80);
  const signature = safeString(body.razorpay_signature, 160);
  const commerceOrderId = safeString(body.commerceOrderId, 120);
  const intentToken = safeString(body.intentToken, 2000);
  const checkoutToken = safeString(body.checkoutToken, 2400);
  const keySecret = getRazorpayKeySecret();
  const keyId = getRazorpayKeyId();
  const readiness = getRazorpayReadiness();

  if (!paymentId || !orderId || !signature) {
    return json(
      {
        ok: false,
        verified: false,
        code: "MISSING_RAZORPAY_FIELDS",
        error: "Razorpay payment id, order id, and signature are required.",
      },
      400,
    );
  }

  if (!readiness.configured) {
    return json(
      {
        ok: false,
        verified: false,
        configured: false,
        readiness,
        code: "RAZORPAY_CREDENTIALS_MISSING",
        error: "Razorpay verification is not configured.",
      },
      501,
    );
  }

  if (!intentToken || !checkoutToken) {
    return json(
      {
        ok: false,
        verified: false,
        code: "CHECKOUT_SESSION_REQUIRED",
        error: "Razorpay checkout intent and checkout session are required.",
      },
      400,
    );
  }

  const intentResult = verifyRazorpayIntentToken(intentToken, keySecret);
  if (!intentResult.ok) {
    return json(
      {
        ok: false,
        verified: false,
        code: intentResult.code,
        error: intentResult.error,
      },
      400,
    );
  }

  if (intentResult.intent.orderId !== orderId) {
    return json(
      {
        ok: false,
        verified: false,
        code: "ORDER_INTENT_MISMATCH",
        error: "Razorpay order id does not match the checkout intent.",
      },
      400,
    );
  }

  if (
    commerceOrderId &&
    intentResult.intent.commerceOrderId &&
    intentResult.intent.commerceOrderId !== commerceOrderId
  ) {
    return json(
      {
        ok: false,
        verified: false,
        code: "COMMERCE_ORDER_INTENT_MISMATCH",
        error: "Commerce order id does not match the checkout intent.",
      },
      400,
    );
  }

  const resolvedCartId = intentResult.intent.commerceOrderId || commerceOrderId;
  if (!resolvedCartId) {
    return json(
      {
        ok: false,
        verified: false,
        code: "COMMERCE_ORDER_REQUIRED",
        error: "A valid Supabase order is required before Razorpay verification.",
      },
      400,
    );
  }

  const checkoutBinding = await verifyCheckoutSessionBinding({
    token: checkoutToken,
    orderId: resolvedCartId,
  });
  if (!checkoutBinding.ok) {
    return json(
      {
        ok: false,
        verified: false,
        code: checkoutBinding.code,
        error: checkoutBinding.error,
      },
      checkoutBinding.status,
    );
  }

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return json(
      {
        ok: false,
        verified: false,
        code: "INVALID_SIGNATURE_FORMAT",
        error: "Razorpay signature format is invalid.",
      },
      400,
    );
  }

  const verified = isValidSignature({
    orderId,
    paymentId,
    signature,
    secret: keySecret,
  });

  if (!verified) {
    return json(
      {
        ok: false,
        verified: false,
        code: "SIGNATURE_MISMATCH",
        error: "Razorpay payment signature could not be verified.",
      },
      400,
    );
  }

  let payment;
  try {
    payment = await fetchRazorpayPayment({ paymentId, keyId, keySecret });
  } catch (error) {
    return json(
      {
        ok: false,
        verified: true,
        captured: false,
        code: "RAZORPAY_PAYMENT_LOOKUP_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Could not fetch Razorpay payment status.",
      },
      502,
    );
  }

  const reconciliation = reconcileRazorpayPayment({
    payment,
    expectedOrderId: orderId,
    expectedAmount: intentResult.intent.amount,
    expectedCurrency: intentResult.intent.currency,
  });

  if (!reconciliation.ok) {
    return json(
      {
        ok: false,
        verified: true,
        captured: false,
        code: reconciliation.code,
        error: reconciliation.error,
        paymentStatus: payment.status,
        paymentCaptured: payment.captured ?? false,
        paymentId,
        orderId,
      },
      reconciliation.code === "RAZORPAY_PAYMENT_NOT_CAPTURED" ? 409 : 400,
    );
  }

  const amount = intentResult.intent.amount;
  const currency = intentResult.intent.currency;
  const receipt = intentResult.intent.receipt;

  const finalization = assessCommerceOrderFinalizationReadiness({
    paymentId,
    paymentOrderId: orderId,
    amount,
    currency,
    receipt,
    commerceOrderId: resolvedCartId,
    paymentStatus: payment.status || "",
    captured: true,
  });

  const baseResponse = {
    ok: true,
    verified: true,
    captured: true,
    paymentId,
    orderId,
    amount,
    currency,
    receipt,
    commerceOrderId: resolvedCartId,
    paymentStatus: payment.status,
    orderFinalization: finalization,
  };

  // Idempotency: if this captured payment already produced an order, return it
  // without touching the cart again (handles retries and double-submits).
  const existing = await findPaymentOrder(paymentId);
  if (existing?.status === "completed" && existing.commerceOrderId) {
    return json({
      ...baseResponse,
      orderCompleted: true,
      commerceOrderId: existing.commerceOrderId,
      commerceOrderNumber: existing.commerceOrderNumber ?? undefined,
      message: `Payment already completed as order ${existing.commerceOrderNumber ?? existing.commerceOrderId}.`,
    });
  }

  if (!finalization.ready) {
    return json({
      ...baseResponse,
      orderCompleted: false,
      message:
        "Razorpay payment is verified and captured. Medusa order completion is not enabled yet.",
    });
  }

  const adapter = getCommerceAdapter();
  if (!adapter.completePaidOrder) {
    return json({
      ...baseResponse,
      orderCompleted: false,
      message:
        "Razorpay payment is verified and captured. The active commerce backend does not support order completion.",
    });
  }

  const ledgerRecorded = await recordCapturedPayment({
    razorpayPaymentId: paymentId,
    razorpayOrderId: orderId,
    commerceOrderId: finalization.commerceOrderId,
    amount,
    currency,
    receipt,
  });
  if (!ledgerRecorded) {
    return json(
      {
        ...baseResponse,
        orderCompleted: false,
        code: "PAYMENT_LEDGER_UNAVAILABLE",
        message:
          "Payment was captured and is being reconciled. Please do not retry payment; we will confirm your order shortly.",
      },
      503,
    );
  }

  const completion = await adapter.completePaidOrder({
    cartId: finalization.commerceOrderId,
    paymentProvider: "razorpay",
    paymentId,
    paymentOrderId: orderId,
    amountPaise: amount,
    currency,
    clerkUserId: checkoutBinding.clerkUserId,
  });

  if (!completion.ok || !completion.orderId) {
    await markPaymentOrderFailed({
      razorpayPaymentId: paymentId,
      error: completion.reason || "Medusa order completion failed.",
    });
    // Payment IS captured — surface a clear recoverable state, not a hard 500.
    return json(
      {
        ...baseResponse,
        orderCompleted: false,
        code: "ORDER_COMPLETION_FAILED",
        reason: completion.reason,
        diagnostics: completion.diagnostics,
        message:
          "Payment was captured, but the order could not be finalized automatically. Our team will confirm your order — please keep your payment id.",
      },
      424,
    );
  }

  await markPaymentOrderCompleted({
    razorpayPaymentId: paymentId,
    commerceOrderId: completion.orderId,
    commerceOrderNumber: completion.displayId,
  });

  if (completion.buyerEmail) {
    await markRecoveredByEmail(completion.buyerEmail);
  }

  return json({
    ...baseResponse,
    orderCompleted: true,
    commerceOrderId: completion.orderId,
    commerceOrderNumber: completion.displayId,
    orderStatus: completion.status,
    orderPaymentStatus: completion.paymentStatus,
    orderTotal: completion.total,
    orderCurrency: completion.currencyCode,
    message: completion.message || "Payment verified and order placed.",
  });
}
