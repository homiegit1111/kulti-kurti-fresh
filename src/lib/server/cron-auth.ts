import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function safeEqual(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

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
  const auth = req.headers.get("authorization") ?? "";
  const fromHeader = safeEqual(`Bearer ${secret}`, auth);
  const querySecret = new URL(req.url).searchParams.get("secret") ?? "";
  const fromQuery = safeEqual(secret, querySecret);
  if (!fromHeader && !fromQuery) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
