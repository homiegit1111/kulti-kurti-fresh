/**
 * GET /api/account/orders
 *
 * Returns Shopify order history for the signed-in Clerk user.
 * Uses Shopify Admin API (private token never exposed to browser).
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import {
  isShopifyAdminConfigured,
  getOrdersByEmail,
} from "@/lib/server/shopify-admin";

export const runtime = "nodejs";

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status });

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 30 reads / minute / IP (curbs order enumeration/scraping).
  const rl = checkRateLimit(req, "account-orders", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const user = await currentUser();

  if (!user || !user.primaryEmailAddress) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!isShopifyAdminConfigured()) {
    return json({
      orders: [],
      synced: false,
      message: "Shopify Admin not configured.",
    });
  }

  try {
    const email = user.primaryEmailAddress.emailAddress;
    const orders = await getOrdersByEmail(email);

    return json({ orders, count: orders.length, synced: true });
  } catch (err) {
    console.error("[orders] Error fetching Shopify orders:", err);
    return json({ orders: [], synced: true, error: "Failed to fetch orders." });
  }
}
