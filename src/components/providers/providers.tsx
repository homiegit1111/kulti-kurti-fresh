"use client";

import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { TrayProvider } from "@/lib/line/tray-context";
import { ScrollToTop } from "@/components/providers/scroll-to-top";
import { ClerkShopifySync } from "@/components/providers/clerk-shopify-sync";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TopRail } from "@/components/layout/top-rail";
import { RunningFooter } from "@/components/layout/running-footer";
import { CartAddedToast } from "@/components/layout/cart-added-toast";
import { MotionConfig } from "framer-motion";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "tween" }}>
      <ThemeProvider>
        <CartProvider>
          <WishlistProvider>
            <TrayProvider>
              <ClerkShopifySync />
              <ScrollToTop />
              {children}
              <TopRail />
              <RunningFooter />
              <CartAddedToast />
            </TrayProvider>
          </WishlistProvider>
        </CartProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
