import { NextRequest } from "next/server";

/**
 * Same-origin guard for state-changing requests — a lightweight CSRF defence.
 *
 * Clerk session cookies are SameSite=Lax by default, which already blocks
 * cross-site cookie sends on most methods, but multipart/form-data POSTs are a
 * classic CSRF vector. For admin/mutating routes we additionally require the
 * request's Origin (or, failing that, Referer) to match our own host. Browsers
 * set Origin on all cross-origin state-changing requests and it cannot be
 * spoofed by page JS, so this reliably rejects forged cross-site submissions
 * while allowing same-origin fetches.
 *
 * Returns true when the request is same-origin (or when neither Origin nor
 * Referer is present — e.g. server-to-server calls, which don't carry a
 * browser session cookie anyway and are separately authorised).
 */
export function isSameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // No Origin header (some same-origin GETs, non-browser clients). Fall back to
  // Referer when present; if neither exists, treat as allowed — a browser CSRF
  // attack always carries at least one of them.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return true;
}
