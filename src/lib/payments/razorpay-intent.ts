import { createHmac, timingSafeEqual } from "crypto";

export type RazorpayCheckoutIntent = {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  medusaCartId?: string;
  createdAt: number;
};

export type RazorpayIntentVerification =
  | { ok: true; intent: RazorpayCheckoutIntent }
  | { ok: false; code: string; error: string };

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

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

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseIntent(value: unknown): RazorpayCheckoutIntent | null {
  if (!value || typeof value !== "object") return null;
  const intent = value as Partial<RazorpayCheckoutIntent>;

  if (
    typeof intent.orderId !== "string" ||
    typeof intent.amount !== "number" ||
    typeof intent.currency !== "string" ||
    typeof intent.receipt !== "string" ||
    typeof intent.createdAt !== "number" ||
    !Number.isFinite(intent.amount) ||
    !Number.isFinite(intent.createdAt)
  ) {
    return null;
  }

  return {
    orderId: intent.orderId.slice(0, 80),
    amount: Math.round(intent.amount),
    currency: intent.currency.slice(0, 8),
    receipt: intent.receipt.slice(0, 80),
    ...(typeof intent.medusaCartId === "string"
      ? { medusaCartId: intent.medusaCartId.slice(0, 120) }
      : {}),
    createdAt: intent.createdAt,
  };
}

export function createRazorpayIntentToken(
  intent: RazorpayCheckoutIntent,
  secret: string,
): string {
  const payload = encodeBase64Url(JSON.stringify(intent));
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyRazorpayIntentToken(
  token: string,
  secret: string,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): RazorpayIntentVerification {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    return {
      ok: false,
      code: "INVALID_INTENT_TOKEN",
      error: "Razorpay checkout intent token is invalid.",
    };
  }

  const expected = signPayload(payload, secret);
  if (!safeEqualHex(signature, expected)) {
    return {
      ok: false,
      code: "INTENT_SIGNATURE_MISMATCH",
      error: "Razorpay checkout intent token could not be verified.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(payload));
  } catch {
    return {
      ok: false,
      code: "INVALID_INTENT_PAYLOAD",
      error: "Razorpay checkout intent payload is invalid.",
    };
  }

  const intent = parseIntent(parsed);
  if (!intent) {
    return {
      ok: false,
      code: "INVALID_INTENT_PAYLOAD",
      error: "Razorpay checkout intent payload is incomplete.",
    };
  }

  if (Date.now() - intent.createdAt > maxAgeMs) {
    return {
      ok: false,
      code: "INTENT_TOKEN_EXPIRED",
      error: "Razorpay checkout intent token has expired. Please restart checkout.",
    };
  }

  return { ok: true, intent };
}