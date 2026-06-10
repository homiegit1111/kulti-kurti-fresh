/**
 * Lightweight in-memory rate limiter (no external infra).
 *
 * Fixed-window counter keyed by `${name}:${ip}`. Best-effort: state lives in the
 * server instance's memory, so on a multi-instance/serverless deployment each
 * instance keeps its own window. That's intentionally simple — it still stops
 * casual scraping/abuse and brute-forcing from a single client without adding
 * Redis/Upstash. Swap in a shared store later if we need strict global limits.
 *
 * Usage in a route:
 *   const rl = checkRateLimit(req, "contact", { limit: 5, windowMs: 60_000 });
 *   if (!rl.ok) return tooManyRequests(rl);
 */

import { NextRequest, NextResponse } from "next/server";
import { clientIpFromHeaders } from "@/lib/server/turnstile";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
let lastSweep = 0;

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
  retryAfterSec: number;
};

/** Drop expired buckets occasionally so the map can't grow unbounded. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      ok: true,
      limit: opts.limit,
      remaining: opts.limit - 1,
      resetAt,
      retryAfterSec: 0,
    };
  }

  existing.count += 1;
  const ok = existing.count <= opts.limit;
  const remaining = Math.max(0, opts.limit - existing.count);
  return {
    ok,
    limit: opts.limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSec: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Build a per-client key from IP + a route name, then apply the window. */
export function checkRateLimit(
  req: NextRequest,
  name: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const ip = clientIpFromHeaders(req.headers) || "unknown";
  return rateLimit(`${name}:${ip}`, opts);
}

/** Standard 429 response with Retry-After + RateLimit headers. */
export function tooManyRequests(result: RateLimitResult): NextResponse {
  const res = NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429 },
  );
  res.headers.set("Retry-After", String(result.retryAfterSec));
  res.headers.set("RateLimit-Limit", String(result.limit));
  res.headers.set("RateLimit-Remaining", String(result.remaining));
  res.headers.set("RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return res;
}
