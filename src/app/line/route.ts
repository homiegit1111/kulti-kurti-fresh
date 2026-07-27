import { NextResponse, type NextRequest } from "next/server";

/**
 * /line → /shop, permanently (§5.1). The line system now mounts inside /shop's
 * URL and SEO shell; the route name survives as a 308 that preserves the FULL
 * query string — a shared filtered /line link lands as the same filtered sheet.
 */
export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/shop";
  // url.search carries over on clone — run/pp/cat/col/stock/drop/fresh/q/sort/d
  // and anything else arrive untouched.
  return NextResponse.redirect(url, 308);
}
