import { NextRequest, NextResponse } from "next/server";
import {
  verifyTurnstile,
  clientIpFromHeaders,
} from "@/lib/server/turnstile";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { isValidEmail } from "@/lib/email-validation";

export const runtime = "nodejs";

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  businessType?: string;
  city?: string;
  whatsapp?: string;
  monthlyBuying?: string;
  message?: string;
  turnstileToken?: string;
};

export async function POST(req: NextRequest) {
  // Rate limit: 5 enquiries / minute / IP.
  const rl = checkRateLimit(req, "contact", { limit: 5, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  let body: ContactPayload;
  try {
    body = (await req.json()) as ContactPayload;
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

  // Basic input validation.
  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const message = (body.message || "").trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email and message are required." },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message is too long." },
      { status: 400 },
    );
  }

  // TODO: deliver the message (email / CRM / Slack). For now we accept it so the
  // endpoint is live and bot-protected; hook a provider here when ready.
  console.log("[contact] new enquiry", {
    name,
    email,
    subject: body.subject,
    businessType: body.businessType,
    city: body.city,
    whatsapp: body.whatsapp,
    monthlyBuying: body.monthlyBuying,
    length: message.length,
    turnstileEnforced: verdict.enforced,
  });

  return NextResponse.json({ ok: true });
}
