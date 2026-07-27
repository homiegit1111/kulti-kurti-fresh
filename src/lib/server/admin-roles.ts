import "server-only";

/**
 * Admin roles and permissions — SERVER ONLY.
 *
 * TWO SOURCES OF ADMIN, IN THIS ORDER:
 *
 *   1. ADMIN_CLERK_USER_IDS (env) → always role "owner".
 *      This is the break-glass list. It is checked first and needs no database,
 *      so a bad row, a botched migration, or an accidental self-demotion can
 *      never lock the store owner out of their own store. It also means the
 *      owner's requests skip a query on every admin call.
 *
 *   2. public.admin_users (database) → the row's role, if is_active.
 *      Delegated access the owner can grant and revoke from Admin Studio
 *      without a redeploy.
 *
 * Fail-closed everywhere: no env list AND no active database rows means nobody
 * is an admin (503), never "everyone is".
 *
 * WHY PERMISSIONS AND NOT JUST "IS ADMIN"
 * A wholesale business hands stock counting to whoever is at the desk. That
 * person needs to correct a stock number; they do not need to change the
 * minimum order quantity, publish a price change, or add another admin. Every
 * route declares the permission it needs, so widening someone's access is a
 * role change rather than a code change.
 */

import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type AdminRole = "owner" | "manager" | "staff";

export type AdminPermission =
  | "catalog:read"
  | "catalog:write"
  | "catalog:delete"
  | "stock:write"
  | "content:write"
  | "content:publish"
  | "media:write"
  | "media:delete"
  | "offers:write"
  | "orders:read"
  | "orders:write"
  | "pricing:write"
  | "team:manage"
  | "audit:read";

/**
 * The ladder, written out rather than derived, so reading this file tells you
 * exactly what a role can do.
 *
 *   staff   — runs the stock desk and drafts copy. Cannot publish, cannot
 *             delete, cannot touch money or people.
 *   manager — runs the shop day to day: catalog, stock, content, offers,
 *             orders. Cannot change wholesale pricing rules or the admin team.
 *   owner   — everything, including pricing and team.
 */
const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  staff: [
    "catalog:read",
    "stock:write",
    "content:write",
    "media:write",
    "orders:read",
  ],
  manager: [
    "catalog:read",
    "catalog:write",
    "catalog:delete",
    "stock:write",
    "content:write",
    "content:publish",
    "media:write",
    "media:delete",
    "offers:write",
    "orders:read",
    "orders:write",
    "audit:read",
  ],
  owner: [
    "catalog:read",
    "catalog:write",
    "catalog:delete",
    "stock:write",
    "content:write",
    "content:publish",
    "media:write",
    "media:delete",
    "offers:write",
    "orders:read",
    "orders:write",
    "pricing:write",
    "team:manage",
    "audit:read",
  ],
};

export function roleHas(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: AdminRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role];
}

export const ADMIN_ROLES: readonly AdminRole[] = ["owner", "manager", "staff"];

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "owner" || value === "manager" || value === "staff";
}

/** Parse ADMIN_CLERK_USER_IDS ("id_a, id_b") into a trimmed, non-empty set. */
export function envOwnerIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export type AdminIdentity =
  | { ok: true; userId: string; role: AdminRole; source: "env" | "database" }
  | { ok: false; status: 401 | 403 | 503 };

/**
 * Short per-isolate memo of database role lookups. Bounded lifetime so a
 * revocation takes effect promptly; bounded size so a hostile id stream cannot
 * grow it without limit.
 */
const ROLE_TTL_MS = 15_000;
const ROLE_CACHE_MAX = 200;
const roleCache = new Map<string, { role: AdminRole | null; at: number }>();

function cachedRole(userId: string): AdminRole | null | undefined {
  const hit = roleCache.get(userId);
  if (!hit) return undefined;
  if (Date.now() - hit.at > ROLE_TTL_MS) {
    roleCache.delete(userId);
    return undefined;
  }
  return hit.role;
}

function rememberRole(userId: string, role: AdminRole | null): void {
  if (roleCache.size >= ROLE_CACHE_MAX) roleCache.clear();
  roleCache.set(userId, { role, at: Date.now() });
}

/** Forget a cached role immediately — call after changing someone's access. */
export function forgetCachedRole(userId?: string): void {
  if (userId) roleCache.delete(userId);
  else roleCache.clear();
}

async function lookupDatabaseRole(
  db: SupabaseClient,
  userId: string,
): Promise<AdminRole | null> {
  const memo = cachedRole(userId);
  if (memo !== undefined) return memo;

  const { data, error } = await db
    .from("admin_users")
    .select("role, is_active")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    // Do NOT cache an error as "no access": a transient failure would otherwise
    // lock a legitimate admin out for the whole TTL. Deny this request only.
    console.error("[admin-roles] lookup failed:", error.message);
    return null;
  }

  const role =
    data && data.is_active === true && isAdminRole(data.role) ? data.role : null;
  rememberRole(userId, role);
  return role;
}

/**
 * Resolve the caller's admin identity.
 *
 * 503 = no admin is configured anywhere (fail closed).
 * 401 = not signed in.
 * 403 = signed in, but not an admin.
 */
export async function resolveAdminIdentity(): Promise<AdminIdentity> {
  const envOwners = envOwnerIds();
  const db = createServiceRoleClient();

  // With no env list and no database, nobody can be an admin. Report 503 so the
  // UI can say "not configured yet" instead of "you are not authorised".
  if (envOwners.size === 0 && !db) return { ok: false, status: 503 };

  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401 };

  if (envOwners.has(userId)) {
    return { ok: true, userId, role: "owner", source: "env" };
  }

  if (!db) return { ok: false, status: 403 };

  const role = await lookupDatabaseRole(db, userId);
  if (!role) return { ok: false, status: 403 };

  return { ok: true, userId, role, source: "database" };
}

/** True when at least one admin could exist. Lets UIs degrade gracefully. */
export function isAdminConfigured(): boolean {
  return envOwnerIds().size > 0 || Boolean(createServiceRoleClient());
}
