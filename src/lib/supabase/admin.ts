import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER ONLY. Bypasses RLS.
 *
 * Only for trusted server contexts that have no user session (cron jobs,
 * webhooks, abandoned-cart recovery). Never import this into client code, and
 * always enforce ownership/authorisation in code when you use it.
 *
 * Returns null when Supabase or the service-role key isn't configured, so
 * callers degrade gracefully instead of throwing.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  // Tripwire. This module is currently reachable from the client bundle through
  // src/lib/commerce/catalog.ts (which many "use client" files import for
  // formatPrice/COLOR_MAP), so it cannot yet carry `import "server-only"`. The
  // key itself does not leak today — SUPABASE_SERVICE_ROLE_KEY has no
  // NEXT_PUBLIC_ prefix, so it is undefined in the browser and this function
  // would quietly return null. Quietly is the problem: a future rename, an
  // `env:` mapping in next.config.ts, or a bundler change would put a live
  // RLS-bypassing client in the browser and nothing would complain. Fail loudly
  // instead. See docs/ADMIN_STUDIO.md for the import-graph split that lets this
  // become a build-time guarantee.
  if (typeof window !== "undefined") {
    throw new Error(
      "createServiceRoleClient() must never run in the browser. This is a server-only module.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
