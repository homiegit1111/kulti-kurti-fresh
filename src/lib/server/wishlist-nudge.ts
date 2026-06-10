/**
 * Wishlist nudge — gentle "still thinking about it?" lifecycle email.
 *
 * Sweep model (mirrors abandoned-cart):
 *   1. Find users whose oldest un-nudged wishlist item is ≥ WISHLIST_NUDGE_DAYS
 *      old (default 3) and who haven't been nudged in the last
 *      WISHLIST_NUDGE_COOLDOWN_DAYS (default 21).
 *   2. Resolve their email from `public.profiles`.
 *   3. Hydrate up to 3 wishlist products via Shopify for a rich email.
 *   4. Send via the shared Resend wrapper; stamp `public.wishlist_nudges` so
 *      the cooldown holds even across deploys.
 *
 * Uses the service-role client (cron context, no user session) — table access
 * for `wishlist_nudges` is service-role-only, see supabase/lifecycle_schema.sql.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getProductByHandle, type MockProduct } from "@/lib/shopify";
import { absoluteUrl } from "@/lib/seo";
import {
  EMAIL_CHARCOAL,
  EMAIL_HAIRLINE,
  EMAIL_SANS,
  EMAIL_SERIF,
  EMAIL_WARM_GRAY,
  escapeHtml,
  formatINR,
  renderBrandedEmail,
  sendBrandedEmail,
  type RenderedEmail,
} from "./email";

const nudgeDays = () =>
  Math.max(1, Number(process.env.WISHLIST_NUDGE_DAYS) || 3);
const cooldownDays = () =>
  Math.max(1, Number(process.env.WISHLIST_NUDGE_COOLDOWN_DAYS) || 21);

interface NudgeCandidate {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  handles: string[];
}

async function findCandidates(): Promise<NudgeCandidate[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const itemCutoff = new Date(
    Date.now() - nudgeDays() * 86_400_000,
  ).toISOString();
  const cooldownCutoff = new Date(
    Date.now() - cooldownDays() * 86_400_000,
  ).toISOString();

  const { data: items, error } = await supabase
    .from("wishlist_items")
    .select("clerk_user_id, product_handle, created_at")
    .lt("created_at", itemCutoff)
    .not("product_handle", "is", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error || !items?.length) {
    if (error) console.error("[wishlist-nudge] query failed:", error.message);
    return [];
  }

  const byUser = new Map<string, string[]>();
  for (const row of items) {
    const handles = byUser.get(row.clerk_user_id) ?? [];
    if (row.product_handle && !handles.includes(row.product_handle)) {
      handles.push(row.product_handle);
    }
    byUser.set(row.clerk_user_id, handles);
  }
  const userIds = [...byUser.keys()];

  // Exclude users nudged within the cooldown window.
  const { data: nudges } = await supabase
    .from("wishlist_nudges")
    .select("clerk_user_id, last_sent_at")
    .in("clerk_user_id", userIds)
    .gte("last_sent_at", cooldownCutoff);
  const onCooldown = new Set((nudges ?? []).map((n) => n.clerk_user_id));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("clerk_user_id, email, first_name")
    .in("clerk_user_id", userIds)
    .not("email", "is", null);

  const candidates: NudgeCandidate[] = [];
  for (const profile of profiles ?? []) {
    if (onCooldown.has(profile.clerk_user_id) || !profile.email) continue;
    candidates.push({
      clerkUserId: profile.clerk_user_id,
      email: profile.email,
      firstName: profile.first_name,
      handles: byUser.get(profile.clerk_user_id) ?? [],
    });
  }
  return candidates;
}

function productRowHtml(product: MockProduct): string {
  const title = escapeHtml(product.title);
  const price = formatINR(product.salePrice ?? product.price);
  const href = absoluteUrl(`/shop/${product.handle}`);
  const image = product.image
    ? `<img src="${escapeHtml(product.image)}" width="76" height="96" alt="${title}" style="display:block;width:76px;height:96px;object-fit:cover;border:1px solid ${EMAIL_HAIRLINE};" />`
    : `<div style="width:76px;height:96px;background:${EMAIL_HAIRLINE};"></div>`;
  return `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid ${EMAIL_HAIRLINE};" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="76" valign="top" style="padding-right:16px;">${image}</td>
          <td valign="middle">
            <a href="${escapeHtml(href)}" style="font-family:${EMAIL_SERIF};font-size:16px;line-height:1.3;color:${EMAIL_CHARCOAL};text-decoration:none;">${title}</a>
            <div style="font-family:${EMAIL_SANS};font-size:11px;letter-spacing:0.04em;color:${EMAIL_WARM_GRAY};padding-top:6px;">${escapeHtml(product.category)}</div>
          </td>
          <td valign="middle" align="right" style="font-family:${EMAIL_SANS};font-size:14px;color:${EMAIL_CHARCOAL};white-space:nowrap;padding-left:12px;">${price}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function renderWishlistNudgeEmail(
  firstName: string | null,
  products: MockProduct[],
): RenderedEmail {
  const first = products[0];
  const subject = first
    ? `Still thinking about the ${first.title}?`
    : "Your wishlist misses you";
  const preheader =
    "The pieces you saved are still here — but our small batches never linger.";
  const greeting = firstName ? `${firstName}, the` : "The";

  const html = renderBrandedEmail({
    subject,
    preheader,
    heroHtml: `${escapeHtml(greeting)} pieces you loved<br/>are still waiting`,
    heroBody:
      "You set these aside for a reason. Each piece is cut in small batches by our artisans — when a run sells through, it rarely returns.",
    bodyHtml: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${products.map(productRowHtml).join("")}</table>`,
    cta: { label: "Return to your wishlist", href: absoluteUrl("/wishlist") },
    footnote:
      "You're receiving this because you saved pieces to your Rangat Pehnawa wishlist.",
  });

  const text = [
    subject,
    "",
    "The pieces you loved are still waiting:",
    ...products.map(
      (p) => `• ${p.title} — ${formatINR(p.salePrice ?? p.price)}`,
    ),
    "",
    `Return to your wishlist: ${absoluteUrl("/wishlist")}`,
  ].join("\n");

  return { subject, html, text };
}

export interface NudgeSweepResult {
  scanned: number;
  emailed: number;
  skipped: number;
}

/** Orchestrate one nudge sweep — called by /api/cron/wishlist-nudge. */
export async function runWishlistNudgeSweep(): Promise<NudgeSweepResult> {
  const candidates = await findCandidates();
  const supabase = createServiceRoleClient();
  let emailed = 0;

  for (const candidate of candidates) {
    const products = (
      await Promise.all(
        candidate.handles.slice(0, 3).map((h) => getProductByHandle(h)),
      )
    ).filter((p): p is MockProduct => Boolean(p));
    if (!products.length) continue;

    const ok = await sendBrandedEmail({
      to: candidate.email,
      email: renderWishlistNudgeEmail(candidate.firstName, products),
      refId: `wishlist-nudge:${candidate.clerkUserId}`,
      fromEnvVar: "WISHLIST_NUDGE_FROM",
    });
    if (ok && supabase) {
      await supabase.from("wishlist_nudges").upsert({
        clerk_user_id: candidate.clerkUserId,
        last_sent_at: new Date().toISOString(),
      });
      emailed += 1;
    }
  }

  return {
    scanned: candidates.length,
    emailed,
    skipped: candidates.length - emailed,
  };
}
