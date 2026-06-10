import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first (~50% smaller than JPEG), WebP fallback for older clients.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images on the CDN/edge for 31 days (in seconds).
    minimumCacheTTL: 2678400,
    // Tuned for a fashion storefront: large editorial hero + dense grids.
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  // ── Baseline security headers ──────────────────────────────────────────────
  // Conservative, dependency-free hardening that won't break Clerk/Shopify.
  // NOTE: a strict Content-Security-Policy is intentionally NOT set here yet —
  // it needs to be verified in a real browser against Clerk's inline scripts,
  // Shopify checkout redirects, and framer-motion inline styles before enabling.
  async headers() {
    // ── Content-Security-Policy (REPORT-ONLY phase) ──────────────────────────
    // This does NOT block anything yet — browsers only report what *would* be
    // blocked to /api/csp-report. Watch those logs, tighten the allow-lists
    // below, then graduate to an enforcing `Content-Security-Policy` header.
    // Allow-lists cover: Clerk (auth), Cloudflare Turnstile, Shopify, Unsplash.
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      // framer-motion / Clerk inject inline; keep unsafe-inline/eval while in
      // report-only so we can measure before locking down with nonces/hashes.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.myshopify.com https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
      "worker-src 'self' blob:",
      "form-action 'self' https://*.myshopify.com",
      "report-uri /api/csp-report",
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
      // Force HTTPS for 2 years incl. subdomains (safe once the site is HTTPS).
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      // Block MIME-type sniffing.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Disallow framing (clickjacking protection).
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // Send only the origin on cross-origin navigations.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Lock down powerful browser features we don't use.
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
      // Limit cross-origin resource leakage.
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];

    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
