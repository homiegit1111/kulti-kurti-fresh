/**
 * Admin single-offer API — update + retire.
 *
 *   PATCH  /api/admin/promotions/:id   application/json
 *          → { promotion: AdminPromotion }
 *   DELETE /api/admin/promotions/:id
 *          → { ok: true, deleted: true } | { ok: true, deactivated: true }
 *
 * See docs/ADMIN_API_CONTRACT.md §6.
 *
 * DELETE is deliberately not always a delete. Once an offer has been redeemed,
 * commerce_promotion_redemptions rows point at it and those rows ARE the record
 * of what a buyer was charged, so the offer is switched off instead of removed.
 *
 * The validation below duplicates the copy in ../route.ts on purpose: a route
 * file may not export anything but its HTTP methods, so the two handlers cannot
 * share a parser without a third module. Keep them in step.
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
  revalidateStorefront,
} from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One string literal, not a concatenation: supabase-js parses the select list at
// the type level, and `a + b` widens to `string`, which it cannot parse — the
// query then types its rows as GenericStringError[]. Keep this on one line.
const PROMOTION_COLUMNS =
  "id,code,title,description,kind,value_percent,value_inr,scope,scope_handles,min_sets,min_subtotal_inr,starts_at,ends_at,is_active,max_redemptions,max_redemptions_per_buyer,redemption_count,badge_label,priority,created_at";

type PromotionKind = "percent" | "flat_inr" | "free_shipping";
type PromotionScope = "all" | "collection" | "product";
type PromotionState = "scheduled" | "live" | "expired" | "paused" | "exhausted";

type PromotionRow = {
  id: string;
  code: string | null;
  title: string;
  description: string;
  kind: PromotionKind;
  value_percent: number | null;
  value_inr: number | null;
  scope: PromotionScope;
  scope_handles: string[];
  min_sets: number;
  min_subtotal_inr: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  max_redemptions: number | null;
  max_redemptions_per_buyer: number | null;
  redemption_count: number;
  badge_label: string;
  priority: number;
  created_at: string;
};

/**
 * The writable columns. `redemption_count` is deliberately absent: it is owned
 * by claim_promotion_redemption() and must never be settable from a request, or
 * an owner could hand out a limited offer twice by editing the counter.
 */
type PromotionDraft = Omit<PromotionRow, "id" | "redemption_count" | "created_at">;

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const HANDLE_PATTERN = /^[a-z0-9-]{1,120}$/;

/** ₹1 crore. Not a business rule — it keeps a fat-fingered amount inside int4
 *  so the owner reads a sentence instead of a Postgres overflow. */
const MAX_RUPEES = 10_000_000;
const MAX_REDEMPTIONS = 1_000_000;

const INVALID = "invalid" as const;

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

/** Blank, null and undefined all mean "cleared". Anything else must be whole. */
function optionalInt(value: unknown): number | null | typeof INVALID {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value.trim())
        : NaN;
  return Number.isInteger(n) ? n : INVALID;
}

function optionalTimestamp(value: unknown): string | null | typeof INVALID {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return INVALID;
  const at = new Date(value.trim());
  return Number.isNaN(at.getTime()) ? INVALID : at.toISOString();
}

function resolveText(
  body: Record<string, unknown>,
  key: string,
  fallback: string,
  max: number,
  label: string,
): ParseResult<string> {
  if (!has(body, key)) return { ok: true, value: fallback };
  const raw = body[key];
  if (raw === null || raw === undefined) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false, error: `${label} must be text.` };
  const text = raw.trim();
  if (text.length > max) {
    return { ok: false, error: `${label} is ${text.length} characters — the limit is ${max}.` };
  }
  return { ok: true, value: text };
}

/** A cleared numeric field reads as `min`, which is 0 for every field here. */
function resolveBoundedInt(
  body: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
  message: string,
): ParseResult<number> {
  if (!has(body, key)) return { ok: true, value: fallback };
  const n = optionalInt(body[key]);
  if (n === INVALID) return { ok: false, error: message };
  if (n === null) return { ok: true, value: min };
  if (n < min || n > max) return { ok: false, error: message };
  return { ok: true, value: n };
}

function resolveLimit(
  body: Record<string, unknown>,
  key: string,
  fallback: number | null,
  message: string,
): ParseResult<number | null> {
  if (!has(body, key)) return { ok: true, value: fallback };
  const n = optionalInt(body[key]);
  if (n === INVALID) return { ok: false, error: message };
  if (n === null) return { ok: true, value: null };
  if (n < 1 || n > MAX_REDEMPTIONS) return { ok: false, error: message };
  return { ok: true, value: n };
}

/**
 * Validate a patch against the current row and return the full row to write.
 * Every rule the database enforces is checked here first, so a bad combination
 * surfaces as a sentence the owner can act on rather than "violates constraint
 * commerce_promotions_value_shape".
 */
function parsePromotion(
  body: Record<string, unknown>,
  existing: PromotionDraft,
): ParseResult<PromotionDraft> {
  const base = existing;

  const titleResult = resolveText(body, "title", base.title, 120, "The offer name");
  if (!titleResult.ok) return titleResult;
  const title = titleResult.value;
  if (!title) {
    return {
      ok: false,
      error: "Give the offer a name so you can recognise it in the list.",
    };
  }

  const descriptionResult = resolveText(
    body,
    "description",
    base.description,
    600,
    "The offer description",
  );
  if (!descriptionResult.ok) return descriptionResult;

  const badgeResult = resolveText(body, "badgeLabel", base.badge_label, 40, "The badge text");
  if (!badgeResult.ok) return badgeResult;

  let kind = base.kind;
  if (has(body, "kind")) {
    const raw = readString(body.kind);
    if (raw !== "percent" && raw !== "flat_inr" && raw !== "free_shipping") {
      return {
        ok: false,
        error:
          'Choose what the offer does: "percent" for a percentage off, "flat_inr" for a rupee amount off, or "free_shipping".',
      };
    }
    kind = raw;
  }

  // commerce_promotions_value_shape: exactly one amount, matching the kind. This
  // is the check that stops "50% off" ever being stored as "₹50 off".
  let valuePercent = base.value_percent;
  let valueInr = base.value_inr;
  const percentGiven = has(body, "valuePercent") ? optionalInt(body.valuePercent) : undefined;
  const inrGiven = has(body, "valueInr") ? optionalInt(body.valueInr) : undefined;

  if (kind === "percent") {
    if (inrGiven !== undefined && inrGiven !== null) {
      return {
        ok: false,
        error: "A percentage offer cannot also carry a rupee amount. Clear the rupee field.",
      };
    }
    if (percentGiven !== undefined) {
      if (percentGiven === INVALID) {
        return { ok: false, error: "A percentage offer needs a whole number between 1 and 90." };
      }
      valuePercent = percentGiven;
    }
    if (valuePercent === null || valuePercent < 1 || valuePercent > 90) {
      return { ok: false, error: "A percentage offer needs a discount between 1% and 90%." };
    }
    // Switching an offer from rupees to percent must clear the old amount, or
    // the value-shape constraint would reject the update.
    valueInr = null;
  } else if (kind === "flat_inr") {
    if (percentGiven !== undefined && percentGiven !== null) {
      return {
        ok: false,
        error: "A rupee-off offer cannot also carry a percentage. Clear the percentage field.",
      };
    }
    if (inrGiven !== undefined) {
      if (inrGiven === INVALID) {
        return { ok: false, error: "A rupee-off offer needs a whole-rupee amount." };
      }
      valueInr = inrGiven;
    }
    if (valueInr === null || valueInr < 1 || valueInr > MAX_RUPEES) {
      return { ok: false, error: "A rupee-off offer needs an amount between ₹1 and ₹1 crore." };
    }
    valuePercent = null;
  } else {
    if (
      (percentGiven !== undefined && percentGiven !== null) ||
      (inrGiven !== undefined && inrGiven !== null)
    ) {
      return {
        ok: false,
        error:
          "A free shipping offer carries no discount amount. Clear the percentage and rupee fields.",
      };
    }
    valuePercent = null;
    valueInr = null;
  }

  let code = base.code;
  if (has(body, "code")) {
    const raw = body.code;
    if (raw === null || raw === undefined || raw === "") {
      // Blank means automatic: the offer applies with no coupon to type.
      code = null;
    } else if (typeof raw !== "string") {
      return {
        ok: false,
        error: "The coupon code must be text, or left blank for an automatic offer.",
      };
    } else {
      const normalised = raw.trim().toUpperCase();
      if (!normalised) {
        code = null;
      } else if (!CODE_PATTERN.test(normalised)) {
        return {
          ok: false,
          error:
            "A coupon code is 3 to 32 characters — letters, numbers, dashes or underscores, starting with a letter or number.",
        };
      } else {
        code = normalised;
      }
    }
  }

  let scope = base.scope;
  if (has(body, "scope")) {
    const raw = readString(body.scope);
    if (raw !== "all" && raw !== "collection" && raw !== "product") {
      return {
        ok: false,
        error:
          'Choose where the offer applies: "all" for the whole store, "collection", or "product".',
      };
    }
    scope = raw;
  }

  let scopeHandles = base.scope_handles;
  if (has(body, "scopeHandles")) {
    const raw = body.scopeHandles;
    if (!Array.isArray(raw)) {
      return { ok: false, error: "The list of collections or styles must be a list." };
    }
    if (raw.length > 50) {
      return { ok: false, error: "An offer can cover at most 50 collections or styles." };
    }
    const cleaned: string[] = [];
    for (const entry of raw) {
      const handle = readString(entry);
      if (handle === null || !HANDLE_PATTERN.test(handle)) {
        return {
          ok: false,
          error:
            'Each collection or style must be given by its web address, like "festive-edit" — lowercase letters, numbers and dashes only.',
        };
      }
      if (!cleaned.includes(handle)) cleaned.push(handle);
    }
    scopeHandles = cleaned;
  }

  // commerce_promotions_scope_shape: anything narrower than the whole store has
  // to name what it covers, or the offer would quietly apply to nothing.
  if (scope === "all") {
    scopeHandles = [];
  } else if (scopeHandles.length === 0) {
    return {
      ok: false,
      error:
        scope === "collection"
          ? "Pick at least one collection for this offer, or set it to apply to the whole store."
          : "Pick at least one style for this offer, or set it to apply to the whole store.",
    };
  }

  let startsAt = base.starts_at;
  if (has(body, "startsAt")) {
    const parsed = optionalTimestamp(body.startsAt);
    if (parsed === INVALID) {
      return { ok: false, error: "The start date is not a date we can read. Leave it blank to start now." };
    }
    startsAt = parsed;
  }

  let endsAt = base.ends_at;
  if (has(body, "endsAt")) {
    const parsed = optionalTimestamp(body.endsAt);
    if (parsed === INVALID) {
      return { ok: false, error: "The end date is not a date we can read. Leave it blank for no expiry." };
    }
    endsAt = parsed;
  }

  // commerce_promotions_window.
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, error: "The offer has to end after it starts. Check the two dates." };
  }

  const minSetsResult = resolveBoundedInt(
    body,
    "minSets",
    base.min_sets,
    0,
    10_000,
    "The minimum number of sets must be a whole number from 0 to 10000.",
  );
  if (!minSetsResult.ok) return minSetsResult;

  const minSubtotalResult = resolveBoundedInt(
    body,
    "minSubtotalInr",
    base.min_subtotal_inr,
    0,
    MAX_RUPEES,
    "The minimum order value must be a whole-rupee amount from ₹0 to ₹1 crore.",
  );
  if (!minSubtotalResult.ok) return minSubtotalResult;

  const priorityResult = resolveBoundedInt(
    body,
    "priority",
    base.priority,
    0,
    1_000,
    "Priority must be a whole number from 0 to 1000. Higher wins when two offers could both apply.",
  );
  if (!priorityResult.ok) return priorityResult;

  const maxRedemptionsResult = resolveLimit(
    body,
    "maxRedemptions",
    base.max_redemptions,
    "The total usage limit must be a whole number above 0, or left blank for unlimited.",
  );
  if (!maxRedemptionsResult.ok) return maxRedemptionsResult;

  const perBuyerResult = resolveLimit(
    body,
    "maxRedemptionsPerBuyer",
    base.max_redemptions_per_buyer,
    "The per-buyer usage limit must be a whole number above 0, or left blank for unlimited.",
  );
  if (!perBuyerResult.ok) return perBuyerResult;

  let isActive = base.is_active;
  if (has(body, "isActive")) {
    if (typeof body.isActive !== "boolean") {
      return { ok: false, error: "Switch the offer on or off — that value was neither." };
    }
    isActive = body.isActive;
  }

  return {
    ok: true,
    value: {
      code,
      title,
      description: descriptionResult.value,
      kind,
      value_percent: valuePercent,
      value_inr: valueInr,
      scope,
      scope_handles: scopeHandles,
      min_sets: minSetsResult.value,
      min_subtotal_inr: minSubtotalResult.value,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: isActive,
      max_redemptions: maxRedemptionsResult.value,
      max_redemptions_per_buyer: perBuyerResult.value,
      badge_label: badgeResult.value,
      priority: priorityResult.value,
    },
  };
}

/** Precedence matters: a paused offer is paused even if it is also expired. */
function promotionState(row: PromotionRow, now: number): PromotionState {
  if (!row.is_active) return "paused";
  if (row.max_redemptions !== null && row.redemption_count >= row.max_redemptions) {
    return "exhausted";
  }
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return "scheduled";
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return "expired";
  return "live";
}

function serializePromotion(row: PromotionRow, now: number) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    kind: row.kind,
    valuePercent: row.value_percent,
    valueInr: row.value_inr,
    scope: row.scope,
    scopeHandles: row.scope_handles ?? [],
    minSets: row.min_sets,
    minSubtotalInr: row.min_subtotal_inr,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    maxRedemptions: row.max_redemptions,
    maxRedemptionsPerBuyer: row.max_redemptions_per_buyer,
    redemptionCount: row.redemption_count,
    badgeLabel: row.badge_label,
    priority: row.priority,
    createdAt: row.created_at,
    state: promotionState(row, now),
  };
}

function draftFromRow(row: PromotionRow): PromotionDraft {
  return {
    code: row.code,
    title: row.title,
    description: row.description,
    kind: row.kind,
    value_percent: row.value_percent,
    value_inr: row.value_inr,
    scope: row.scope,
    scope_handles: row.scope_handles ?? [],
    min_sets: row.min_sets,
    min_subtotal_inr: row.min_subtotal_inr,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_active: row.is_active,
    max_redemptions: row.max_redemptions,
    max_redemptions_per_buyer: row.max_redemptions_per_buyer,
    badge_label: row.badge_label,
    priority: row.priority,
  };
}

function auditState(draft: PromotionDraft): Record<string, unknown> {
  return {
    code: draft.code,
    title: draft.title,
    kind: draft.kind,
    value_percent: draft.value_percent,
    value_inr: draft.value_inr,
    scope: draft.scope,
    scope_handles: draft.scope_handles,
    min_sets: draft.min_sets,
    min_subtotal_inr: draft.min_subtotal_inr,
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    is_active: draft.is_active,
    max_redemptions: draft.max_redemptions,
    max_redemptions_per_buyer: draft.max_redemptions_per_buyer,
    priority: draft.priority,
  };
}

const GONE = "That offer is no longer here. It may have been deleted — refresh the list.";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "offers:write",
    mutation: true,
    rateLimit: { name: "admin-offers-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { id } = await params;
  // A malformed id would make Postgres raise 22P02 and read as a server fault;
  // to the owner it is simply an offer we do not have.
  if (!id || !UUID_PATTERN.test(id)) return notFound(GONE);

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;

  const { data: existing, error: loadError } = await db
    .from("commerce_promotions")
    .select(PROMOTION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[admin-promotions] load failed:", loadError.message);
    return serverError("Could not open that offer. Please refresh and try again.");
  }
  if (!existing) return notFound(GONE);
  const current: PromotionRow = existing;

  const parsed = parsePromotion(parsedBody.body, draftFromRow(current));
  if (!parsed.ok) return badRequest(parsed.error);

  const { data, error } = await db
    .from("commerce_promotions")
    .update(parsed.value)
    .eq("id", id)
    .select(PROMOTION_COLUMNS)
    .single();

  if (error || !data) {
    // 23505 is the unique index on upper(code).
    if (error?.code === "23505") return conflict("That code is already in use.");
    console.error("[admin-promotions] update failed:", error?.message);
    return serverError("Could not save your changes to the offer. Please try again.");
  }

  const updated: PromotionRow = data;
  await recordAudit(guard.ctx, {
    action: "promotion.update",
    entityType: "promotion",
    entityId: id,
    beforeState: auditState(draftFromRow(current)),
    afterState: auditState(parsed.value),
  });
  await revalidateStorefront(["/", "/shop"]);

  return NextResponse.json({ promotion: serializePromotion(updated, Date.now()) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "offers:write",
    mutation: true,
    rateLimit: { name: "admin-offers-write", limit: 60 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { id } = await params;
  if (!id || !UUID_PATTERN.test(id)) return notFound(GONE);

  const { data: existing, error: loadError } = await db
    .from("commerce_promotions")
    .select("id,code,title,is_active,redemption_count")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[admin-promotions] load failed:", loadError.message);
    return serverError("Could not open that offer. Please refresh and try again.");
  }
  if (!existing) return notFound(GONE);

  const current: Pick<
    PromotionRow,
    "id" | "code" | "title" | "is_active" | "redemption_count"
  > = existing;

  // Redeemed offers are switched off, never removed: the redemption rows are the
  // record of what a buyer was actually charged, and deleting the offer would
  // cascade them away.
  if (current.redemption_count > 0) {
    const { error } = await db
      .from("commerce_promotions")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      console.error("[admin-promotions] deactivate failed:", error.message);
      return serverError("Could not switch that offer off. Please try again.");
    }

    await recordAudit(guard.ctx, {
      action: "promotion.delete",
      entityType: "promotion",
      entityId: id,
      beforeState: {
        code: current.code,
        title: current.title,
        is_active: current.is_active,
      },
      afterState: { is_active: false },
      metadata: {
        deactivated: true,
        reason: "already redeemed",
        redemption_count: current.redemption_count,
      },
    });
    await revalidateStorefront(["/", "/shop"]);

    return NextResponse.json({ ok: true, deactivated: true });
  }

  const { error } = await db.from("commerce_promotions").delete().eq("id", id);
  if (error) {
    console.error("[admin-promotions] delete failed:", error.message);
    return serverError("Could not delete that offer. Please try again.");
  }

  await recordAudit(guard.ctx, {
    action: "promotion.delete",
    entityType: "promotion",
    entityId: id,
    beforeState: {
      code: current.code,
      title: current.title,
      is_active: current.is_active,
    },
    metadata: { deleted: true },
  });
  await revalidateStorefront(["/", "/shop"]);

  return NextResponse.json({ ok: true, deleted: true });
}
