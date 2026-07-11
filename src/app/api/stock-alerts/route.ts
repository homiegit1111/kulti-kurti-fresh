/**
 * Back-in-stock / size alert registration.
 *
 *   POST /api/stock-alerts  { email, product_handle, size? }
 *
 * Open to guests (capturing lost demand shouldn't require an account), so it
 * is strictly validated and rate-limited. Writes go through the service-role
 * client — `stock_alerts` denies anon/authenticated access via RLS, so this
 * route is the only write path.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { registerStockAlert } from "@/lib/server/stock-alerts";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { isValidEmail } from "@/lib/email-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,128}$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = checkRateLimit(req, "stock-alerts", {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Alerts are not available right now." },
      { status: 503 },
    );
  }

  let body: { email?: string; product_handle?: string; size?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const handle = (body.product_handle ?? "").trim().toLowerCase();
  const size = (body.size ?? "").trim().slice(0, 16) || null;

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }

  const { userId } = await auth();
  const result = await registerStockAlert({
    email,
    productHandle: handle,
    size,
    clerkUserId: userId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Could not save your alert. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
