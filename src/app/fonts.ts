// src/app/fonts.ts
// Self-hosted, zero-CLS webfonts via next/font.
// next/font automatically inlines size-adjusted fallback metrics
// (adjustFontFallback), eliminating layout shift on font swap.
import { Playfair_Display, Inter } from "next/font/google";

export const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: true,
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  fallback: ["Segoe UI", "Arial", "sans-serif"],
  adjustFontFallback: true,
});
