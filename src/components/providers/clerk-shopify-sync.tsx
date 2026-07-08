"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/auth/client";

function shouldSyncLegacyShopifyCustomer(): boolean {
  return process.env.NEXT_PUBLIC_COMMERCE_BACKEND === "shopify";
}

export function ClerkShopifySync() {
  const { user, isLoaded } = useUser();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldSyncLegacyShopifyCustomer()) return;
    if (!isLoaded || !user || syncedRef.current === user.id) return;

    syncedRef.current = user.id;

    fetch("/api/auth/sync-shopify", {
      method: "POST",
    }).catch((err) => console.error("[ClerkShopifySync] Error:", err));
  }, [user, isLoaded]);

  return null;
}