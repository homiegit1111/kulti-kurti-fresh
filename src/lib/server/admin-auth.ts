import "server-only";

/**
 * Admin authorisation gate — SERVER ONLY.
 *
 * This module is now a thin, backward-compatible shim over
 * src/lib/server/admin-roles.ts, which holds the single definition of who is an
 * admin and what each role may do. Two copies of an authorisation rule is how
 * they diverge, so the rule lives in exactly one place.
 *
 * Existing callers keep working unchanged:
 *
 *   const gate = await requireAdmin();
 *   if (!gate.ok) return NextResponse.json({ error: "..." }, { status: gate.status });
 *   // gate.userId is a verified admin; gate.role is now available too.
 *
 * New routes should call `guardAdmin` from src/lib/server/admin-guard.ts
 * instead — it bundles CSRF, rate limiting, the permission check and the
 * database client into one call.
 *
 * Status codes: 401 = not signed in, 403 = signed in but not an admin, 503 =
 * no admin source configured (fail closed — never default to "everyone").
 */

import {
  isAdminConfigured as isAdminConfiguredInternal,
  resolveAdminIdentity,
  type AdminRole,
} from "@/lib/server/admin-roles";

export type AdminGate =
  | { ok: true; userId: string; role: AdminRole }
  | { ok: false; status: number };

/**
 * Resolve the caller and confirm they are an admin (any role).
 *
 * Note for callers that gate destructive work: "is an admin" is no longer the
 * same question as "may do this". Use `guardAdmin({ permission })` when the
 * action is narrower than general admin access.
 */
export async function requireAdmin(): Promise<AdminGate> {
  const identity = await resolveAdminIdentity();
  if (!identity.ok) return { ok: false, status: identity.status };
  return { ok: true, userId: identity.userId, role: identity.role };
}

/** True when at least one admin source is configured. Lets UIs degrade gracefully. */
export function isAdminConfigured(): boolean {
  return isAdminConfiguredInternal();
}
