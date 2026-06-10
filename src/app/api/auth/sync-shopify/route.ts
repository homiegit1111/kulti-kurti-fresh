import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureShopifyCustomer, isShopifyAdminConfigured } from "@/lib/server/shopify-admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status });

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 20 syncs / minute / IP.
  const rl = checkRateLimit(req, "sync-shopify", {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const { userId } = await auth();

  if (!userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const user = await currentUser();

  if (!user || !user.primaryEmailAddress) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!isShopifyAdminConfigured()) {
    return json({
      configured: false,
      message: "Shopify Admin API is not configured on the server.",
    });
  }

  try {
    const customer = await ensureShopifyCustomer({
      email: user.primaryEmailAddress.emailAddress,
      supabaseUserId: userId, // Keep same key name for backwards compatibility, or change to clerkUserId
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    });

    return json({
      configured: true,
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
    });
  } catch (err) {
    console.error("[sync-shopify] Error syncing customer:", err);
    return json({ error: "Failed to sync commerce account." }, 500);
  }
}
