import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Supabase client authenticated as the current Clerk user.
 *
 * Uses Supabase's native third-party auth integration with Clerk: the Clerk
 * session token is forwarded as the Supabase access token, so RLS policies that
 * read `auth.jwt() ->> 'sub'` resolve to the Clerk user id. No service-role key
 * is used — every query is scoped to the signed-in user by RLS.
 *
 * Prereq (already done by the owner): Supabase Dashboard → Authentication →
 * Third-Party Auth → Clerk is connected.
 *
 * Returns null when Supabase env is not configured, so callers degrade
 * gracefully instead of throwing.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createClerkSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    async accessToken() {
      const { getToken } = await auth();
      return (await getToken()) ?? null;
    },
  });
}
