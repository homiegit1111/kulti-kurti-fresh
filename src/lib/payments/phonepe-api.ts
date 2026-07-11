/**
 * PhonePe Standard Checkout v2 API client — SERVER ONLY.
 *
 * OAuth token is cached in module memory until shortly before expiry. On
 * serverless this cache is per-instance (like the rate limiter) — acceptable,
 * since a cold instance just fetches a fresh token.
 */

import {
  getPhonePeClientId,
  getPhonePeClientSecret,
  getPhonePeClientVersion,
  getPhonePeOauthUrl,
  getPhonePeOrderStatusUrl,
  getPhonePePayUrl,
} from "./phonepe-config";

type CachedToken = { accessToken: string; expiresAtMs: number };
let tokenCache: CachedToken | null = null;

const TOKEN_SKEW_MS = 60_000; // refresh a minute before actual expiry

type OauthResponse = {
  access_token?: string;
  token_type?: string;
  expires_at?: number; // epoch SECONDS
  issued_at?: number;
};

export async function getPhonePeAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs - TOKEN_SKEW_MS > now) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams();
  body.set("client_id", getPhonePeClientId());
  body.set("client_version", getPhonePeClientVersion());
  body.set("client_secret", getPhonePeClientSecret());
  body.set("grant_type", "client_credentials");

  const res = await fetch(getPhonePeOauthUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as OauthResponse & {
    message?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.message || data.error || `PhonePe OAuth failed with status ${res.status}.`,
    );
  }

  // expires_at is epoch seconds; fall back to a conservative 10-minute TTL.
  const expiresAtMs = data.expires_at
    ? data.expires_at * 1000
    : now + 10 * 60_000;
  tokenCache = { accessToken: data.access_token, expiresAtMs };
  return data.access_token;
}

/** Clear the cached token (used when a call gets 401, to force a refresh). */
export function clearPhonePeToken(): void {
  tokenCache = null;
}

export type PhonePeCreatePaymentResult = {
  ok: boolean;
  orderId?: string;
  state?: string;
  redirectUrl?: string;
  error?: string;
  status: number;
};

export async function createPhonePePayment(input: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
  expireAfterSec?: number;
  metaInfo?: Record<string, string>;
  phoneNumber?: string;
}): Promise<PhonePeCreatePaymentResult> {
  const token = await getPhonePeAccessToken();

  const payload: Record<string, unknown> = {
    merchantOrderId: input.merchantOrderId,
    amount: input.amountPaise,
    ...(input.expireAfterSec ? { expireAfter: input.expireAfterSec } : {}),
    ...(input.metaInfo ? { metaInfo: input.metaInfo } : {}),
    ...(input.phoneNumber
      ? { prefillUserLoginDetails: { phoneNumber: input.phoneNumber } }
      : {}),
    paymentFlow: {
      type: "PG_CHECKOUT",
      merchantUrls: { redirectUrl: input.redirectUrl },
    },
  };

  const res = await fetch(getPhonePePayUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    orderId?: string;
    state?: string;
    redirectUrl?: string;
    message?: string;
    error?: string;
  };

  if (!res.ok || !data.redirectUrl) {
    return {
      ok: false,
      status: res.status,
      error:
        data.message || data.error || `PhonePe pay request failed (${res.status}).`,
    };
  }

  return {
    ok: true,
    status: res.status,
    orderId: data.orderId,
    state: data.state,
    redirectUrl: data.redirectUrl,
  };
}

export type PhonePeOrderState = "COMPLETED" | "FAILED" | "PENDING" | string;

export type PhonePeOrderStatus = {
  ok: boolean;
  orderId?: string;
  state?: PhonePeOrderState;
  amount?: number; // paise
  error?: string;
  status: number;
};

export async function getPhonePeOrderStatus(
  merchantOrderId: string,
): Promise<PhonePeOrderStatus> {
  const token = await getPhonePeAccessToken();

  const res = await fetch(getPhonePeOrderStatusUrl(merchantOrderId), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `O-Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    orderId?: string;
    state?: string;
    amount?: number;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        data.message || data.error || `PhonePe status lookup failed (${res.status}).`,
    };
  }

  return {
    ok: true,
    status: res.status,
    orderId: data.orderId,
    state: data.state,
    amount: typeof data.amount === "number" ? data.amount : undefined,
  };
}
