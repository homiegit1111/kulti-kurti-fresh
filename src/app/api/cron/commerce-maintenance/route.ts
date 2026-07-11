import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/server/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const db = createServiceRoleClient();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Commerce backend is unavailable." }, { status: 503 });
  }
  const { data, error } = await db.rpc("expire_commerce_checkout_holds", {
    p_limit: 250,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, expiredOrders: Number(data ?? 0) });
}
