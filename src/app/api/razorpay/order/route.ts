import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";
import {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getRazorpayReadiness,
} from "@/lib/payments/razorpay-config";
import { createRazorpayIntentToken } from "@/lib/payments/razorpay-intent";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { verifyCheckoutSessionBinding } from "@/lib/server/checkout-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "razorpay-order", { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const adapter = getCommerceAdapter();
  if (adapter.backend !== "supabase") {
    return json(
      { configured: false, error: "Online payments are unavailable until the Supabase commerce backend is configured." },
      503,
    );
  }
  const readiness = getRazorpayReadiness();
  if (!readiness.configured) {
    return json({
      configured: false,
      message: "Razorpay is not configured. Confirm on WhatsApp to receive a payment link.",
      readiness,
    });
  }

  const commerceOrderId =
    typeof body.commerceOrderId === "string" ? body.commerceOrderId.trim().slice(0, 120) : "";
  const checkoutToken =
    typeof body.checkoutToken === "string" ? body.checkoutToken.trim().slice(0, 2400) : "";
  if (!commerceOrderId || !checkoutToken) {
    return json(
      { configured: false, error: "A valid Supabase checkout session is required before payment." },
      400,
    );
  }
  const paymentIdempotencyKey =
    typeof body.checkoutIdempotencyKey === "string"
      ? body.checkoutIdempotencyKey.trim()
      : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentIdempotencyKey)) {
    return json({ configured: false, error: "Restart checkout and try again." }, 400);
  }
  const binding = await verifyCheckoutSessionBinding({
    token: checkoutToken,
    orderId: commerceOrderId,
  });
  if (!binding.ok) return json({ configured: false, error: binding.error, code: binding.code }, binding.status);

  if (!adapter.beginPaymentAttempt || !adapter.attachPaymentOrder || !adapter.releasePaymentAttempt) {
    return json({ error: "Secure payment attempts are unavailable for the selected backend." }, 503);
  }
  const attempt = await adapter.beginPaymentAttempt(commerceOrderId, paymentIdempotencyKey);
  if (!attempt.ok) return json({ error: attempt.reason }, 409);
  const orderNotes = {
    commerce_order_id: commerceOrderId,
    commerce_payment_attempt_id: attempt.attemptId,
  };
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  let orderId = attempt.providerOrderId ?? "";
  let amount = attempt.amountPaise;
  let currency = attempt.currency;
  if (!orderId) {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: attempt.amountPaise,
        currency: attempt.currency,
        receipt: attempt.receipt,
        notes: orderNotes,
      }),
      cache: "no-store",
    });
    const razorpay = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      await adapter.releasePaymentAttempt(commerceOrderId);
      return json({ error: "Could not create Razorpay order." }, 502);
    }
    orderId = typeof razorpay.id === "string" ? razorpay.id : "";
    amount = typeof razorpay.amount === "number" ? razorpay.amount : attempt.amountPaise;
    currency = typeof razorpay.currency === "string" ? razorpay.currency : attempt.currency;
  }

  if (!orderId || !(await adapter.attachPaymentOrder(attempt.attemptId, orderId))) {
    return json(
      {
        error:
          "Your Razorpay order was created but could not be recorded safely. Do not pay again; contact us for confirmation.",
      },
      503,
    );
  }

  const intentToken = createRazorpayIntentToken(
    {
      orderId,
      amount,
      currency,
      receipt: attempt.receipt,
      commerceOrderId,
      createdAt: Date.now(),
    },
    keySecret,
  );

  return json({
    configured: true,
    keyId,
    orderId,
    amount,
    currency,
    receipt: attempt.receipt,
    intentToken,
    commerceOrderId,
    checkoutToken,
  });
}
