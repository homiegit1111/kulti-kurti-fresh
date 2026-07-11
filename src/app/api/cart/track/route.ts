import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import { verifyTurnstile, clientIpFromHeaders } from "@/lib/server/turnstile";
import { isAuthEnabled } from "@/lib/auth/config";
import {
  recordCartActivity,
  type CartSnapshot,
  type CartSnapshotItem,
} from "@/lib/server/abandoned-cart";
import { isValidEmail } from "@/lib/email-validation";

export const runtime = "nodejs";

/**
 * Records a cart snapshot for abandoned-cart recovery.
 *
 * Called client-side once a buyer's email is known (post-login or at checkout)
 * and the bag is non-empty. Idempotent per cartId — each call resets the
 * abandonment clock. No-op (200) when Supabase isn't configured.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rl = checkRateLimit(req, "cart-track", { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  let body: Partial<CartSnapshot>;
  try {
    body = (await req.json()) as Partial<CartSnapshot>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { cartId, email, items, subtotal, checkoutUrl } = body as Partial<
    CartSnapshot
  > & { turnstileToken?: string };

  if (!cartId || typeof cartId !== "string") {
    return NextResponse.json({ error: "cartId required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  // Anti-spam-relay: this endpoint enqueues an address for branded win-back
  // email, so we must not let a caller queue an arbitrary third party's inbox.
  // Signed-in users: use their Clerk-verified email, ignoring the client value.
  // Guests: require a Turnstile token (dormant/allow-through until keys are set)
  // so the endpoint can't be scripted into a mass mailer.
  let resolvedEmail = "";
  const signedInUserId = isAuthEnabled ? (await auth()).userId : null;

  if (signedInUserId) {
    const user = await currentUser();
    resolvedEmail =
      user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  } else {
    const turnstileToken =
      typeof (body as { turnstileToken?: unknown }).turnstileToken === "string"
        ? (body as { turnstileToken: string }).turnstileToken
        : null;
    const verdict = await verifyTurnstile(
      turnstileToken,
      clientIpFromHeaders(req.headers),
    );
    if (!verdict.ok) {
      return NextResponse.json(
        { error: "Bot verification failed." },
        { status: 403 },
      );
    }
    if (isValidEmail(email)) {
      resolvedEmail = email.toLowerCase();
    }
  }

  if (!isValidEmail(resolvedEmail)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }

  // Trim the payload to known fields (don't trust the client blindly).
  const safeItems: CartSnapshotItem[] = items.slice(0, 50).map((i) => ({
    productId: String(i.productId ?? ""),
    title: String(i.title ?? ""),
    handle: String(i.handle ?? ""),
    image: String(i.image ?? ""),
    price: Number(i.price ?? 0),
    quantity: Number(i.quantity ?? 1),
    size: i.size ? String(i.size) : undefined,
  }));

  const ok = await recordCartActivity({
    cartId,
    email: resolvedEmail,
    items: safeItems,
    subtotal: Number(subtotal ?? 0),
    checkoutUrl: checkoutUrl ?? null,
  });

  return NextResponse.json({ recorded: ok });
}
