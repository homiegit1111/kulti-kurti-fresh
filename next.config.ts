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
};

export default nextConfig;
