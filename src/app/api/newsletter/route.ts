import { NextRequest, NextResponse } from "next/server";
import {
  verifyTurnstile,
  clientIpFromHeaders,
} from "@/lib/server/turnstile";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { isValidEmail } from "@/lib/email-validation";

export const runtime = "nodejs";

/**
 * Newsletter signup ("Join the Inner Circle").
 *
 * Bot-protected (Turnstile, dormant until keys are set) and rate-limited
 * (in-memory). Accepts the email so the endpoint is live; hook a provider
 * (Klaviyo / Mailchimp / Shopify customer w/ marketing consent) where noted.
 */

type NewsletterPayload = {
  email?: string;
  turnstileToken?: string;
};

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups / minute / IP.
  const rl = checkRateLimit(req, "newsletter", {
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooManyRequests(rl);

  let body: NewsletterPayload;
  try {
    body = (await req.json()) as NewsletterPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Bot protection — dormant until TURNSTILE_SECRET_KEY is set, enforced after.
  const verdict = await verifyTurnstile(
    body.turnstileToken,
    clientIpFromHeaders(req.headers),
  );
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 403 },
    );
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  // TODO: persist to email provider (Klaviyo/Mailchimp) or create a Shopify
  // customer with marketing consent. For now we accept it so the form is live
  // and bot-protected; hook a provider here when ready.
  console.log("[newsletter] new subscriber", {
    email,
    turnstileEnforced: verdict.enforced,
  });

  return NextResponse.json({ ok: true });
}
