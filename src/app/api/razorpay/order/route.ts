import { NextRequest, NextResponse } from "next/server";
import { buildWholesaleCheckoutDraft } from "@/lib/commerce/checkout-draft";
import {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getRazorpayReadiness,
} from "@/lib/payments/razorpay-config";
import { createRazorpayIntentToken } from "@/lib/payments/razorpay-intent";
import {
  loadCurrentWholesaleBuyer,
  mergeCheckoutBodyWithWholesaleBuyer,
} from "@/lib/server/wholesale-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const profileBuyer = await loadCurrentWholesaleBuyer();
  const checkoutBody = mergeCheckoutBodyWithWholesaleBuyer(body, profileBuyer);
  const result = buildWholesaleCheckoutDraft(checkoutBody, "razorpay");

  if (!result.ok) {
    return json(
      {
        error: result.error,
        code: result.code,
        moq: result.moq,
        remainingSets: result.remainingSets,
        totalSets: result.totalSets,
        minimumSets: result.minimumSets,
      },
      result.status,
    );
  }

  const { amountPaise, notes, receipt, totals } = result.draft;
  const medusaCartId =
    typeof body.medusaCartId === "string" ? body.medusaCartId.slice(0, 120) : "";
  const orderNotes = {
    ...notes,
    ...(medusaCartId ? { medusa_cart_id: medusaCartId } : {}),
  };
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const readiness = getRazorpayReadiness();

  if (!readiness.configured) {
    return json({
      configured: false,
      message: "Razorpay is not configured. Confirm on WhatsApp to receive a payment link.",
      readiness,
      amount: amountPaise,
      currency: "INR",
      receipt,
      totals,
      medusaCartId: medusaCartId || undefined,
    });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: orderNotes,
    }),
    cache: "no-store",
  });

  const razorpay = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    return json(
      {
        error: "Could not create Razorpay order. Please confirm on WhatsApp.",
        detail:
          typeof razorpay.error === "object" && razorpay.error
            ? (razorpay.error as Record<string, unknown>).description
            : undefined,
      },
      502,
    );
  }

  const orderId = typeof razorpay.id === "string" ? razorpay.id : "";
  const amount = typeof razorpay.amount === "number" ? razorpay.amount : amountPaise;
  const currency = typeof razorpay.currency === "string" ? razorpay.currency : "INR";

  if (!orderId) {
    return json(
      {
        error: "Razorpay order response is missing an order id. Please confirm on WhatsApp.",
      },
      502,
    );
  }

  const intentToken = createRazorpayIntentToken(
    {
      orderId,
      amount,
      currency,
      receipt,
      ...(medusaCartId ? { medusaCartId } : {}),
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
    receipt,
    totals,
    intentToken,
    medusaCartId: medusaCartId || undefined,
  });
}
