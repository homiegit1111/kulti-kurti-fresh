import type { NextConfig } from "next";

/**
 * Phone/LAN testing hits the dev server as http://192.168.x.x:3000.
 * Next 16 blocks cross-origin /_next/* (HMR, chunks, image optimizer)
 * unless the host is listed here — without it, CSS may work from cache
 * while hero images + cards stay blank on mobile.
 */
const lanDevOrigins = (
  process.env.ALLOWED_DEV_ORIGINS ||
  "192.168.1.10,127.0.0.1,localhost"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // React <ViewTransition> integration for the App Router. Client navigations
  // are React Transitions; with the boundary in `src/app/template.tsx` each
  // page turn runs through document.startViewTransition (quiet crossfade +
  // per-product plate morph). Timing lives in globals.css and is fully gated
  // on prefers-reduced-motion; browsers without the API navigate normally.
  experimental: {
    viewTransition: true,
  },
  // Allow phone browsers on the local network to load Turbopack assets.
  allowedDevOrigins: lanDevOrigins,
  images: {
    // AVIF first (~50% smaller than JPEG), WebP fallback for older clients.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images on the CDN/edge for 31 days (in seconds).
    minimumCacheTTL: 2678400,
    // Tuned for a fashion storefront: large editorial hero + dense grids.
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Keep all explicitly requested image qualities valid in Next 16.
    qualities: [70, 75, 82, 85],
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
      {
        // Customer review photos (Supabase storage, public bucket).
        protocol: "https",
        hostname: "*.supabase.co",
      },
      // Instagram CDN (public post previews / Graph media)
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "scontent.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "instagram.com",
      },
      // Sanity image CDN (lookbook editorial covers + galleries)
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  // ── Baseline security headers ──────────────────────────────────────────────
  // Conservative, dependency-free hardening that won't break Clerk/Shopify.
  async headers() {
    // ── Content-Security-Policy ──────────────────────────────────────────────
    // The CSP moved to `src/proxy.ts` (middleware) so it can carry a fresh
    // per-request nonce + 'strict-dynamic' — see `src/lib/server/csp.ts`.
    // Defining it here too would double-send the header and browsers enforce
    // the INTERSECTION of multiple CSPs, breaking nonce'd scripts.
    const isProd = process.env.NODE_ENV === "production";
    const securityHeaders = [
      // HSTS only in production — never on local HTTP (phone LAN testing).
      ...(isProd
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]
        : []),
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
