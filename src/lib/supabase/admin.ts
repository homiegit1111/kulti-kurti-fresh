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
