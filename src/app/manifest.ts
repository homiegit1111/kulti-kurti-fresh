import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/**
 * Web app manifest — installability + correct mobile theming (India traffic is
 * ~85% mobile). Icons reference existing public assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Kurtis & Indian Ethnic Wear`,
    short_name: SITE_NAME,
    description:
      "Shop premium handcrafted kurtis, co-ord sets, lehengas and sarees for women. Modern Indian ethnic wear.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfbf9",
    theme_color: "#1a1a1a",
    categories: ["shopping", "lifestyle", "fashion"],
    icons: [
      { src: "/images/RangatPehnawa.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
