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
    const securityHeaders = [
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
