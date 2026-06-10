"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/auth/client";

export function ClerkShopifySync() {
  const { user, isLoaded } = useUser();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoaded && user && syncedRef.current !== user.id) {
      syncedRef.current = user.id;
      
      // Hit our backend route to ensure the Shopify Customer is created/linked
      fetch("/api/auth/sync-shopify", {
        method: "POST",
      }).catch((err) => console.error("[ClerkShopifySync] Error:", err));
    }
  }, [user, isLoaded]);

  return null;
}
