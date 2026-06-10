import { NextRequest, NextResponse } from "next/server";
import { runAbandonedCartSweep } from "@/lib/server/abandoned-cart";

export const runtime = "nodejs";
// Never cache — this is a scheduled side-effecting endpoint.
export const dynamic = "force-dynamic";

/**
 * Abandoned-cart recovery sweep. Run on a schedule (e.g. Vercel Cron hourly):
 *
 *   vercel.json →
 *   { "crons": [{ "path": "/api/cron/abandoned-cart", "schedule": "0 * * * *" }] }
 *
 * Protected by CRON_SECRET. The scheduler must present it as either:
 *   • Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this), or
 *   • ?secret=<CRON_SECRET>
 *
 * When CRON_SECRET is unset the endpoint refuses to run (fail-closed) so it
 * can't be triggered anonymously in production.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  const fromHeader = auth === `Bearer ${secret}`;
  const fromQuery = new URL(req.url).searchParams.get("secret") === secret;
  if (!fromHeader && !fromQuery) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAbandonedCartSweep();
  return NextResponse.json({ ok: true, ...result });
}
