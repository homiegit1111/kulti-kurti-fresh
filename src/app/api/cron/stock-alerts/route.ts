import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/server/cron-auth";
import { runStockAlertSweep } from "@/lib/server/stock-alerts";

export const runtime = "nodejs";
// Never cache — scheduled, side-effecting endpoint.
export const dynamic = "force-dynamic";

/**
 * Back-in-stock fulfilment sweep. Schedule a few times a day — see
 * vercel.json (every 4 hours).
 *
 * Protected by CRON_SECRET (see requireCronSecret).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const result = await runStockAlertSweep();
  return NextResponse.json({ ok: true, ...result });
}
