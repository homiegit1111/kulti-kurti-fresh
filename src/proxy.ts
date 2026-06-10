import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildCsp, generateNonce, isNonceCapableRoute } from "@/lib/server/csp";

const isProtectedRoute = createRouteMatcher(["/account(.*)"]);

const authEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/**
 * Attach a per-request CSP nonce (see `src/lib/server/csp.ts`).
 *
 * The CSP must be set on BOTH the request headers (so Next.js App Router
 * detects the nonce and stamps it onto its inline/framework scripts) and the
 * response headers (so the browser enforces it). The static CSP previously
 * set in `next.config.ts` was removed — two differing CSP headers would
 * enforce their intersection and break script loading.
 */
function withCsp(req: NextRequest): NextResponse {
  // Strict nonce + strict-dynamic only on dynamically rendered routes —
  // prerendered (static/ISR) HTML can't carry a per-request nonce, so those
  // routes get the hardened allowlist policy instead (see csp.ts).
  const nonce = isNonceCapableRoute(req.nextUrl.pathname)
    ? generateNonce()
    : undefined;
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  if (nonce) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

// Storefront resilience: only mount Clerk's middleware when it is actually
// configured. Without keys the site is fully browsable; /account degrades
// gracefully client-side.
export default authEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) await auth.protect();
      return withCsp(req);
    })
  : function proxy(req: NextRequest) {
      return withCsp(req);
    };

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
