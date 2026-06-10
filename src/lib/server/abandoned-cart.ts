// ── Abandoned-cart recovery framework ────────────────────────────────────────
//   A provider-agnostic scaffold for win-back emails. The moving parts:
//
//     1. Capture   — POST /api/cart/track records a snapshot (email + items)
//                    whenever a known buyer has a non-empty cart.
//     2. Detect    — GET /api/cron/abandoned-cart (run on a schedule) finds
//                    snapshots untouched for > ABANDONED_CART_THRESHOLD_MINUTES
//                    that haven't converted or already been emailed.
//     3. Recover   — sendAbandonedCartEmail() fires the win-back. The email
//                    PROVIDER is intentionally a TODO so the owner can drop in
//                    Resend / Postmark / Klaviyo without touching the pipeline.
//     4. Reconcile — markRecovered() is called on successful order so we never
//                    nag a customer who already checked out.
//
//   Persistence is Supabase (service-role). When Supabase isn't configured,
//   every function degrades to a logged no-op so the app still builds & runs.
//
//   Table DDL: supabase/abandoned_carts_schema.sql

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { renderAbandonedCartEmail } from "./abandoned-cart-email";

const TABLE = "abandoned_carts";

export interface CartSnapshotItem {
  productId: string;
  title: string;
  handle: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
}

export interface CartSnapshot {
  cartId: string; // stable key (Shopify cart id or a client-generated id)
  email: string;
  items: CartSnapshotItem[];
  subtotal: number;
  checkoutUrl?: string | null;
}

/** Row as stored in Supabase (snake_case columns). */
export interface AbandonedCartRow {
  cart_id: string;
  email: string;
  items: CartSnapshotItem[];
  subtotal: number;
  checkout_url: string | null;
  updated_at: string;
  recovered: boolean;
  email_sent_at: string | null;
}

const thresholdMinutes = (): number => {
  const raw = Number(process.env.ABANDONED_CART_THRESHOLD_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 60;
};

/** Upsert the latest snapshot for a cart (resets the abandonment clock). */
export async function recordCartActivity(
  snapshot: CartSnapshot,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    console.log("[abandoned-cart] Supabase not configured — skipping capture.");
    return false;
  }
  const { error } = await supabase.from(TABLE).upsert(
    {
      cart_id: snapshot.cartId,
      email: snapshot.email.toLowerCase(),
      items: snapshot.items,
      subtotal: snapshot.subtotal,
      checkout_url: snapshot.checkoutUrl ?? null,
      recovered: false,
      // A new activity resets the email cycle so an updated cart can re-trigger.
      email_sent_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cart_id" },
  );
  if (error) {
    console.error("[abandoned-cart] capture failed:", error.message);
    return false;
  }
  return true;
}

/** Mark a cart recovered (converted) so it's never emailed again. */
export async function markRecovered(cartId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase
    .from(TABLE)
    .update({ recovered: true })
    .eq("cart_id", cartId);
}

/**
 * Mark every open cart for an email recovered — call from the Shopify
 * orders/paid webhook (the order's cart token rarely matches our Storefront
 * cart id, so we reconcile by buyer email instead).
 */
export async function markRecoveredByEmail(email: string): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase
    .from(TABLE)
    .update({ recovered: true })
    .eq("email", email.toLowerCase())
    .eq("recovered", false);
}

/** Find carts abandoned past the threshold that still need a win-back email. */
export async function findAbandonedCarts(): Promise<AbandonedCartRow[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const cutoff = new Date(
    Date.now() - thresholdMinutes() * 60_000,
  ).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("recovered", false)
    .is("email_sent_at", null)
    .lt("updated_at", cutoff)
    .limit(100);
  if (error) {
    console.error("[abandoned-cart] query failed:", error.message);
    return [];
  }
  return (data ?? []) as AbandonedCartRow[];
}

/**
 * Send a single win-back email via Resend.
 *
 * The provider degrades gracefully: with no `RESEND_API_KEY` it logs and
 * returns false (so the cart stays queued, not silently dropped) — keeping the
 * app buildable and runnable in every environment. The branded HTML/text body
 * is rendered in `abandoned-cart-email.ts`.
 *
 * The "from" identity is env-driven (`ABANDONED_CART_FROM`) so it can point at a
 * verified Resend domain without a code change; it falls back to a sensible
 * default. Returns true only when Resend confirms the send.
 */
export async function sendAbandonedCartEmail(
  cart: AbandonedCartRow,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[abandoned-cart] would email ${cart.email} — ${cart.items.length} item(s), subtotal ${cart.subtotal}. (RESEND_API_KEY not set.)`,
    );
    return false;
  }

  const from =
    process.env.ABANDONED_CART_FROM ||
    "Rangat Pehnawa <hello@rangatpehnawa.com>";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { subject, html, text } = renderAbandonedCartEmail(cart);

    const { error } = await resend.emails.send({
      from,
      to: cart.email,
      subject,
      html,
      text,
      headers: { "X-Entity-Ref-ID": cart.cart_id },
    });

    if (error) {
      console.error(`[abandoned-cart] Resend error for ${cart.email}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[abandoned-cart] send failed for ${cart.email}:`, err);
    return false;
  }
}

/** Stamp that a recovery email was sent (so we don't re-send). */
async function markEmailSent(cartId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase
    .from(TABLE)
    .update({ email_sent_at: new Date().toISOString() })
    .eq("cart_id", cartId);
}

export interface SweepResult {
  scanned: number;
  emailed: number;
  skipped: number;
}

/** Orchestrate one recovery sweep — called by the cron endpoint. */
export async function runAbandonedCartSweep(): Promise<SweepResult> {
  const carts = await findAbandonedCarts();
  let emailed = 0;
  for (const cart of carts) {
    const ok = await sendAbandonedCartEmail(cart);
    if (ok) {
      await markEmailSent(cart.cart_id);
      emailed += 1;
    }
  }
  return { scanned: carts.length, emailed, skipped: carts.length - emailed };
}
