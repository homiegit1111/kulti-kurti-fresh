/**
 * Admin orders API — list.
 *
 *   GET /api/admin/orders?status=paid
 *       → { orders: AdminOrder[] }  (newest first, with line items)
 *
 * Admin-gated + service-role read.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { guardAdminRead, serviceUnavailable } from "../products/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = new Set([
  "draft",
  "pending_payment",
  "paid",
  "cancelled",
  "fulfilled",
]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = checkRateLimit(req, "admin-orders-read", {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const gate = await guardAdminRead("orders:read");
  if (!gate.ok) return gate.response;

  const supabase = createServiceRoleClient();
  if (!supabase) return serviceUnavailable();

  const statusFilter = req.nextUrl.searchParams.get("status");

  let query = supabase
    .from("commerce_orders")
    .select(
      "id,display_number,clerk_user_id,status,source,buyer,currency," +
        "base_subtotal_inr,discount_percent,discount_amount_inr,total_inr,total_sets,total_pieces," +
        "payment_provider,payment_transaction_id,completed_at,created_at," +
        "commerce_order_items(id,handle,title,size,color,style_code,quantity,unit_price_inr,line_total_inr,pieces)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter && VALID_STATUS.has(statusFilter)) {
    query = query.eq("status", statusFilter);
  } else {
    // By default hide bare drafts (abandoned carts) from the ops view.
    query = query.neq("status", "draft");
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
