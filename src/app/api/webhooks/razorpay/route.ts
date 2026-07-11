import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";
import { fetchRazorpayPayment, reconcileRazorpayPayment } from "@/lib/payments/razorpay-api";
import { getRazorpayKeyId, getRazorpayKeySecret, getRazorpayWebhookSecret } from "@/lib/payments/razorpay-config";
import { markPaymentOrderCompleted, recordCapturedPayment } from "@/lib/server/payment-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayEntity = { id?: unknown; amount?: unknown; currency?: unknown; order_id?: unknown; notes?: unknown };
type RazorpayWebhookPayload = { payload?: { payment?: { entity?: RazorpayEntity }; order?: { entity?: RazorpayEntity } } };

function safeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function commerceOrderId(payload: RazorpayWebhookPayload): string {
  const paymentNotes = payload.payload?.payment?.entity?.notes;
  const orderNotes = payload.payload?.order?.entity?.notes;
  const notes = paymentNotes && typeof paymentNotes === "object"
    ? paymentNotes as Record<string, unknown>
    : orderNotes && typeof orderNotes === "object"
      ? orderNotes as Record<string, unknown>
      : {};
  return safeString(notes.commerce_order_id, 120);
}

function hasValidSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
  const webhookSecret = getRazorpayWebhookSecret();
  const signature = req.headers.get("x-razorpay-signature")?.trim() ?? "";
  const rawBody = await req.text();
  if (!hasValidSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Invalid Razorpay webhook signature." }, { status: 401 });
  }
  if (req.headers.get("x-razorpay-event") !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Razorpay webhook payload." }, { status: 400 });
  }

  const paymentId = safeString(payload.payload?.payment?.entity?.id, 80);
  const providerOrderId = safeString(payload.payload?.payment?.entity?.order_id ?? payload.payload?.order?.entity?.id, 80);
  const orderId = commerceOrderId(payload);
  if (!paymentId || !providerOrderId || !orderId) {
    return NextResponse.json({ ok: false, error: "Webhook lacks a linked payment or commerce order." }, { status: 400 });
  }

  const adapter = getCommerceAdapter();
  if (adapter.backend !== "supabase" || !adapter.getCartChargeAmount || !adapter.completePaidOrder) {
    return NextResponse.json({ ok: false, error: "Supabase commerce is unavailable." }, { status: 503 });
  }
  const expected = await adapter.getCartChargeAmount(orderId);
  if (!expected) return NextResponse.json({ ok: false, error: "Commerce order is not payable." }, { status: 409 });

  let payment;
  try {
    payment = await fetchRazorpayPayment({ paymentId, keyId: getRazorpayKeyId(), keySecret: getRazorpayKeySecret() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load Razorpay payment." }, { status: 502 });
  }
  const reconciliation = reconcileRazorpayPayment({ payment, expectedOrderId: providerOrderId, expectedAmount: expected.amountPaise, expectedCurrency: expected.currency });
  if (!reconciliation.ok) {
    return NextResponse.json({ ok: false, code: reconciliation.code, error: reconciliation.error }, { status: 409 });
  }

  const ledgerRecorded = await recordCapturedPayment({
    razorpayPaymentId: paymentId,
    razorpayOrderId: providerOrderId,
    commerceOrderId: orderId,
    amount: expected.amountPaise,
    currency: expected.currency,
  });
  if (!ledgerRecorded) {
    return NextResponse.json({ ok: false, error: "Payment ledger is unavailable." }, { status: 503 });
  }
  if (process.env.COMMERCE_ORDER_COMPLETION_DISABLED === "true") {
    return NextResponse.json(
      { ok: true, deferred: true, message: "Payment captured; order completion is paused." },
      { status: 202 },
    );
  }
  const completion = await adapter.completePaidOrder({ cartId: orderId, paymentProvider: "razorpay", paymentId, paymentOrderId: providerOrderId, amountPaise: expected.amountPaise, currency: expected.currency });
  if (!completion.ok || !completion.orderId) {
    return NextResponse.json({ ok: false, error: completion.reason ?? "Could not finalize the commerce order." }, { status: 409 });
  }
  await markPaymentOrderCompleted({
    razorpayPaymentId: paymentId,
    commerceOrderId: completion.orderId,
    commerceOrderNumber: completion.displayId,
  });
  return NextResponse.json({ ok: true, orderId: completion.orderId, displayId: completion.displayId });
}
