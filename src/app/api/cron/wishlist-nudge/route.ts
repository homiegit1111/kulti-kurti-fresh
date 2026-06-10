import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/server/cron-auth";
import { runWishlistNudgeSweep } from "@/lib/server/wishlist-nudge";

export const runtime = "nodejs";
// Never cache — scheduled, side-effecting endpoint.
export const dynamic = "force-dynamic";

/**
 * Wishlist nudge sweep. Schedule daily, e.g. vercel.json:
 *   { "crons": [{ "path": "/api/cron/wishlist-nudge", "schedule": "0 9 * * *" }] }
 *
 * Protected by CRON_SECRET (see requireCronSecret).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const result = await runWishlistNudgeSweep();
  return NextResponse.json({ ok: true, ...result });
}
