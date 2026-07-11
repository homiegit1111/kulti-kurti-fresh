"use client";

import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { ScrollToTop } from "@/components/providers/scroll-to-top";
import { ClerkShopifySync } from "@/components/providers/clerk-shopify-sync";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeProgressBar } from "@/components/layout/theme-progress-bar";
import { MotionConfig } from "framer-motion";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "tween" }}>
      <ThemeProvider>
        <CartProvider>
          <WishlistProvider>
            <ClerkShopifySync />
            <ScrollToTop />
            {children}
            <ThemeProgressBar />
          </WishlistProvider>
        </CartProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
