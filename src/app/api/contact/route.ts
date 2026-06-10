import { NextRequest, NextResponse } from "next/server";
import {
  verifyTurnstile,
  clientIpFromHeaders,
} from "@/lib/server/turnstile";

export const runtime = "nodejs";

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
  turnstileToken?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
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
  if (!EMAIL_RE.test(email)) {
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
    length: message.length,
    turnstileEnforced: verdict.enforced,
  });

  return NextResponse.json({ ok: true });
}
