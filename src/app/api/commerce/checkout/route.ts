import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";
import { buildWholesaleCheckoutDraft } from "@/lib/commerce/checkout-draft";
import {
  loadCurrentWholesaleBuyer,
  mergeCheckoutBodyWithWholesaleBuyer,
} from "@/lib/server/wholesale-profile";
import {
  createCheckoutSessionToken,
  getVerifiedClerkUserId,
} from "@/lib/server/checkout-session";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "commerce-checkout", { limit: 15, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const profileBuyer = await loadCurrentWholesaleBuyer();
  const checkoutBody = mergeCheckoutBodyWithWholesaleBuyer(body, profileBuyer);
  const clerkUserId = await getVerifiedClerkUserId();
  if (!clerkUserId) {
    return json(
      { ok: false, code: "AUTH_REQUIRED", error: "Sign in before creating a wholesale order." },
      401,
    );
  }
  const checkoutIdempotencyKey =
    typeof body.checkoutIdempotencyKey === "string"
      ? body.checkoutIdempotencyKey.trim()
      : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutIdempotencyKey)) {
    return json(
      { ok: false, code: "CHECKOUT_KEY_REQUIRED", error: "Restart checkout and try again." },
      400,
    );
  }
  const result = await buildWholesaleCheckoutDraft(checkoutBody, "razorpay", {
    clerkUserId,
    checkoutIdempotencyKey,
  });

  if (!result.ok) {
    return json(
      {
        ok: false,
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

  const adapter = getCommerceAdapter();
  if (!adapter.createCheckoutSession) {
    return json(
      {
        ok: false,
        backend: adapter.backend,
        reason: "The selected commerce adapter does not support checkout sessions.",
      },
      501,
    );
  }

  const session = await adapter.createCheckoutSession(result.draft.commerceDraft);
  const checkoutToken = session.orderId
    ? createCheckoutSessionToken({
        orderId: session.orderId,
        clerkUserId,
        createdAt: Date.now(),
      })
    : null;

  // A Supabase order must have a verifiable capability before it can ever be
  // passed to a payment provider or manual completion endpoint.
  if (session.ok && adapter.backend === "supabase" && !checkoutToken) {
    return json(
      {
        ok: false,
        backend: adapter.backend,
        reason: "Checkout security is not configured. Please use WhatsApp while we finish setup.",
      },
      503,
    );
  }

  return json(
    {
      ok: session.ok,
      backend: adapter.backend,
      orderId: session.orderId,
      checkoutUrl: session.checkoutUrl,
      paymentUrl: session.paymentUrl,
      cart: session.cart,
      checkoutToken: checkoutToken ?? undefined,
      diagnostics: session.diagnostics,
      message: session.message,
      reason: session.reason,
    },
    session.ok ? 200 : 424,
  );
}
