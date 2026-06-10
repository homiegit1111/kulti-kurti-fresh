"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scrolls the window to top whenever the route (pathname) changes.
 * This fixes the bug where navigating from a scrolled-down page
 * (e.g. shop grid) to a product detail page opens it mid-scroll.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
