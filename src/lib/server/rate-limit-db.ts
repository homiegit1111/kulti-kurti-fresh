import "server-only";

/**
 * Durable rate limiting — SERVER ONLY.
 *
 * WHY THIS EXISTS
 * src/lib/server/rate-limit.ts keeps its counters in a module-scope Map. On
 * Cloudflare Workers that Map lives in ONE isolate. Cloudflare runs isolates per
 * colo and recycles them freely, with no shared memory, so the real ceiling is
 * `limit × live isolates` and any eviction silently resets the window. As a
 * control on anything that matters, it is decorative.
 *
 * This limiter keeps the counter in Postgres via the rate_limit_hit() function,
 * so every isolate, colo and deployment shares one budget. It costs one round
 * trip, which is why it guards admin and credential-adjacent endpoints rather
 * than every page view.
 *
 * FAILURE POLICY
 * If the database call fails we fall back to the in-process limiter rather than
 * failing the request. That is a considered trade: these endpoints already sit
 * behind Clerk authentication and a permission check, so the limiter is
 * defence-in-depth, and taking admin access offline during a database blip is
 * the worse outcome. The fallback still applies *a* limit, and the failure is
 * logged.
 */

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  rateLimit,
  type RateLimitResult,
} from "@/lib/server/rate-limit";

export type DurableLimitInput = {
  /** Bucket name, e.g. "admin-content-write". Buckets are independent. */
  bucket: string;
  /** Stable identity for the caller — prefer an authenticated user id. */
  identity: string;
  limit: number;
  windowMs: number;
  /** Used only for the in-process fallback if the database is unreachable. */
  fallbackRequest?: NextRequest;
};

export async function checkDurableRateLimit(
  db: SupabaseClient,
  input: DurableLimitInput,
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.round(input.windowMs / 1000));

  try {
    const { data, error } = await db.rpc("rate_limit_hit", {
      p_bucket: input.bucket,
      p_identity: input.identity,
      p_limit: input.limit,
      p_window_seconds: windowSeconds,
    });

    if (error) throw new Error(error.message);

    // The function returns a single row: (allowed, remaining, reset_at).
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") throw new Error("empty rate_limit_hit result");

    const record = row as {
      allowed?: boolean;
      remaining?: number;
      reset_at?: string;
    };
    const resetAt = record.reset_at
      ? Date.parse(record.reset_at)
      : Date.now() + input.windowMs;
    const remaining = Number.isFinite(record.remaining)
      ? Number(record.remaining)
      : 0;
    const ok = record.allowed === true;

    return {
      ok,
      limit: input.limit,
      remaining: Math.max(remaining, 0),
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
    };
  } catch (e) {
    console.error(
      `[rate-limit-db] ${input.bucket} fell back to in-process limiting:`,
      e instanceof Error ? e.message : String(e),
    );
    // Fall back to a per-isolate limit keyed by the same identity, so the
    // degraded mode is still narrower than no limit at all.
    if (input.fallbackRequest) {
      return checkRateLimit(input.fallbackRequest, input.bucket, {
        limit: input.limit,
        windowMs: input.windowMs,
      });
    }
    return rateLimit(`${input.bucket}:${input.identity}`, {
      limit: input.limit,
      windowMs: input.windowMs,
    });
  }
}
