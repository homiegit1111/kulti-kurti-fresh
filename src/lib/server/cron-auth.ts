import { NextRequest, NextResponse } from "next/server";

/**
 * Shared guard for scheduled endpoints (mirrors /api/cron/abandoned-cart).
 *
 * The scheduler must present CRON_SECRET as either:
 *   • Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this), or
 *   • ?secret=<CRON_SECRET>
 *
 * Fail-closed: with CRON_SECRET unset the endpoint refuses to run, so it can
 * never be triggered anonymously in production. Returns null when authorized.
 */
export function requireCronSecret(req: NextRequest): NextResponse | null {
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
  return null;
}
