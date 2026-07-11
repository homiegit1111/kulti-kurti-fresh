import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "PhonePe is not available. Use secure Razorpay checkout." },
    { status: 410 },
  );
}
