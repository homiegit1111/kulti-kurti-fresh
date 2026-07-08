import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const cartId =
    typeof body.cartId === "string" ? body.cartId.trim().slice(0, 120) : "";

  if (!cartId) {
    return json({ ok: false, code: "CART_ID_REQUIRED", reason: "A Medusa cart id is required." }, 400);
  }

  const adapter = getCommerceAdapter();
  if (adapter.backend !== "medusa" || !adapter.completeManualOrder) {
    return json(
      {
        ok: false,
        backend: adapter.backend,
        reason:
          "Manual order completion is available only when NEXT_PUBLIC_COMMERCE_BACKEND=medusa.",
      },
      409,
    );
  }

  const result = await adapter.completeManualOrder(cartId);
  return json(
    {
      ok: result.ok,
      backend: adapter.backend,
      cartId: result.cartId,
      orderId: result.orderId,
      displayId: result.displayId,
      status: result.status,
      paymentStatus: result.paymentStatus,
      total: result.total,
      currencyCode: result.currencyCode,
      message: result.message,
      reason: result.reason,
      diagnostics: result.diagnostics,
    },
    result.ok ? 200 : 424,
  );
}
