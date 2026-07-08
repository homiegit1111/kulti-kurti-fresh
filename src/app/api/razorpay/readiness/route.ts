import { NextResponse } from "next/server";
import { getRazorpayReadiness } from "@/lib/payments/razorpay-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getRazorpayReadiness();
  return NextResponse.json({
    ok: true,
    razorpay: readiness,
    nextStep: readiness.configured
      ? "Create a test wholesale checkout and verify the captured payment callback."
      : "Paste Razorpay key id, public key id, and key secret into env, then restart the app.",
  });
}
