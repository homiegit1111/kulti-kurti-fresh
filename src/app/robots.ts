import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * robots.txt — allow crawling of public/commercial pages, keep crawlers out of
 * account/checkout/auth/API surfaces, and advertise the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/cart",
          "/checkout",
          "/order-confirmation",
          "/wishlist",
          "/login",
          "/sign-up",
          "/sso-callback",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
