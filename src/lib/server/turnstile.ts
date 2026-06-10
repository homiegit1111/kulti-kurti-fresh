/**
 * Cloudflare Turnstile server-side verification.
 *
 * Dormant-by-default: if `TURNSTILE_SECRET_KEY` is not set, verification is
 * SKIPPED (returns ok) so the site keeps working before keys are added. Once
 * the secret is present, tokens are enforced against Cloudflare's siteverify.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = {
  ok: boolean;
  /** true when enforcement is active (secret configured) */
  enforced: boolean;
  errorCodes?: string[];
};

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || "").trim();

  // Dormant mode — no secret configured yet. Allow through.
  if (!secret) {
    return { ok: true, enforced: false };
  }

  // Enforcing: a missing token is an automatic fail.
  if (!token) {
    return { ok: false, enforced: true, errorCodes: ["missing-input-response"] };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    return {
      ok: Boolean(data.success),
      enforced: true,
      errorCodes: data["error-codes"],
    };
  } catch {
    // Network/verification error while enforcing → fail closed.
    return { ok: false, enforced: true, errorCodes: ["internal-error"] };
  }
}

/** Pull the client IP from common proxy headers (best-effort). */
export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("cf-connecting-ip") || headers.get("x-real-ip") || null;
}
