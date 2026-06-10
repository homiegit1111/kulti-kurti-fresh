// Abandoned-cart win-back email — branded renderer.
//
// Produces both an HTML and a plain-text body for a single abandoned cart, in
// the Rangat Pehnawa house style (charcoal / gold / warm-white, Playfair-style
// serif headline). Email clients are notoriously inconsistent, so the HTML is
// deliberately table-based with inline styles only (no <style> blocks, no
// external CSS, no web fonts) — the safest path to a premium look in Gmail,
// Apple Mail and Outlook alike.

import type { AbandonedCartRow, CartSnapshotItem } from "./abandoned-cart";
import { absoluteUrl } from "@/lib/seo";

// Brand palette (kept local so the email never depends on Tailwind tokens).
const CHARCOAL = "#1c1b1a";
const GOLD = "#b08d57";
const WARM_WHITE = "#fcfbf9";
const WARM_GRAY = "#8a857e";
const HAIRLINE = "#e8e3db";

const SERIF =
  "'Playfair Display', Georgia, 'Times New Roman', Times, serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function checkoutHref(cart: AbandonedCartRow): string {
  return cart.checkout_url || absoluteUrl("/cart");
}

function itemRowHtml(item: CartSnapshotItem): string {
  const title = escapeHtml(item.title);
  const size = item.size ? escapeHtml(item.size) : "";
  const lineTotal = formatINR(item.price * item.quantity);
  const meta = [size ? `Size ${size}` : "", `Qty ${item.quantity}`]
    .filter(Boolean)
    .join("&nbsp;&nbsp;·&nbsp;&nbsp;");
  const image = item.image
    ? `<img src="${escapeHtml(item.image)}" width="76" height="96" alt="${title}" style="display:block;width:76px;height:96px;object-fit:cover;border-radius:6px;border:1px solid ${HAIRLINE};" />`
    : `<div style="width:76px;height:96px;border-radius:6px;background:${HAIRLINE};"></div>`;

  return `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid ${HAIRLINE};" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="76" valign="top" style="padding-right:16px;">${image}</td>
          <td valign="middle">
            <div style="font-family:${SERIF};font-size:16px;line-height:1.3;color:${CHARCOAL};">${title}</div>
            <div style="font-family:${SANS};font-size:11px;letter-spacing:0.04em;color:${WARM_GRAY};padding-top:6px;">${meta}</div>
          </td>
          <td valign="middle" align="right" style="font-family:${SANS};font-size:14px;color:${CHARCOAL};white-space:nowrap;padding-left:12px;">${lineTotal}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderAbandonedCartEmail(cart: AbandonedCartRow): RenderedEmail {
  const href = checkoutHref(cart);
  const firstItem = cart.items[0]?.title?.trim();
  const subject = firstItem
    ? `Your ${firstItem} is waiting`
    : "You left something beautiful behind";
  const preheader =
    "Your selections are still reserved — complete your order before they slip away.";

  const itemsHtml = cart.items.map(itemRowHtml).join("");
  const subtotal = formatINR(cart.subtotal);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${WARM_WHITE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${WARM_WHITE};">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${WARM_WHITE};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid ${HAIRLINE};border-radius:14px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:34px 40px 8px;">
              <div style="font-family:${SANS};font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:${GOLD};font-weight:700;">The Art of Rangat</div>
              <div style="font-family:${SERIF};font-size:26px;letter-spacing:0.04em;color:${CHARCOAL};padding-top:8px;">RANGAT&nbsp;PEHNAWA</div>
            </td>
          </tr>
          <!-- Hero copy -->
          <tr>
            <td align="center" style="padding:18px 44px 6px;">
              <div style="font-family:${SERIF};font-size:28px;line-height:1.25;color:${CHARCOAL};">You left something<br/>beautiful behind</div>
              <p style="font-family:${SANS};font-size:14px;line-height:1.7;color:${WARM_GRAY};max-width:420px;margin:16px auto 0;">
                The pieces in your bag are still reserved for you. Slip back in and make them yours before they find another home.
              </p>
            </td>
          </tr>
          <!-- Items -->
          <tr>
            <td style="padding:18px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${itemsHtml}
                <tr>
                  <td style="padding:18px 0 4px;" align="right">
                    <span style="font-family:${SANS};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${WARM_GRAY};">Subtotal&nbsp;&nbsp;</span>
                    <span style="font-family:${SERIF};font-size:20px;color:${CHARCOAL};">${subtotal}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td align="center" style="padding:22px 40px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${CHARCOAL}" style="border-radius:999px;">
                    <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:${SANS};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Complete Your Order</a>
                  </td>
                </tr>
              </table>
              <p style="font-family:${SANS};font-size:11px;line-height:1.6;color:${WARM_GRAY};margin:18px auto 0;max-width:360px;">
                Handcrafted in limited runs — once a piece is gone, it rarely returns.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:26px 40px 30px;border-top:1px solid ${HAIRLINE};" align="center">
              <div style="font-family:${SANS};font-size:11px;line-height:1.7;color:${WARM_GRAY};">
                You're receiving this because you started a bag at Rangat Pehnawa.<br/>
                <a href="${escapeHtml(absoluteUrl("/"))}" style="color:${GOLD};text-decoration:none;">rangatpehnawa.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    "RANGAT PEHNAWA",
    "",
    "You left something beautiful behind.",
    "",
    "The pieces in your bag are still reserved for you. Complete your order before they find another home:",
    "",
    ...cart.items.map((i) => {
      const size = i.size ? ` (Size ${i.size})` : "";
      return `• ${i.title}${size} × ${i.quantity} — ${formatINR(
        i.price * i.quantity,
      )}`;
    }),
    "",
    `Subtotal: ${subtotal}`,
    "",
    `Complete your order: ${href}`,
    "",
    "Handcrafted in limited runs — once a piece is gone, it rarely returns.",
    "",
    "rangatpehnawa.com",
  ];

  return { subject, html, text: textLines.join("\n") };
}
