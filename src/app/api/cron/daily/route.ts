import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/server/cron-auth";
import { runAbandonedCartSweep } from "@/lib/server/abandoned-cart";
import { runWishlistNudgeSweep } from "@/lib/server/wishlist-nudge";
import { runStockAlertSweep } from "@/lib/server/stock-alerts";

export const runtime = "nodejs";
// Never cache — scheduled, side-effecting endpoint.
export const dynamic = "force-dynamic";
// Three sequential sweeps can exceed the default budget on slow days.
export const maxDuration = 60;

/**
 * Consolidated daily lifecycle sweep — runs all three jobs sequentially:
 *   1. abandoned-cart recovery
 *   2. wishlist nudges
 *   3. back-in-stock alerts
 *
 * Why one endpoint: Vercel Hobby allows max 2 cron jobs per project, so the
 * three individual schedules in vercel.json would fail deployment. This route
 * keeps everything on a single daily cron slot. The individual routes
 * (/api/cron/abandoned-cart, /wishlist-nudge, /stock-alerts) still exist for
 * manual runs or external schedulers.
 *
 * Each sweep is error-isolated: one failing doesn't block the others.
 * Protected by CRON_SECRET (see requireCronSecret).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const sweeps = [
    { name: "abandonedCart", run: runAbandonedCartSweep },
    { name: "wishlistNudge", run: runWishlistNudgeSweep },
    { name: "stockAlerts", run: runStockAlertSweep },
  ] as const;

  const results: Record<string, unknown> = {};
  let failures = 0;

  for (const sweep of sweeps) {
    try {
      results[sweep.name] = await sweep.run();
    } catch (error) {
      failures += 1;
      results[sweep.name] = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  return NextResponse.json(
    { ok: failures === 0, results },
    { status: failures === 0 ? 200 : 500 },
  );
}
