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
  async headers() {
    // ── Content-Security-Policy (ENFORCING) ──────────────────────────────────
    // Graduated from report-only after verifying login + checkout in a real
    // browser against Clerk, Shopify and Turnstile with no breakage. This now
    // *blocks* anything outside the allow-lists. `report-uri` is kept so any
    // future violation (e.g. a new 3rd-party script) still surfaces in
    // /api/csp-report logs even while enforcing.
    //
    // `unsafe-inline`/`unsafe-eval` are retained on script-src because Clerk,
    // Next.js and framer-motion inject inline/eval'd code without nonces; a
    // nonce/hash-based lockdown is a future hardening step (tracked separately).
    // Allow-lists cover: Clerk (auth + telemetry), Cloudflare Turnstile,
    // Shopify, Unsplash, and same-origin assets.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://*.myshopify.com https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
      "worker-src 'self' blob:",
      "form-action 'self' https://*.myshopify.com",
      "upgrade-insecure-requests",
      "report-uri /api/csp-report",
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
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
