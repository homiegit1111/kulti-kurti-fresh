/**
 * Admin pricing API — the wholesale rules.
 *
 *   GET   /api/admin/pricing   → MOQ, set size, size ratio, discount ladder
 *   PATCH /api/admin/pricing   → replace them
 *
 * These two tables decide what a buyer is charged: create_commerce_checkout
 * reads commerce_pricing_config for the minimum order and set size, and
 * commerce_discount_percent_for_sets() reads commerce_pricing_tiers for the
 * discount. The storefront quotes from the same rows, which is what keeps the
 * quoted price and the charged price from drifting apart.
 *
 * Hence `pricing:write` is owner-only, the rate budget is small, and the audit
 * row carries the complete before and after — this is the one change in the
 * back-office where "what did it used to say" is a money question.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  badRequest,
  guardAdmin,
  readJsonObject,
  recordAudit,
  revalidateStorefront,
  serverError,
} from "@/lib/server/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIG_SELECT = "minimum_order_sets,set_size,size_ratio,currency";
const TIER_SELECT = "min_sets,discount_percent,label";

const SETS_MIN = 1;
const SETS_MAX = 1000;
const SIZE_RATIO_MAX = 40;
const TIER_MIN_ROWS = 1;
const TIER_MAX_ROWS = 8;
const MIN_SETS_MAX = 10_000;
const DISCOUNT_MAX = 50;
const LABEL_MAX = 80;

type ConfigRow = {
  minimum_order_sets: number | null;
  set_size: number | null;
  size_ratio: string | null;
  currency: string | null;
};

type TierRow = {
  min_sets: number | null;
  discount_percent: number | null;
  label: string | null;
};

type ConfigWrite = {
  minimum_order_sets: number;
  set_size: number;
  size_ratio: string;
};

type TierWrite = {
  min_sets: number;
  discount_percent: number;
  label: string;
};

/** Defaults mirror the column defaults, so a missing config row reads sensibly. */
const CONFIG_FALLBACK = {
  minimum_order_sets: 4,
  set_size: 4,
  size_ratio: "S/M/L/XL",
  currency: "INR",
} as const;

function configResponse(row: ConfigRow | null): Record<string, unknown> {
  return {
    minimumOrderSets: row?.minimum_order_sets ?? CONFIG_FALLBACK.minimum_order_sets,
    setSize: row?.set_size ?? CONFIG_FALLBACK.set_size,
    sizeRatio: row?.size_ratio ?? CONFIG_FALLBACK.size_ratio,
    currency: row?.currency ?? CONFIG_FALLBACK.currency,
  };
}

function tiersResponse(rows: TierRow[]): Record<string, unknown>[] {
  return rows.map((row) => ({
    minSets: row.min_sets ?? 0,
    discountPercent: row.discount_percent ?? 0,
    label: row.label ?? "",
  }));
}

function integerOrNull(v: unknown): number | null {
  const n =
    typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:read",
    rateLimit: { name: "admin-pricing-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const [configResult, tierResult] = await Promise.all([
    db.from("commerce_pricing_config").select(CONFIG_SELECT).eq("id", true).maybeSingle(),
    db.from("commerce_pricing_tiers").select(TIER_SELECT).order("min_sets", { ascending: true }),
  ]);

  if (configResult.error) {
    console.error("[admin-pricing] config read failed:", configResult.error.message);
    return serverError("Could not load the pricing rules right now. Please try again.");
  }
  if (tierResult.error) {
    console.error("[admin-pricing] tier read failed:", tierResult.error.message);
    return serverError("Could not load the discount ladder right now. Please try again.");
  }

  return NextResponse.json({
    config: configResponse(configResult.data as ConfigRow | null),
    tiers: tiersResponse((tierResult.data ?? []) as TierRow[]),
  });
}

function parseConfig(
  raw: unknown,
): { ok: true; value: ConfigWrite } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Send the pricing rules to save." };
  }
  const c = raw as Record<string, unknown>;

  const minimumOrderSets = integerOrNull(c.minimumOrderSets);
  if (minimumOrderSets === null || minimumOrderSets < SETS_MIN || minimumOrderSets > SETS_MAX) {
    return {
      ok: false,
      error: `The minimum order must be a whole number of sets between ${SETS_MIN} and ${SETS_MAX}.`,
    };
  }

  const setSize = integerOrNull(c.setSize);
  if (setSize === null || setSize < SETS_MIN || setSize > SETS_MAX) {
    return {
      ok: false,
      error: `The set size must be a whole number of pieces between ${SETS_MIN} and ${SETS_MAX}.`,
    };
  }

  const sizeRatio = typeof c.sizeRatio === "string" ? c.sizeRatio.trim() : "";
  if (!sizeRatio) {
    return { ok: false, error: "Say what a set contains, for example S/M/L/XL." };
  }
  if (sizeRatio.length > SIZE_RATIO_MAX) {
    return {
      ok: false,
      error: `The set contents is ${sizeRatio.length} characters — the limit is ${SIZE_RATIO_MAX}.`,
    };
  }

  return { ok: true, value: { minimum_order_sets: minimumOrderSets, set_size: setSize, size_ratio: sizeRatio } };
}

function parseTiers(
  raw: unknown,
): { ok: true; value: TierWrite[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Send the discount ladder to save." };
  }
  if (raw.length < TIER_MIN_ROWS || raw.length > TIER_MAX_ROWS) {
    return {
      ok: false,
      error: `The discount ladder needs between ${TIER_MIN_ROWS} and ${TIER_MAX_ROWS} steps.`,
    };
  }

  const tiers: TierWrite[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    const label = `Step ${i + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `${label} of the discount ladder is not filled in.` };
    }
    const t = entry as Record<string, unknown>;

    const minSets = integerOrNull(t.minSets);
    if (minSets === null || minSets < 0 || minSets > MIN_SETS_MAX) {
      return {
        ok: false,
        error: `${label}: "from this many sets" must be a whole number between 0 and ${MIN_SETS_MAX}.`,
      };
    }
    if (seen.has(minSets)) {
      return {
        ok: false,
        error: `Two steps both start at ${minSets} sets. Each step must start at a different number.`,
      };
    }
    seen.add(minSets);

    const discountPercent = integerOrNull(t.discountPercent);
    if (discountPercent === null || discountPercent < 0 || discountPercent > DISCOUNT_MAX) {
      return {
        ok: false,
        error: `${label}: the discount must be a whole percentage between 0 and ${DISCOUNT_MAX}.`,
      };
    }

    const labelText = typeof t.label === "string" ? t.label.trim() : "";
    if (labelText.length > LABEL_MAX) {
      return {
        ok: false,
        error: `${label}: the name is ${labelText.length} characters — the limit is ${LABEL_MAX}.`,
      };
    }

    tiers.push({ min_sets: minSets, discount_percent: discountPercent, label: labelText });
  }

  // commerce_discount_percent_for_sets() picks the highest tier at or below the
  // basket size and falls back to 0 when none matches. Without a step at 0 that
  // fallback would silently price small baskets, so the base step is required
  // rather than assumed.
  if (!seen.has(0)) {
    return {
      ok: false,
      error: "The first step must start at 0 sets, so every order has a price.",
    };
  }

  tiers.sort((a, b) => a.min_sets - b.min_sets);
  return { ok: true, value: tiers };
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "pricing:write",
    mutation: true,
    rateLimit: { name: "admin-pricing-write", limit: 20 },
  });
  if (!guard.ok) return guard.response;
  const { db, userId } = guard.ctx;

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) return parsedBody.response;

  const parsedConfig = parseConfig(parsedBody.body.config);
  if (!parsedConfig.ok) return badRequest(parsedConfig.error);
  const parsedTiers = parseTiers(parsedBody.body.tiers);
  if (!parsedTiers.ok) return badRequest(parsedTiers.error);

  // Read the full previous state BEFORE touching anything: this is the audit row
  // that answers "what were we charging last Tuesday", so it has to be complete.
  const [beforeConfig, beforeTiers] = await Promise.all([
    db.from("commerce_pricing_config").select(CONFIG_SELECT).eq("id", true).maybeSingle(),
    db.from("commerce_pricing_tiers").select(TIER_SELECT).order("min_sets", { ascending: true }),
  ]);
  if (beforeConfig.error || beforeTiers.error) {
    console.error(
      "[admin-pricing] pre-read failed:",
      beforeConfig.error?.message ?? beforeTiers.error?.message,
    );
    return serverError("Could not read the current pricing rules. Nothing was changed.");
  }

  const { error: configError } = await db
    .from("commerce_pricing_config")
    .upsert({ id: true, ...parsedConfig.value, updated_by: userId }, { onConflict: "id" });
  if (configError) {
    console.error("[admin-pricing] config write failed:", configError.message);
    return serverError("Could not save the pricing rules. Nothing was changed.");
  }

  // The ladder is replaced in ONE database transaction, via an RPC, rather than a
  // delete followed by an upsert over PostgREST.
  //
  // PostgREST has no transaction spanning two calls. Deleting the removed steps
  // and then failing to write the new ones would leave the ladder missing a step,
  // and a 20-set basket would silently be quoted at the 8-set rate — the buyer
  // overcharged against the owner's intent, with nothing on screen to say so.
  // admin_replace_pricing_tiers() validates the shape, then does both statements
  // atomically: the ladder is either the old one or the new one, never a blend.
  const { data: afterTierData, error: tierError } = await db.rpc(
    "admin_replace_pricing_tiers",
    {
      p_tiers: parsedTiers.value.map((tier) => ({
        minSets: tier.min_sets,
        discountPercent: tier.discount_percent,
        label: tier.label,
      })),
      p_actor: userId,
    },
  );
  if (tierError) {
    console.error("[admin-pricing] tier write failed:", tierError.message);
    // Nothing was applied, so this is safe to state plainly.
    return serverError(
      "Could not save the discount ladder. The ladder is unchanged — check the values and try again.",
    );
  }

  const afterTiers = (afterTierData ?? []) as TierRow[];
  // `currency` is not editable here, so it is carried over rather than defaulted.
  const previousCurrency =
    (beforeConfig.data as ConfigRow | null)?.currency ?? CONFIG_FALLBACK.currency;

  await recordAudit(guard.ctx, {
    action: "pricing.update",
    entityType: "settings",
    entityId: "pricing",
    beforeState: {
      config: (beforeConfig.data as ConfigRow | null) ?? null,
      tiers: (beforeTiers.data ?? []) as TierRow[],
    },
    afterState: {
      config: parsedConfig.value,
      tiers: afterTiers,
    },
  });

  await revalidateStorefront(["/", "/shop", "/collections"]);

  return NextResponse.json({
    ok: true,
    config: configResponse({ ...parsedConfig.value, currency: previousCurrency }),
    tiers: tiersResponse(afterTiers),
  });
}
