// Shared transactional-email infrastructure (Resend) — SERVER ONLY.
//
// One branded HTML shell + one send wrapper so every lifecycle email
// (wishlist nudge, back-in-stock, future campaigns) looks identical to the
// abandoned-cart win-back and degrades gracefully without RESEND_API_KEY.
// Email clients are inconsistent, so the shell is table-based with inline
// styles only (no <style> blocks, no web fonts).

// ── Brand palette (independent of Tailwind tokens by design) ────────────────
export const EMAIL_CHARCOAL = "#1c1b1a";
export const EMAIL_GOLD = "#b08d57";
export const EMAIL_WARM_WHITE = "#fcfbf9";
export const EMAIL_WARM_GRAY = "#8a857e";
export const EMAIL_HAIRLINE = "#e8e3db";

export const EMAIL_SERIF =
  "'Playfair Display', Georgia, 'Times New Roman', Times, serif";
export const EMAIL_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface BrandedEmailInput {
  subject: string;
  /** Hidden inbox-preview line. */
  preheader: string;
  /** Serif hero headline — pre-escaped HTML (may contain <br/>). */
  heroHtml: string;
  /** Sans intro paragraph under the hero (plain text, will be escaped). */
  heroBody: string;
  /** Main content rows — trusted, pre-built HTML table rows/blocks. */
  bodyHtml: string;
  cta: { label: string; href: string };
  /** Small print under the CTA (plain text, will be escaped). */
  footnote?: string;
}

/** Branded HTML shell shared by all Rangat Pehnawa lifecycle emails. */
export function renderBrandedEmail(input: BrandedEmailInput): string {
  const footnote = input.footnote
    ? `<p style="font-family:${EMAIL_SANS};font-size:11px;line-height:1.7;color:${EMAIL_WARM_GRAY};max-width:420px;margin:18px auto 0;">${escapeHtml(input.footnote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_WARM_WHITE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${EMAIL_WARM_WHITE};">${escapeHtml(input.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${EMAIL_WARM_WHITE};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid ${EMAIL_HAIRLINE};overflow:hidden;">
          <tr>
            <td align="center" style="padding:34px 40px 8px;">
              <div style="font-family:${EMAIL_SANS};font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:${EMAIL_GOLD};font-weight:700;">The Art of Rangat</div>
              <div style="font-family:${EMAIL_SERIF};font-size:26px;letter-spacing:0.04em;color:${EMAIL_CHARCOAL};padding-top:8px;">RANGAT&nbsp;PEHNAWA</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 44px 6px;">
              <div style="font-family:${EMAIL_SERIF};font-size:28px;line-height:1.25;color:${EMAIL_CHARCOAL};">${input.heroHtml}</div>
              <p style="font-family:${EMAIL_SANS};font-size:14px;line-height:1.7;color:${EMAIL_WARM_GRAY};max-width:420px;margin:16px auto 0;">${escapeHtml(input.heroBody)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 40px 0;">${input.bodyHtml}</td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 40px 8px;">
              <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:${EMAIL_CHARCOAL};color:${EMAIL_WARM_WHITE};font-family:${EMAIL_SANS};font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;text-decoration:none;padding:16px 38px;">${escapeHtml(input.cta.label)}</a>
              ${footnote}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:26px 40px 32px;">
              <div style="border-top:1px solid ${EMAIL_HAIRLINE};padding-top:20px;">
                <div style="font-family:${EMAIL_SANS};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${EMAIL_WARM_GRAY};">Rangat Pehnawa · Bengaluru</div>
                <div style="font-family:${EMAIL_SANS};font-size:10px;color:${EMAIL_WARM_GRAY};padding-top:6px;">Slow fashion, beautifully realized.</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Send wrapper ────────────────────────────────────────────────────────────

export interface SendEmailInput {
  to: string;
  email: RenderedEmail;
  /** Idempotency / threading hint, surfaces as X-Entity-Ref-ID. */
  refId?: string;
  /** Env var holding a custom from identity; falls back to EMAIL_FROM. */
  fromEnvVar?: string;
}

/**
 * Build RFC 2369 / RFC 8058 unsubscribe headers for lifecycle (marketing)
 * mail. CAN-SPAM requires a working opt-out mechanism; a `mailto:` target is
 * always compliant. When EMAIL_UNSUBSCRIBE_URL is also set we advertise
 * one-click (`List-Unsubscribe-Post`) so Gmail/Yahoo show a native
 * unsubscribe button. Returns {} when nothing is configured (transactional
 * mail like receipts is exempt and should pass no headers).
 */
function unsubscribeHeaders(): Record<string, string> {
  const mailto = (process.env.EMAIL_UNSUBSCRIBE_MAILTO || "").trim();
  const url = (process.env.EMAIL_UNSUBSCRIBE_URL || "").trim();
  const targets: string[] = [];
  if (url) targets.push(`<${url}>`);
  if (mailto) targets.push(`<mailto:${mailto}>`);
  if (!targets.length) return {};
  const headers: Record<string, string> = {
    "List-Unsubscribe": targets.join(", "),
  };
  // One-click only makes sense against an HTTPS POST endpoint.
  if (url) headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  return headers;
}

/**
 * Send via Resend. Degrades gracefully: without RESEND_API_KEY it logs and
 * returns false so callers keep the work queued instead of dropping it.
 * Returns true only when Resend confirms the send.
 */
export async function sendBrandedEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[email] would send "${input.email.subject}" to ${input.to}. (RESEND_API_KEY not set.)`,
    );
    return false;
  }

  const from =
    (input.fromEnvVar && process.env[input.fromEnvVar]) ||
    process.env.EMAIL_FROM ||
    "Rangat Pehnawa <hello@rangatpehnawa.com>";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.email.subject,
      html: input.email.html,
      text: input.email.text,
      headers: {
        ...(input.refId ? { "X-Entity-Ref-ID": input.refId } : {}),
        ...unsubscribeHeaders(),
      },
    });
    if (error) {
      console.error(`[email] Resend error for ${input.to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] send failed for ${input.to}:`, err);
    return false;
  }
}
