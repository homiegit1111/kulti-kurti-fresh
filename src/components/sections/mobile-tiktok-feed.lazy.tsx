"use client";

import dynamic from "next/dynamic";

/**
 * Code-split wrapper for the mobile shoppable reel.
 *
 * The feed is `block md:hidden` (mobile-only), framer-motion heavy, plays
 * <video>, and sits well below the fold — so it should never be in the
 * initial/desktop bundle. `ssr: false` keeps it out of the server HTML and
 * defers its JS until the client mounts. No SEO loss: it carries no unique
 * crawlable copy (the editorial/text sections stay server-rendered).
 *
 * page.tsx is a Server Component, so the `ssr: false` dynamic import must live
 * inside this "use client" boundary.
 */
const MobileTikTokFeed = dynamic(() => import("./mobile-tiktok-feed"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="block md:hidden w-full bg-charcoal py-12"
      style={{ minHeight: "70vh", contentVisibility: "auto" }}
    />
  ),
});

export default function MobileTikTokFeedLazy() {
  return <MobileTikTokFeed />;
}
