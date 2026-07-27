/**
 * Admin single-order API — status transition.
 *
 *   PATCH /api/admin/orders/:id   { status: "fulfilled" | "cancelled" | ... }
 *
 * Admin-gated + service-role. Only a constrained set of transitions is allowed
 * so an admin can't, e.g., flip a paid order back to draft.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { allowedOrderTransitions } from "@/lib/commerce/order-transitions";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import {
  guardAdminMutation,
  recordAdminAudit,
  serviceUnavailable,
} from "../../products/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowed manual transitions (admin ops). Payment-driven transitions to 'paid'
// happen only in the checkout/payment flow, never here.
/**
 * The state machine now lives in src/lib/commerce/order-transitions.ts so the
 * admin UI reads the same list. It was duplicated, the copies had drifted, and
 * the UI was offering four transitions this route rejects with a 409.
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const limited = checkRateLimit(req, "admin-orders-write", {
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const mutationGate = await guardAdminMutation(req, "orders:write");
  if (!mutationGate.ok) return mutationGate.response;

  const supabase = createServiceRoleClient();
  if (!supabase) return serviceUnavailable();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing order id." }, { status: 400 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const next =
    typeof raw === "object" && raw !== null
      ? String((raw as Record<string, unknown>).status ?? "")
      : "";
  if (!next) {
    return NextResponse.json({ error: "A target status is required." }, { status: 400 });
  }

  const { data: current, error: readErr } = await supabase
    .from("commerce_orders")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (readErr || !current) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const allowed = allowedOrderTransitions(current.status as string);
  if (!allowed.some((candidate) => candidate === next)) {
    return NextResponse.json(
      {
        error: `Cannot move an order from "${current.status}" to "${next}".`,
      },
      { status: 409 },
    );
  }

  if (next === "cancelled") {
    const { data: cancelled, error: cancelError } = await supabase.rpc(
      "cancel_commerce_order",
      { p_order_id: id, p_reason: "cancelled_by_admin" },
    );
    if (cancelError || cancelled !== true) {
      return NextResponse.json({ error: "Could not cancel and release this order." }, { status: 409 });
    }
  } else {
    const patch: Record<string, unknown> = { status: next };
    if (next === "fulfilled") patch.completed_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("commerce_orders")
      .update(patch)
      .eq("id", id)
      .eq("status", current.status as string);
    if (updateError) {
      return NextResponse.json({ error: "Could not update order." }, { status: 500 });
    }
  }

  await recordAdminAudit(supabase, {
    actorUserId: mutationGate.userId,
    action: "order.status",
    entityType: "order",
    entityId: id,
    beforeState: { status: current.status },
    afterState: { status: next },
  });

  return NextResponse.json({ ok: true, id, status: next });
}
