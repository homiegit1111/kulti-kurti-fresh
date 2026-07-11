import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/checkout?payment=phonepe_retired", req.url), 302);
}
