import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";
import { buildWholesaleCheckoutDraft } from "@/lib/commerce/checkout-draft";
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
  const result = buildWholesaleCheckoutDraft(checkoutBody, "medusa");

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
  if (adapter.backend !== "medusa") {
    return json(
      {
        ok: false,
        backend: adapter.backend,
        reason:
          "Medusa checkout is available only when NEXT_PUBLIC_COMMERCE_BACKEND=medusa and Medusa is configured.",
      },
      409,
    );
  }

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
  return json(
    {
      ok: session.ok,
      backend: adapter.backend,
      orderId: session.orderId,
      checkoutUrl: session.checkoutUrl,
      paymentUrl: session.paymentUrl,
      cart: session.cart,
      diagnostics: session.diagnostics,
      message: session.message,
      reason: session.reason,
    },
    session.ok ? 200 : 424,
  );
}
