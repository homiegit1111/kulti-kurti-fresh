import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// HMAC verification needs the Node crypto runtime + the raw request body.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Timing-safe comparison of the Shopify HMAC header against a freshly computed
 * digest of the raw body. Returns false on any length/format mismatch.
 */
function isValidHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: never process unverifiable webhooks.
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader) {
    return NextResponse.json({ error: "Missing HMAC header" }, { status: 401 });
  }

  // Must read the RAW body for an exact-byte HMAC match (don't parse first).
  const rawBody = await req.text();

  if (!isValidHmac(rawBody, hmacHeader, secret)) {
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    // Verified but unparseable — ack so Shopify doesn't retry forever.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // On catalog changes, invalidate the cached storefront pages so the next
  // request re-fetches fresh data from Shopify (data layer uses ISR).
  try {
    if (topic.startsWith("products/")) {
      revalidatePath("/");
      revalidatePath("/shop");
      const handle = payload.handle;
      if (typeof handle === "string" && handle) {
        revalidatePath(`/shop/${handle}`);
      }
    } else if (topic.startsWith("collections/")) {
      revalidatePath("/shop");
      revalidatePath("/collections");
      const handle = payload.handle;
      if (typeof handle === "string" && handle) {
        revalidatePath(`/collections/${handle}`);
      }
    }
  } catch (err) {
    console.error("[shopify-webhook] revalidate failed:", err);
    // Still ack — revalidation failure shouldn't trigger Shopify retries.
  }

  return NextResponse.json({ received: true, topic }, { status: 200 });
}
