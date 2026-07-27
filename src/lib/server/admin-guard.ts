import "server-only";

/**
 * THE admin route guard. Every /api/admin/* handler starts with one call to
 * `guardAdmin` and nothing else.
 *
 * The point of collapsing this into one function is that a security control you
 * have to remember to add is a control you will eventually forget. Here, the
 * only way to write a handler is to state what it needs — a permission, whether
 * it mutates, its rate budget — and the guard applies every layer in the right
 * order:
 *
 *   1. Cross-origin rejection (CSRF) on mutations, before anything expensive.
 *   2. A cheap per-IP burst limit, so unauthenticated floods die before they
 *      reach Clerk or the database.
 *   3. Authentication + role resolution.
 *   4. The permission check for this specific action.
 *   5. A durable per-USER limit, shared across Cloudflare isolates. Keyed by
 *      user id rather than IP because an authenticated identity cannot be
 *      spoofed by a header, and because the owner on a phone and the owner on a
 *      laptop should share one budget.
 *   6. A service-role database client, plus the request metadata the audit log
 *      wants.
 *
 * Order 1-before-3 matters: an unauthenticated attacker should never be able to
 * make us do a database round trip.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/server/origin-check";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { checkDurableRateLimit } from "@/lib/server/rate-limit-db";
import { clientIpFromHeaders } from "@/lib/server/turnstile";
import {
  resolveAdminIdentity,
  roleHas,
  type AdminPermission,
  type AdminRole,
} from "@/lib/server/admin-roles";

export type AuditEntityType =
  | "product"
  | "variant"
  | "order"
  | "collection"
  | "content"
  | "media"
  | "promotion"
  | "admin_user"
  | "settings"
  | "stock";

export type AdminContext = {
  userId: string;
  role: AdminRole;
  db: SupabaseClient;
  ip: string | null;
  userAgent: string | null;
};

export type AdminGuardResult =
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: NextResponse };

export type GuardOptions = {
  /** The permission this handler requires. Always state the narrowest one. */
  permission: AdminPermission;
  /** True for POST/PATCH/PUT/DELETE — adds the same-origin (CSRF) check. */
  mutation?: boolean;
  /** Rate budget. Named buckets keep unrelated endpoints from starving each other. */
  rateLimit?: { name: string; limit: number; windowMs?: number };
};

function denyForStatus(status: 401 | 403 | 503): NextResponse {
  const message =
    status === 401
      ? "Sign in required."
      : status === 403
        ? "Your account is not authorised for this action."
        : "Admin access is not configured.";
  return NextResponse.json({ error: message }, { status });
}

export function adminServiceUnavailable(): NextResponse {
  return NextResponse.json(
    { error: "Database is not configured." },
    { status: 503 },
  );
}

export async function guardAdmin(
  req: NextRequest,
  opts: GuardOptions,
): Promise<AdminGuardResult> {
  // 1. CSRF. A browser on another origin can be made to send a cookie-bearing
  //    request; it cannot forge the Origin header.
  if (opts.mutation && !isSameOrigin(req)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Cross-origin request rejected." },
        { status: 403 },
      ),
    };
  }

  // 2. Cheap per-IP burst guard, before any auth or database work. Generous,
  //    because its only job is to shed obvious floods.
  const burst = checkRateLimit(req, "admin-burst", {
    limit: 240,
    windowMs: 60_000,
  });
  if (!burst.ok) return { ok: false, response: tooManyRequests(burst) };

  // 3 + 4. Who is this, and may they do this?
  const identity = await resolveAdminIdentity();
  if (!identity.ok) {
    return { ok: false, response: denyForStatus(identity.status) };
  }
  if (!roleHas(identity.role, opts.permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Your role (${identity.role}) cannot perform this action.`,
          requiredPermission: opts.permission,
        },
        { status: 403 },
      ),
    };
  }

  const db = createServiceRoleClient();
  if (!db) return { ok: false, response: adminServiceUnavailable() };

  // 5. Durable, cross-isolate limit keyed by the authenticated user.
  if (opts.rateLimit) {
    const durable = await checkDurableRateLimit(db, {
      bucket: opts.rateLimit.name,
      identity: identity.userId,
      limit: opts.rateLimit.limit,
      windowMs: opts.rateLimit.windowMs ?? 60_000,
      fallbackRequest: req,
    });
    if (!durable.ok) return { ok: false, response: tooManyRequests(durable) };
  }

  return {
    ok: true,
    ctx: {
      userId: identity.userId,
      role: identity.role,
      db,
      ip: clientIpFromHeaders(req.headers),
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/**
 * Hash the caller IP rather than storing it.
 *
 * The audit log needs to distinguish "the owner, from the usual place" from
 * "someone else"; it does not need the address itself. Salting with a
 * deployment secret means the stored value is not reversible with a list of
 * every IPv4 address, which an unsalted hash of a 32-bit input trivially is.
 * With no secret configured we store nothing rather than a lookup-able digest.
 */
async function hashIp(ip: string | null): Promise<string | null> {
  const salt = process.env.COMMERCE_CHECKOUT_SESSION_SECRET;
  if (!ip || !salt) return null;
  try {
    const bytes = new TextEncoder().encode(`${salt}:${ip}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .slice(0, 12)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export type AuditInput = {
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

/**
 * Record an admin action. Deliberately best-effort: a mutation the owner asked
 * for must not fail because the audit table is mid-migration. Failures are
 * logged loudly instead.
 */
export async function recordAudit(
  ctx: AdminContext,
  input: AuditInput,
): Promise<void> {
  const { error } = await ctx.db.from("commerce_admin_audit_log").insert({
    actor_clerk_user_id: ctx.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_state: input.beforeState ?? {},
    after_state: input.afterState ?? {},
    metadata: { ...(input.metadata ?? {}), actor_role: ctx.role },
    ip_hash: await hashIp(ctx.ip),
    user_agent: ctx.userAgent,
  });
  if (error) console.error("[admin-audit] write failed:", error.message);
}

// ---------------------------------------------------------------------------
// Shared response helpers
// ---------------------------------------------------------------------------

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found."): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = "Something went wrong."): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Parse a JSON body, rejecting anything that is not a plain object. */
export async function readJsonObject(
  req: NextRequest,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: badRequest("Expected a JSON body.") };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, response: badRequest("Request body must be a JSON object.") };
  }
  return { ok: true, body: raw as Record<string, unknown> };
}

/**
 * Ask Next to re-render the paths a change affects.
 *
 * Best-effort by design: on @opennextjs/cloudflare, on-demand revalidation
 * needs a tag-cache override that this project does not configure, so this is a
 * no-op in that deployment. Content freshness there comes from the short read
 * memo in src/lib/content/server.ts plus per-route `revalidate`. Calling it
 * anyway means Node/self-hosted deployments get instant updates for free.
 */
export async function revalidateStorefront(paths: string[]): Promise<void> {
  try {
    const { revalidatePath } = await import("next/cache");
    for (const path of paths) {
      try {
        revalidatePath(path);
      } catch {
        // A single bad path must not abort the rest.
      }
    }
  } catch {
    // next/cache unavailable in this context — nothing to do.
  }
}
