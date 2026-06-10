"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Core Web Vitals reporter.
 *
 * Captures LCP / INP / CLS / FCP / TTFB on real user sessions (field data —
 * the numbers Google actually ranks on) and forwards them to an analytics
 * endpoint. In development it logs to the console so you can sanity-check
 * regressions while building.
 *
 * To collect data in production, set NEXT_PUBLIC_VITALS_URL to your analytics
 * collector (e.g. a Vercel/Supabase function, or a /api/vitals route). If it's
 * unset, reporting is a no-op in production and console-only in dev.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`[web-vitals] ${metric.name}`, Math.round(metric.value), metric.rating);
      return;
    }

    const url = process.env.NEXT_PUBLIC_VITALS_URL;
    if (!url) return;

    const body = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      path: window.location.pathname,
      ts: Date.now(),
    });

    // sendBeacon survives page unload; fetch keepalive is the fallback.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, { body, method: "POST", keepalive: true });
    }
  });

  return null;
}
