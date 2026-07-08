import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/**
 * Web app manifest for installability and mobile theming (India traffic is
 * ~85% mobile). Icons reference existing public assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - Modern Kurti Catalog`,
    short_name: SITE_NAME,
    description:
      "Shop modern kurtis, co-ord sets, lehengas, and sarees with fresh drops and practical prices.",
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
