"use client";

/**
 * §7.1 — the saved wholesale profile as PO letterhead data. Reads
 * `/api/wholesale-profile` (GET returns `buyer` mapped by
 * `wholesaleProfileToBuyer`) and reshapes it to the frozen
 * `WholesaleBuyerInfo` param of the WhatsApp builders (§1.1.4), so a
 * signed-in repeat buyer gets a pre-addressed purchase order.
 */

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/auth/client";
import type { WholesaleBuyerInfo } from "@/lib/b2b/whatsapp";

type ProfileBuyer = {
  name?: string;
  businessName?: string;
  city?: string;
  phone?: string;
  gstin?: string;
};

export function useWholesaleBuyer(): WholesaleBuyerInfo | undefined {
  const [buyer, setBuyer] = useState<WholesaleBuyerInfo | undefined>(undefined);

  useEffect(() => {
    if (!isAuthEnabled) return;
    let cancelled = false;

    fetch("/api/wholesale-profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (cancelled) return;
        const data = raw as { buyer?: ProfileBuyer | null } | null;
        const profile = data?.buyer;
        if (!profile) return;
        setBuyer({
          buyerName: profile.name || undefined,
          businessName: profile.businessName || undefined,
          city: profile.city || undefined,
          whatsappPhone: profile.phone || undefined,
          gstin: profile.gstin || undefined,
        });
      })
      .catch(() => {
        /* profile is optional letterhead data — the PO stands without it */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return buyer;
}
