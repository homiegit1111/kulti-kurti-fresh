import { createHmac, timingSafeEqual } from "node:crypto";
import { auth } from "@clerk/nextjs/server";

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

export type CheckoutSessionClaims = {
  orderId: string;
  clerkUserId: string | null;
  createdAt: number;
};

export type CheckoutSessionVerification =
  | { ok: true; session: CheckoutSessionClaims }
  | { ok: false; code: string; error: string };

export type CheckoutSessionBinding =
  | { ok: true; clerkUserId: string | null; session: CheckoutSessionClaims }
  | { ok: false; status: 400 | 401 | 403; code: string; error: string };

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signingSecret(): string {
  // Keep this key independent from provider credentials. Rotating a payment
  // provider key must not invalidate live checkout sessions, and a leaked
  // provider key must not become an order-authorisation key.
  return process.env.COMMERCE_CHECKOUT_SESSION_SECRET?.trim() || "";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseClaims(value: unknown): CheckoutSessionClaims | null {
  if (!value || typeof value !== "object") return null;
  const claims = value as Partial<CheckoutSessionClaims>;

  if (
    typeof claims.orderId !== "string" ||
    !claims.orderId.trim() ||
    claims.orderId.length > 160 ||
    !(typeof claims.clerkUserId === "string" || claims.clerkUserId === null) ||
    (typeof claims.clerkUserId === "string" && claims.clerkUserId.length > 160) ||
    typeof claims.createdAt !== "number" ||
    !Number.isFinite(claims.createdAt)
  ) {
    return null;
  }

  return {
    orderId: claims.orderId,
    clerkUserId: claims.clerkUserId,
    createdAt: claims.createdAt,
  };
}

export function getCheckoutSessionSecret(): string {
  return signingSecret();
}

export function createCheckoutSessionToken(
  claims: CheckoutSessionClaims,
  secret = signingSecret(),
): string | null {
  if (!secret) return null;
  const parsed = parseClaims(claims);
  if (!parsed) return null;

  const payload = encodeBase64Url(JSON.stringify(parsed));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyCheckoutSessionToken(
  token: string,
  secret = signingSecret(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): CheckoutSessionVerification {
  if (!secret) {
    return {
      ok: false,
      code: "CHECKOUT_SESSION_SECRET_MISSING",
      error: "Checkout session binding is not configured.",
    };
  }

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    return {
      ok: false,
      code: "INVALID_CHECKOUT_SESSION",
      error: "Checkout session token is invalid.",
    };
  }

  if (!safeEqualHex(signature, sign(payload, secret))) {
    return {
      ok: false,
      code: "CHECKOUT_SESSION_SIGNATURE_MISMATCH",
      error: "Checkout session token could not be verified.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(payload));
  } catch {
    return {
      ok: false,
      code: "INVALID_CHECKOUT_SESSION_PAYLOAD",
      error: "Checkout session token payload is invalid.",
    };
  }

  const session = parseClaims(parsed);
  if (!session) {
    return {
      ok: false,
      code: "INVALID_CHECKOUT_SESSION_PAYLOAD",
      error: "Checkout session token payload is incomplete.",
    };
  }

  const age = Date.now() - session.createdAt;
  if (age > maxAgeMs || age < -5 * 60 * 1000) {
    return {
      ok: false,
      code: "CHECKOUT_SESSION_EXPIRED",
      error: "Checkout session token has expired. Please restart checkout.",
    };
  }

  return { ok: true, session };
}

/**
 * Verify both halves of the binding: the signed order claim and the current
 * Clerk session. Anonymous checkout is deliberately represented by null and
 * must remain anonymous at every later mutation.
 */
export async function verifyCheckoutSessionBinding(input: {
  token: string;
  orderId: string;
}): Promise<CheckoutSessionBinding> {
  const verified = verifyCheckoutSessionToken(input.token);
  if (!verified.ok) {
    return { ...verified, status: 400 };
  }

  if (verified.session.orderId !== input.orderId) {
    return {
      ok: false,
      status: 400,
      code: "CHECKOUT_SESSION_ORDER_MISMATCH",
      error: "Checkout session does not belong to this order.",
    };
  }

  let currentUserId: string | null = null;
  try {
    currentUserId = (await auth()).userId ?? null;
  } catch {
    // Treat an unavailable auth provider as anonymous. This cannot turn an
    // authenticated claim into an anonymous one because the equality check
    // below rejects that mismatch.
    currentUserId = null;
  }

  if (currentUserId !== verified.session.clerkUserId) {
    return {
      ok: false,
      status: 403,
      code: "CHECKOUT_SESSION_USER_MISMATCH",
      error: "Checkout session does not belong to the current buyer.",
    };
  }

  return {
    ok: true,
    clerkUserId: verified.session.clerkUserId,
    session: verified.session,
  };
}

export async function getVerifiedClerkUserId(): Promise<string | null> {
  try {
    return (await auth()).userId ?? null;
  } catch {
    return null;
  }
}
