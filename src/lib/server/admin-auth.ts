/**
 * Admin authorisation gate — SERVER ONLY.
 *
 * The Supabase catalog tables have NO client write policies (RLS blocks every
 * direct browser write). Admin mutations therefore go through /api/admin/*
 * routes that use the service-role client, and those routes MUST gate on this
 * helper first.
 *
 * The gate is a Clerk-authenticated user whose id is present in the
 * ADMIN_CLERK_USER_IDS allowlist (comma-separated Clerk user ids in env). This
 * keeps admin membership out of the database and trivially revocable via env.
 *
 *   const gate = await requireAdmin();
 *   if (!gate.ok) return NextResponse.json({ error: "..." }, { status: gate.status });
 *   // gate.userId is a verified admin from here on.
 *
 * Status codes: 401 = not signed in, 403 = signed in but not an admin, 503 =
 * allowlist not configured (fail closed — never default to "everyone is admin").
 */

import { auth } from "@clerk/nextjs/server";

export type AdminGate =
  | { ok: true; userId: string }
  | { ok: false; status: number };

/** Parse ADMIN_CLERK_USER_IDS ("id_a, id_b") into a trimmed, non-empty set. */
function adminAllowlist(): Set<string> {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/**
 * Resolve the caller and confirm they are an allowlisted admin.
 * Fails closed: no allowlist configured → 503, not signed in → 401,
 * signed in but not listed → 403.
 */
export async function requireAdmin(): Promise<AdminGate> {
  const allow = adminAllowlist();
  // Fail closed: an empty allowlist must never authorise anyone.
  if (allow.size === 0) return { ok: false, status: 503 };

  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401 };
  if (!allow.has(userId)) return { ok: false, status: 403 };

  return { ok: true, userId };
}

/** True when at least one admin id is configured. Lets UIs degrade gracefully. */
export function isAdminConfigured(): boolean {
  return adminAllowlist().size > 0;
}
