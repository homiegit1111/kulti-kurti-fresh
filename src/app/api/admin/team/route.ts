/**
 * Admin team API — who can get into Admin Studio, and with what powers.
 *
 *   GET    /api/admin/team
 *          → { members, envOwners, you }
 *   POST   /api/admin/team           add or re-save one person (upsert)
 *          → { member }
 *   PATCH  /api/admin/team           change role / active / note
 *          → { member }
 *   DELETE /api/admin/team?clerkUserId=user_xxx
 *          → { ok: true, removed: true }
 *
 * See docs/ADMIN_API_CONTRACT.md §7. Owner-only: `team:manage` is in the owner
 * role and nowhere else.
 *
 * TWO THINGS THIS FILE EXISTS TO PROTECT:
 *
 *   1. The owner's own access. ADMIN_CLERK_USER_IDS is the break-glass list and
 *      is checked before this table, so anyone on it cannot be locked out here.
 *      Everyone else CAN lock themselves out with one careless click, so every
 *      mutation refuses a change that would remove the caller's own access.
 *
 *   2. Freshness. Role lookups are memoised for 15s per isolate, so a revoke
 *      that only wrote a row would leave the revoked person working for another
 *      quarter minute. Every mutation calls forgetCachedRole() for the person it
 *      touched.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  guardAdmin,
  recordAudit,
  readJsonObject,
  badRequest,
  notFound,
  conflict,
  serverError,
} from "@/lib/server/admin-guard";
import {
  envOwnerIds,
  forgetCachedRole,
  isAdminRole,
  type AdminRole,
} from "@/lib/server/admin-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEMBER_COLUMNS =
  "clerk_user_id,email,display_name,role,is_active,note,created_at,last_seen_at";

/** Clerk user ids are `user_` + a base62 instance id. */
const CLERK_ID_PATTERN = /^user_[A-Za-z0-9]{10,40}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const SELF_LOCKOUT =
  "You cannot remove your own access. Ask another owner.";

type MemberRow = {
  clerk_user_id: string;
  email: string | null;
  display_name: string;
  role: AdminRole;
  is_active: boolean;
  note: string;
  created_at: string;
  last_seen_at: string | null;
};

function serializeMember(row: MemberRow) {
  return {
    clerkUserId: row.clerk_user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
    note: row.note,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function readText(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > max ? null : text;
}

function readClerkId(value: unknown): string | null {
  const id = typeof value === "string" ? value.trim() : "";
  return CLERK_ID_PATTERN.test(id) ? id : null;
}

const BAD_ID =
  'That is not a Clerk user id. Copy it from the user\'s page in Clerk — it starts with "user_".';

/**
 * Would this change take away the caller's own way back in?
 *
 * Only reachable by an owner, so any role other than `owner` loses team:manage,
 * and an inactive row resolves to no access at all. Anyone in
 * ADMIN_CLERK_USER_IDS is exempt: env is checked before this table, so their
 * access survives whatever this row says.
 */
function locksCallerOut(
  callerId: string,
  targetId: string,
  nextRole: AdminRole | null,
  nextActive: boolean | null,
): boolean {
  if (callerId !== targetId) return false;
  if (envOwnerIds().has(callerId)) return false;
  if (nextActive === false) return true;
  return nextRole !== null && nextRole !== "owner";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // No read bucket is defined for team in the contract's rate-limit table; the
  // per-IP burst guard inside guardAdmin still applies.
  const guard = await guardAdmin(req, { permission: "team:manage" });
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.ctx.db
    .from("admin_users")
    .select(MEMBER_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-team] list failed:", error.message);
    return serverError("Could not load your team list. Please refresh in a moment.");
  }

  const envOwners = envOwnerIds();
  const rows: MemberRow[] = data ?? [];

  return NextResponse.json({
    members: rows.map(serializeMember),
    envOwners: [...envOwners],
    you: {
      userId: guard.ctx.userId,
      role: guard.ctx.role,
      // resolveAdminIdentity() checks env before the table, so env membership is
      // exactly what "source" means here.
      source: envOwners.has(guard.ctx.userId) ? "env" : "database",
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "team:manage",
    mutation: true,
    rateLimit: { name: "admin-team-write", limit: 20 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.body;

  const clerkUserId = readClerkId(body.clerkUserId);
  if (!clerkUserId) return badRequest(BAD_ID);

  let role: AdminRole = "staff";
  if (has(body, "role") && body.role !== null && body.role !== undefined && body.role !== "") {
    if (!isAdminRole(body.role)) {
      return badRequest('Choose a role: "owner", "manager" or "staff".');
    }
    role = body.role;
  }

  const displayName = readText(body.displayName, 120);
  if (displayName === null) return badRequest("The name must be text of 120 characters or fewer.");

  const note = readText(body.note, 500);
  if (note === null) return badRequest("The note must be text of 500 characters or fewer.");

  const email = readText(body.email, 200);
  if (email === null) return badRequest("The email address must be text of 200 characters or fewer.");
  if (email && !EMAIL_PATTERN.test(email)) {
    return badRequest("That email address does not look right. Check it and try again.");
  }

  // The contract only requires the self-lockout guard on PATCH and DELETE, but an
  // upsert can demote just as effectively, so it is checked here too.
  if (locksCallerOut(guard.ctx.userId, clerkUserId, role, null)) {
    return conflict(SELF_LOCKOUT);
  }

  const { data: existing, error: loadError } = await db
    .from("admin_users")
    .select(MEMBER_COLUMNS)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (loadError) {
    console.error("[admin-team] load failed:", loadError.message);
    return serverError("Could not check the team list. Please try again.");
  }
  const before: MemberRow | null = existing ?? null;

  // Merge rather than blind-upsert: a save that omits the name must not wipe the
  // name already on the row.
  const row = {
    clerk_user_id: clerkUserId,
    role,
    display_name: has(body, "displayName") ? displayName : (before?.display_name ?? ""),
    note: has(body, "note") ? note : (before?.note ?? ""),
    email: has(body, "email") ? (email || null) : (before?.email ?? null),
    is_active: before?.is_active ?? true,
    created_by: before ? undefined : guard.ctx.userId,
  };

  const { data, error } = await db
    .from("admin_users")
    .upsert(row, { onConflict: "clerk_user_id" })
    .select(MEMBER_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[admin-team] upsert failed:", error?.message);
    return serverError("Could not save that team member. Please try again.");
  }

  const member: MemberRow = data;
  forgetCachedRole(clerkUserId);

  await recordAudit(guard.ctx, {
    action: "admin_user.upsert",
    entityType: "admin_user",
    entityId: clerkUserId,
    ...(before
      ? { beforeState: { role: before.role, is_active: before.is_active } }
      : {}),
    afterState: { role: member.role, is_active: member.is_active },
  });

  return NextResponse.json({ member: serializeMember(member) });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "team:manage",
    mutation: true,
    rateLimit: { name: "admin-team-write", limit: 20 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.body;

  const clerkUserId = readClerkId(body.clerkUserId);
  if (!clerkUserId) return badRequest(BAD_ID);

  let nextRole: AdminRole | null = null;
  if (has(body, "role") && body.role !== null && body.role !== undefined && body.role !== "") {
    if (!isAdminRole(body.role)) {
      return badRequest('Choose a role: "owner", "manager" or "staff".');
    }
    nextRole = body.role;
  }

  let nextActive: boolean | null = null;
  if (has(body, "isActive") && body.isActive !== null && body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return badRequest("Switch access on or off — that value was neither.");
    }
    nextActive = body.isActive;
  }

  let nextNote: string | null = null;
  if (has(body, "note")) {
    nextNote = readText(body.note, 500);
    if (nextNote === null) return badRequest("The note must be text of 500 characters or fewer.");
  }

  if (nextRole === null && nextActive === null && nextNote === null) {
    return badRequest("Nothing to change. Set a role, switch access on or off, or edit the note.");
  }

  if (locksCallerOut(guard.ctx.userId, clerkUserId, nextRole, nextActive)) {
    return conflict(SELF_LOCKOUT);
  }

  const { data: existing, error: loadError } = await db
    .from("admin_users")
    .select(MEMBER_COLUMNS)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (loadError) {
    console.error("[admin-team] load failed:", loadError.message);
    return serverError("Could not open that team member. Please try again.");
  }
  if (!existing) {
    return notFound("That person is not on your team list yet. Add them first.");
  }
  const before: MemberRow = existing;

  const patch: Record<string, unknown> = {};
  if (nextRole !== null) patch.role = nextRole;
  if (nextActive !== null) patch.is_active = nextActive;
  if (nextNote !== null) patch.note = nextNote;

  const { data, error } = await db
    .from("admin_users")
    .update(patch)
    .eq("clerk_user_id", clerkUserId)
    .select(MEMBER_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[admin-team] update failed:", error?.message);
    return serverError("Could not save that change. Please try again.");
  }

  const member: MemberRow = data;
  forgetCachedRole(clerkUserId);

  await recordAudit(guard.ctx, {
    action: "admin_user.update",
    entityType: "admin_user",
    entityId: clerkUserId,
    beforeState: { role: before.role, is_active: before.is_active, note: before.note },
    afterState: { role: member.role, is_active: member.is_active, note: member.note },
  });

  return NextResponse.json({ member: serializeMember(member) });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "team:manage",
    mutation: true,
    rateLimit: { name: "admin-team-write", limit: 20 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const clerkUserId = readClerkId(req.nextUrl.searchParams.get("clerkUserId"));
  if (!clerkUserId) return badRequest(BAD_ID);

  // Removing the row removes the access, so this is the same lockout as a
  // deactivation.
  if (locksCallerOut(guard.ctx.userId, clerkUserId, null, false)) {
    return conflict(SELF_LOCKOUT);
  }

  const { data: existing, error: loadError } = await db
    .from("admin_users")
    .select(MEMBER_COLUMNS)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (loadError) {
    console.error("[admin-team] load failed:", loadError.message);
    return serverError("Could not open that team member. Please try again.");
  }
  if (!existing) {
    return notFound("That person is not on your team list.");
  }
  const before: MemberRow = existing;

  const { error } = await db
    .from("admin_users")
    .delete()
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    console.error("[admin-team] delete failed:", error.message);
    return serverError("Could not remove that team member. Please try again.");
  }

  forgetCachedRole(clerkUserId);

  await recordAudit(guard.ctx, {
    action: "admin_user.remove",
    entityType: "admin_user",
    entityId: clerkUserId,
    beforeState: {
      role: before.role,
      is_active: before.is_active,
      display_name: before.display_name,
    },
  });

  return NextResponse.json({ ok: true, removed: true });
}
