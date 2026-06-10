/**
 * Back-in-stock & size alerts — capture lost demand on sold-out pieces.
 *
 * Registration: POST /api/stock-alerts (validated + rate-limited there).
 * Fulfilment: runStockAlertSweep() — for every product with pending alerts,
 * re-check live availability via Shopify; when a piece is purchasable again,
 * email everyone waiting and stamp notified_at (one-shot per request).
 *
 * Service-role only — the tables deny anon/authenticated access via RLS.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getProductByHandle, type MockProduct } from "@/lib/shopify";
import { absoluteUrl } from "@/lib/seo";
import {
  EMAIL_HAIRLINE,
  escapeHtml,
  formatINR,
  renderBrandedEmail,
  sendBrandedEmail,
  type RenderedEmail,
} from "./email";

export interface StockAlertRow {
  id: string;
  email: string;
  product_handle: string;
  size: string | null;
}

export async function registerStockAlert(input: {
  email: string;
  productHandle: string;
  size?: string | null;
  clerkUserId?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const { error } = await supabase.from("stock_alerts").upsert(
    {
      email: input.email.trim().toLowerCase(),
      product_handle: input.productHandle,
      size: input.size || null,
      clerk_user_id: input.clerkUserId ?? null,
      notified_at: null,
    },
    { onConflict: "email,product_handle,size" },
  );

  if (error) {
    // Unique-index conflicts on the expression index surface as 23505 — the
    // alert already exists, which is success from the shopper's perspective.
    if (error.code === "23505") return { ok: true };
    console.error("[stock-alerts] register failed:", error.message);
    return { ok: false, reason: "db_error" };
  }
  return { ok: true };
}

export function renderBackInStockEmail(
  product: MockProduct,
  size: string | null,
): RenderedEmail {
  const subject = `${product.title} is back`;
  const sizeNote = size ? ` in size ${size}` : "";
  const href = absoluteUrl(`/shop/${product.handle}`);
  const price = formatINR(product.salePrice ?? product.price);

  const bodyHtml = `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:6px 0 2px;">
        ${
          product.image
            ? `<img src="${escapeHtml(product.image)}" width="180" height="225" alt="${escapeHtml(product.title)}" style="display:block;width:180px;height:225px;object-fit:cover;border:1px solid ${EMAIL_HAIRLINE};" />`
            : ""
        }
      </td>
    </tr>
  </table>`;

  const html = renderBrandedEmail({
    subject,
    preheader: `The piece you were waiting for has returned${sizeNote}. Small batches sell through quickly.`,
    heroHtml: `${escapeHtml(product.title)}<br/>has returned`,
    heroBody: `The piece you asked us to watch is available again${sizeNote} — ${price}. Our batches are small, so we'd hate for you to miss it twice.`,
    bodyHtml,
    cta: { label: "Claim your piece", href },
    footnote:
      "You're receiving this one-time alert because you asked to be notified when this piece returned.",
  });

  const text = [
    subject,
    "",
    `${product.title} is available again${sizeNote} — ${price}.`,
    `Shop now: ${href}`,
  ].join("\n");

  return { subject, html, text };
}

export interface StockAlertSweepResult {
  pendingProducts: number;
  backInStock: number;
  emailed: number;
}

/** Orchestrate one fulfilment sweep — called by /api/cron/stock-alerts. */
export async function runStockAlertSweep(): Promise<StockAlertSweepResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { pendingProducts: 0, backInStock: 0, emailed: 0 };

  const { data: pending, error } = await supabase
    .from("stock_alerts")
    .select("id, email, product_handle, size")
    .is("notified_at", null)
    .limit(500);
  if (error || !pending?.length) {
    if (error) console.error("[stock-alerts] query failed:", error.message);
    return { pendingProducts: 0, backInStock: 0, emailed: 0 };
  }

  const byHandle = new Map<string, StockAlertRow[]>();
  for (const row of pending as StockAlertRow[]) {
    const list = byHandle.get(row.product_handle) ?? [];
    list.push(row);
    byHandle.set(row.product_handle, list);
  }

  let backInStock = 0;
  let emailed = 0;
  for (const [handle, alerts] of byHandle) {
    const product = await getProductByHandle(handle);
    if (!product || product.availableForSale === false) continue;
    backInStock += 1;

    for (const alert of alerts) {
      const ok = await sendBrandedEmail({
        to: alert.email,
        email: renderBackInStockEmail(product, alert.size),
        refId: `stock-alert:${alert.id}`,
        fromEnvVar: "STOCK_ALERT_FROM",
      });
      if (ok) {
        await supabase
          .from("stock_alerts")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", alert.id);
        emailed += 1;
      }
    }
  }

  return { pendingProducts: byHandle.size, backInStock, emailed };
}
