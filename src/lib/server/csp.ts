/**
 * Content-Security-Policy builder — nonce + strict-dynamic hardening.
 *
 * Built per-request in `src/proxy.ts` (middleware). Two modes:
 *
 *   • STRICT (dynamic routes — /shop, /collections/[handle], /login, …):
 *     `'nonce-…' 'strict-dynamic'`. Next.js App Router detects the nonce in
 *     the *request* CSP header and stamps it onto every framework/inline
 *     script it server-renders, so CSP3 browsers trust only nonce-carrying
 *     scripts plus whatever those scripts load (Next chunks, GA, Turnstile,
 *     Clerk — all injected by trusted code). The `'unsafe-inline'` +
 *     host-allowlist below are kept ONLY as the CSP2 fallback; CSP3 browsers
 *     ignore them once a nonce + strict-dynamic are present.
 *
 *   • BASE (static/ISR routes — home, lookbook, legal, cart, …):
 *     prerendered HTML cannot carry a per-request nonce (Next serves the
 *     cached markup untouched), so `'strict-dynamic'` there would block every
 *     script. These routes keep the hardened allowlist policy instead.
 *
 * `'unsafe-eval'` is dev-only (Turbopack/React refresh); dropped in prod.
 *
 * This module must stay edge-safe (pure string work, no Node APIs) because
 * middleware runs on the edge runtime.
 */

/** Generate a 128-bit base64 nonce using Web Crypto (edge-safe). */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw);
}

/**
 * Routes rendered dynamically on every request (see build output / route
 * manifest: ƒ entries). Only these can receive a per-request nonce.
 * Keep in sync when adding new dynamic pages.
 */
const DYNAMIC_ROUTE_PREFIXES = [
  "/shop",
  "/collections/", // detail pages are dynamic; /collections index is static
  "/login",
  "/sign-up",
];

export function isNonceCapableRoute(pathname: string): boolean {
  return DYNAMIC_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix),
  );
}

const SCRIPT_HOSTS = [
  "https://challenges.cloudflare.com",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://checkout.razorpay.com",
];

/**
 * Build the policy. With a nonce → strict mode (dynamic routes only); without
 * → hardened allowlist mode (static routes).
 */
export function buildCsp(nonce?: string): string {
  const dev = process.env.NODE_ENV !== "production";

  const scriptSrc = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : []),
    // In strict mode this is the CSP2 fallback only — ignored by browsers
    // that understand strict-dynamic. In base mode it is required: Next's
    // prerendered HTML ships inline bootstrap scripts without nonces.
    "'unsafe-inline'",
    // Dev tooling (Turbopack HMR / React refresh) needs eval; production doesn't.
    ...(dev ? ["'unsafe-eval'"] : []),
    ...SCRIPT_HOSTS,
  ].join(" ");

  // Never send upgrade-insecure-requests in dev: LAN phone testing is HTTP
  // (http://192.168.x.x:3000). That directive rewrites CSS/JS to https:// and
  // the page renders as bare unstyled HTML. Production keeps the upgrade.
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    // http: in dev so LAN phone origin can load /_next/image + local media
    `img-src 'self' data: blob: https:${dev ? " http:" : ""}`,
    // Hero film / product video on homepage
    `media-src 'self' blob:${dev ? " http:" : ""}`,
    "font-src 'self' data:",
    // ws: / http: for Turbopack HMR when opening dev from a phone on LAN
    `connect-src 'self'${dev ? " http: https: ws: wss:" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://*.myshopify.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.sanity.io https://cdn.sanity.io https://*.supabase.co`,
    "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://checkout.razorpay.com https://api.razorpay.com",
    "worker-src 'self' blob:",
    "form-action 'self' https://*.myshopify.com",
    "report-uri /api/csp-report",
  ];

  if (!dev) {
    directives.splice(directives.length - 1, 0, "upgrade-insecure-requests");
  }

  return directives.join("; ");
}
