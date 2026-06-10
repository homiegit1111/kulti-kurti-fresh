"use client";

import Script from "next/script";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GA_MEASUREMENT_ID,
  getStoredConsent,
  isAnalyticsConfigured,
  pageview,
} from "@/lib/analytics";

/**
 * GA4 loader with Consent Mode v2.
 *
 * Order matters:
 *   1. Set `consent default` to DENIED *before* gtag config runs, so nothing is
 *      stored/sent until the visitor accepts (GDPR/DPDP-friendly).
 *   2. Re-apply any previously-stored consent so returning visitors who already
 *      accepted aren't re-prompted into a denied state.
 *   3. Configure GA4 — page_view is sent manually on route change (SPA).
 *
 * Renders nothing (and loads no scripts) when NEXT_PUBLIC_GA_MEASUREMENT_ID is
 * unset, so dev/preview builds stay clean.
 */
export function GoogleAnalytics() {
  if (!isAnalyticsConfigured()) return null;

  return (
    <>
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
          try {
            if (localStorage.getItem('rangat-pehnawa-consent') === 'granted') {
              gtag('consent', 'update', {
                ad_storage: 'granted',
                analytics_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
              });
            }
          } catch (e) {}
        `}
      </Script>

      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      <Script id="ga-config" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false,
            anonymize_ip: true
          });
        `}
      </Script>

      {/* useSearchParams must sit under a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  );
}

/** Fires a GA4 page_view on every client-side route change. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (getStoredConsent() !== "granted") return;
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}
