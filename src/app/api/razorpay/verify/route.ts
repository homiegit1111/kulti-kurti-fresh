import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayIntentToken } from "@/lib/payments/razorpay-intent";
import {
  fetchRazorpayPayment,
  reconcileRazorpayPayment,
} from "@/lib/payments/razorpay-api";
import { assessMedusaOrderFinalizationReadiness } from "@/lib/commerce/order-finalization";
import {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getRazorpayReadiness,
} from "@/lib/payments/razorpay-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayVerifyBody = {
  razorpay_payment_id?: unknown;
  razorpay_order_id?: unknown;
  razorpay_signature?: unknown;
  medusaCartId?: unknown;
  intentToken?: unknown;
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
  const body = (await req.json().catch(() => ({}))) as RazorpayVerifyBody;
  const paymentId = safeString(body.razorpay_payment_id, 80);
  const orderId = safeString(body.razorpay_order_id, 80);
  const signature = safeString(body.razorpay_signature, 160);
  const medusaCartId = safeString(body.medusaCartId, 120);
  const intentToken = safeString(body.intentToken, 2000);
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

  if (!intentToken) {
    return json(
      {
        ok: false,
        verified: false,
        code: "CHECKOUT_INTENT_REQUIRED",
        error: "Razorpay checkout intent token is required.",
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
    medusaCartId &&
    intentResult.intent.medusaCartId &&
    intentResult.intent.medusaCartId !== medusaCartId
  ) {
    return json(
      {
        ok: false,
        verified: false,
        code: "MEDUSA_CART_INTENT_MISMATCH",
        error: "Medusa cart id does not match the checkout intent.",
      },
      400,
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

  const finalization = assessMedusaOrderFinalizationReadiness({
    paymentId,
    paymentOrderId: orderId,
    amount: intentResult.intent.amount,
    currency: intentResult.intent.currency,
    receipt: intentResult.intent.receipt,
    medusaCartId: intentResult.intent.medusaCartId || medusaCartId || undefined,
    paymentStatus: payment.status || "",
    captured: true,
  });

  return json({
    ok: true,
    verified: true,
    captured: true,
    paymentId,
    orderId,
    amount: intentResult.intent.amount,
    currency: intentResult.intent.currency,
    receipt: intentResult.intent.receipt,
    medusaCartId: intentResult.intent.medusaCartId || medusaCartId || undefined,
    paymentStatus: payment.status,
    orderFinalization: finalization,
    message:
      "Razorpay payment is verified and captured. Medusa order completion will run after payment collection wiring is enabled.",
  });
}
