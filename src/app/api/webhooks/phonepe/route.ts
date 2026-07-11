import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "PhonePe webhook is retired." }, { status: 410 });
}
