/**
 * GET /api/account/orders
 *
 * Buyer order history. Reads the signed-in buyer's own orders from the Supabase
 * commerce backend (RLS scopes rows to the Clerk `sub`, but we also filter by
 * clerk_user_id explicitly and use the service role for a stable read). Shopify
 * Admin remains a legacy path only when the selected backend is explicitly
 * Shopify.
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAuthEnabled } from "@/lib/auth/config";
import { getCommerceAdapter } from "@/lib/commerce";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import {
  isShopifyAdminConfigured,
  getOrdersByEmail,
} from "@/lib/server/shopify-admin";

export const runtime = "nodejs";

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status });

type OrderItemRow = {
  handle: string;
  title: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
};

type OrderRow = {
  id: string;
  display_number: number;
  status: string;
  total_inr: number;
  currency: string;
  created_at: string;
  completed_at: string | null;
  commerce_order_items: OrderItemRow[] | null;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rl = checkRateLimit(req, "account-orders", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const adapter = getCommerceAdapter();

  if (!isAuthEnabled) {
    return json({
      orders: [],
      count: 0,
      synced: false,
      backend: adapter.backend,
      message: "Buyer accounts need Clerk keys. WhatsApp and guest checkout remain available.",
    });
  }

  const user = await currentUser();

  if (!user || !user.primaryEmailAddress) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Supabase backend: return the buyer's real, paid/fulfilled orders.
  if (adapter.backend === "supabase") {
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return json({
        orders: [],
        count: 0,
        synced: false,
        backend: "supabase",
        message: "Order history is not configured.",
      });
    }

    const { data, error } = await supabase
      .from("commerce_orders")
      .select(
        "id,display_number,status,total_inr,currency,created_at,completed_at," +
          "commerce_order_items(handle,title,size,color,quantity,unit_price_inr,line_total_inr)",
      )
      .eq("clerk_user_id", user.id)
      .in("status", ["paid", "fulfilled", "pending_payment"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[orders] Supabase query failed:", error.message);
      return json({
        orders: [],
        count: 0,
        synced: true,
        backend: "supabase",
        error: "Failed to load orders.",
      });
    }

    const orders = (data as unknown as OrderRow[]).map((o) => ({
      id: o.id,
      number: o.display_number,
      status: o.status,
      total: Number(o.total_inr),
      currency: o.currency,
      createdAt: o.created_at,
      completedAt: o.completed_at,
      items: (o.commerce_order_items ?? []).map((it) => ({
        handle: it.handle,
        title: it.title,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        unitPrice: Number(it.unit_price_inr),
        lineTotal: Number(it.line_total_inr),
      })),
    }));

    return json({
      orders,
      count: orders.length,
      synced: true,
      backend: "supabase",
    });
  }

  if (adapter.backend !== "shopify") {
    return json({
      orders: [],
      count: 0,
      synced: false,
      backend: adapter.backend,
      message: "Order history is not available for the current commerce backend yet.",
    });
  }

  if (!isShopifyAdminConfigured()) {
    return json({
      orders: [],
      count: 0,
      synced: false,
      backend: "shopify",
      message: "Shopify Admin not configured.",
    });
  }

  try {
    const email = user.primaryEmailAddress.emailAddress;
    const orders = await getOrdersByEmail(email);

    return json({
      orders,
      count: orders.length,
      synced: true,
      backend: "shopify",
      legacy: true,
    });
  } catch (err) {
    console.error("[orders] Error fetching Shopify orders:", err);
    return json({
      orders: [],
      count: 0,
      synced: true,
      backend: "shopify",
      legacy: true,
      error: "Failed to fetch orders.",
    });
  }
}
