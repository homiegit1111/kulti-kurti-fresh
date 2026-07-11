import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "MANUAL_PAYMENT_DISABLED",
      reason: "Manual and cash-on-delivery completion is unavailable during the secure Razorpay launch.",
    },
    { status: 410 },
  );
}
