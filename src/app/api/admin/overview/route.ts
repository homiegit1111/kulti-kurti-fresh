/**
 * Admin dashboard — the whole overview in one round trip.
 *
 *   GET /api/admin/overview
 *       → { catalog, stock, orders, content, offers, media, revenue,
 *           recentAudit, health }
 *
 * See docs/ADMIN_API_CONTRACT.md §9.
 *
 * Every tile that can be a `head: true, count: "exact"` query is one — the server
 * asks Postgres for a number and receives a number. The tempting version of this
 * file selects rows and reads `.length`, which turns a dashboard load into
 * megabytes of transfer that grows with the catalog.
 *
 * Three figures genuinely cannot be counts, because each needs one column
 * compared against another (low stock, offer state) or a SUM (revenue), and
 * PostgREST expresses neither. Those three are narrow, capped column reads, and
 * each carries a comment saying so. Nothing else here returns rows.
 *
 * `health` reports whether env is configured. Booleans only — never a key, never
 * a prefix of a key, never a length. This response goes to a browser.
 */

import { NextResponse, type NextRequest } from "next/server";
import { guardAdmin, serverError } from "@/lib/server/admin-guard";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getRazorpayReadiness } from "@/lib/payments/razorpay-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_COLUMNS =
  "id,actor_clerk_user_id,action,entity_type,entity_id," +
  "before_state,after_state,metadata,created_at";

const RECENT_AUDIT_LIMIT = 8;

/**
 * Caps on the three reads that cannot be counts. All are generous for a shop of
 * this size; when one is reached the figure becomes a floor rather than a total,
 * which is the right way for a dashboard number to fail. Revenue is the one that
 * will reach its cap first — swap it for a Postgres SUM when it does.
 */
const STOCK_SCAN_CAP = 2_000;
const REVENUE_SCAN_CAP = 10_000;
const OFFER_SCAN_CAP = 500;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type CountResponse = { count: number | null; error: { message: string } | null };

type StockScanRow = { inventory_quantity: number; low_stock_threshold: number };
type RevenueRow = { total_inr: number; created_at: string };
type OfferRow = {
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  redemption_count: number;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = await guardAdmin(req, {
    permission: "catalog:read",
    rateLimit: { name: "admin-overview-read", limit: 120 },
  });
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const failed: string[] = [];
  async function count(label: string, query: PromiseLike<CountResponse>): Promise<number> {
    const { count: total, error } = await query;
    if (error) {
      console.error(`[admin-overview] ${label} count failed:`, error.message);
      failed.push(label);
      return 0;
    }
    return total ?? 0;
  }

  const now = Date.now();
  const since = now - THIRTY_DAYS_MS;

  const countsPromise = Promise.all([
    count(
      "catalog.published",
      db
        .from("commerce_products")
        .select("*", { head: true, count: "exact" })
        .eq("status", "published")
        .is("deleted_at", null),
    ),
    count(
      "catalog.draft",
      db
        .from("commerce_products")
        .select("*", { head: true, count: "exact" })
        .eq("status", "draft")
        .is("deleted_at", null),
    ),
    count(
      "catalog.collections",
      db.from("commerce_collections").select("*", { head: true, count: "exact" }),
    ),
    count(
      "stock.tracked",
      db
        .from("commerce_product_variants")
        .select("*", { head: true, count: "exact" })
        .eq("manage_inventory", true)
        .is("archived_at", null),
    ),
    count(
      "stock.out",
      db
        .from("commerce_product_variants")
        .select("*", { head: true, count: "exact" })
        .eq("manage_inventory", true)
        .is("archived_at", null)
        .lte("inventory_quantity", 0),
    ),
    count(
      "orders.pendingPayment",
      db
        .from("commerce_orders")
        .select("*", { head: true, count: "exact" })
        .eq("status", "pending_payment"),
    ),
    count(
      "orders.paid",
      db
        .from("commerce_orders")
        .select("*", { head: true, count: "exact" })
        .eq("status", "paid"),
    ),
    count(
      "orders.fulfilled",
      db
        .from("commerce_orders")
        .select("*", { head: true, count: "exact" })
        .eq("status", "fulfilled"),
    ),
    count(
      "orders.paymentReview",
      db
        .from("commerce_orders")
        .select("*", { head: true, count: "exact" })
        .eq("status", "payment_review"),
    ),
    count(
      "content.pendingDrafts",
      db.from("site_content_drafts").select("*", { head: true, count: "exact" }),
    ),
    count(
      "media.images",
      db
        .from("media_assets")
        .select("*", { head: true, count: "exact" })
        .eq("status", "ready")
        .eq("kind", "image"),
    ),
    count(
      "media.videos",
      db
        .from("media_assets")
        .select("*", { head: true, count: "exact" })
        .eq("status", "ready")
        .eq("kind", "video"),
    ),
    count(
      "pricing.baseTier",
      db
        .from("commerce_pricing_tiers")
        .select("*", { head: true, count: "exact" })
        .eq("min_sets", 0),
    ),
  ]);

  // "Low" compares two columns (inventory_quantity <= low_stock_threshold), which
  // PostgREST cannot express as a filter and no view or RPC exposes. Two integers
  // per at-risk variant is the cheapest honest way to get it. The `> 0` filter
  // keeps low and out disjoint, the way the stock page counts them.
  const lowStockPromise = db
    .from("commerce_product_variants")
    .select("inventory_quantity,low_stock_threshold")
    .eq("manage_inventory", true)
    .is("archived_at", null)
    .gt("low_stock_threshold", 0)
    .gt("inventory_quantity", 0)
    .limit(STOCK_SCAN_CAP);

  // Live vs scheduled is the same five-way state machine the offers list uses
  // (§6), and it needs redemption_count compared against max_redemptions — again
  // a two-column comparison. Deriving both from the active rows also guarantees
  // these two tiles can never disagree with the offers page. Active offers are
  // counted in tens, so this is a small read.
  const offersPromise = db
    .from("commerce_promotions")
    .select("starts_at,ends_at,max_redemptions,redemption_count")
    .eq("is_active", true)
    .limit(OFFER_SCAN_CAP);

  // Same reason: a SUM is not a count, and there is no aggregate RPC to call.
  const revenuePromise = db
    .from("commerce_orders")
    .select("total_inr,created_at")
    .in("status", ["paid", "fulfilled"])
    .order("created_at", { ascending: false })
    .limit(REVENUE_SCAN_CAP);

  const lastPublishPromise = db
    .from("site_content_revisions")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const recentAuditPromise = db
    .from("commerce_admin_audit_log")
    .select(AUDIT_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(RECENT_AUDIT_LIMIT);

  const pricingConfigPromise = db
    .from("commerce_pricing_config")
    .select("minimum_order_sets,set_size")
    .eq("id", true)
    .maybeSingle();

  const [
    counts,
    lowStock,
    offers,
    revenue,
    lastPublish,
    recentAudit,
    pricingConfig,
  ] = await Promise.all([
    countsPromise,
    lowStockPromise,
    offersPromise,
    revenuePromise,
    lastPublishPromise,
    recentAuditPromise,
    pricingConfigPromise,
  ]);

  const [
    published,
    draft,
    collections,
    tracked,
    out,
    pendingPayment,
    paid,
    fulfilled,
    paymentReview,
    pendingDrafts,
    images,
    videos,
    baseTierCount,
  ] = counts;

  if (lowStock.error) {
    console.error("[admin-overview] stock.low scan failed:", lowStock.error.message);
    failed.push("stock.low");
  }
  if (offers.error) {
    console.error("[admin-overview] offers scan failed:", offers.error.message);
    failed.push("offers");
  }
  if (revenue.error) {
    console.error("[admin-overview] revenue scan failed:", revenue.error.message);
    failed.push("revenue");
  }

  // A wrong number on a dashboard is worse than a missing dashboard: the owner
  // would act on it. If any figure could not be read, say so and show nothing.
  if (failed.length > 0) {
    return serverError(
      "Could not load the dashboard just now. Please refresh in a moment.",
    );
  }

  const stockRows: StockScanRow[] = lowStock.data ?? [];
  const low = stockRows.filter(
    (row) => row.inventory_quantity <= row.low_stock_threshold,
  ).length;

  // Same precedence as the offers list: an offer at its redemption cap is
  // exhausted, not live, and an offer with no start date is live from the moment
  // it is switched on.
  const offerRows: OfferRow[] = offers.data ?? [];
  let liveOffers = 0;
  let scheduledOffers = 0;
  for (const row of offerRows) {
    if (row.max_redemptions !== null && row.redemption_count >= row.max_redemptions) {
      continue;
    }
    const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
    if (startsAt !== null && startsAt > now) {
      scheduledOffers += 1;
      continue;
    }
    const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;
    if (endsAt !== null && endsAt <= now) continue;
    liveOffers += 1;
  }

  const revenueRows: RevenueRow[] = revenue.data ?? [];
  let paidTotalInr = 0;
  let last30dInr = 0;
  for (const row of revenueRows) {
    const amount = Number(row.total_inr) || 0;
    paidTotalInr += amount;
    if (new Date(row.created_at).getTime() >= since) last30dInr += amount;
  }

  // Decorative reads: a missing history panel is not worth failing the page for.
  if (lastPublish.error) {
    console.error("[admin-overview] lastPublishedAt failed:", lastPublish.error.message);
  }
  if (recentAudit.error) {
    console.error("[admin-overview] recentAudit failed:", recentAudit.error.message);
  }
  if (pricingConfig.error) {
    console.error("[admin-overview] pricing config failed:", pricingConfig.error.message);
  }

  const lastPublishedRow: { created_at: string } | null = lastPublish.data ?? null;

  return NextResponse.json({
    catalog: { published, draft, collections },
    stock: { low, out, tracked },
    orders: { pendingPayment, paid, fulfilled, paymentReview },
    content: {
      pendingDrafts,
      lastPublishedAt: lastPublishedRow?.created_at ?? null,
    },
    offers: { live: liveOffers, scheduled: scheduledOffers },
    media: { images, videos },
    revenue: { paidTotalInr, last30dInr },
    recentAudit: recentAudit.data ?? [],
    health: {
      serviceRole: isServiceRoleConfigured(),
      razorpay: getRazorpayReadiness().configured,
      resend: Boolean(process.env.RESEND_API_KEY),
      // Configured means every basket can resolve a price: the single config row
      // exists and a tier starts at 0 sets.
      pricingConfigured: Boolean(pricingConfig.data) && baseTierCount > 0,
    },
  });
}
