/**
 * GET /api/account/orders
 *
 * Commerce-aware account order history endpoint.
 * Medusa is the active Phase 2 backend, but real Medusa orders are only
 * available after Razorpay payment collection and order completion are wired.
 * Shopify Admin remains a legacy adapter only when the selected backend is
 * explicitly Shopify.
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAuthEnabled } from "@/lib/auth/config";
import { getCommerceAdapter } from "@/lib/commerce";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import {
  isShopifyAdminConfigured,
  getOrdersByEmail,
} from "@/lib/server/shopify-admin";

export const runtime = "nodejs";

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status });

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

  if (adapter.backend === "medusa") {
    return json({
      orders: [],
      count: 0,
      synced: false,
      backend: "medusa",
      message:
        "Medusa order history will activate after Razorpay payment collection and Medusa order completion are enabled.",
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
