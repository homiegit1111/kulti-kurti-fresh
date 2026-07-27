import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Unauthenticated (anon-key) Supabase client for reading PUBLIC data.
 *
 * Why this exists alongside the service-role client: reading site content and
 * live offers happens on nearly every page render. Doing that with the
 * service-role key would put an RLS-bypassing client on the hottest path in the
 * app for no benefit — the rows are public-read by policy. This client can only
 * ever see what an anonymous visitor can see, so a mistake here leaks nothing.
 *
 * Returns null when Supabase is not configured, so callers fall back to their
 * built-in defaults instead of throwing.
 */
export function createPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
