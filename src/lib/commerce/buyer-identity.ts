import type { CommerceBuyer } from "./types";

const EMPTY_REFERENCE = "";

function compact(value: string | undefined, maxLength: number): string {
  return (value ?? "").trim().slice(0, maxLength);
}

function normalizeText(value: string | undefined): string {
  return compact(value, 160).toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(value: string | undefined): string {
  const digits = compact(value, 40).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function buildBuyerReference(buyer: CommerceBuyer | undefined): string {
  if (buyer?.buyerReference) return compact(buyer.buyerReference, 64);

  const fingerprint = [
    normalizeText(buyer?.email),
    normalizePhone(buyer?.phone),
    normalizeText(buyer?.gstin),
    normalizeText(buyer?.businessName),
    normalizeText(buyer?.city),
  ].filter(Boolean);

  if (fingerprint.length === 0) return EMPTY_REFERENCE;
  return `rb_${hashString(fingerprint.join("|"))}`;
}

export function withBuyerIdentity<T extends CommerceBuyer>(buyer: T): T {
  const buyerReference = buildBuyerReference(buyer);
  const hasBuyerData = Boolean(
    buyerReference ||
      buyer.email ||
      buyer.phone ||
      buyer.businessName ||
      buyer.name ||
      buyer.gstin,
  );

  return {
    ...buyer,
    ...(buyerReference ? { buyerReference } : {}),
    accountSource:
      buyer.accountSource ?? (hasBuyerData ? "checkout_form" : "anonymous_checkout"),
  };
}

export function buyerIdentityMetadata(
  buyer: CommerceBuyer | undefined,
): Record<string, string> {
  const buyerReference = buildBuyerReference(buyer);
  return {
    buyer_identity_version: "buyer_identity_v1",
    ...(buyerReference ? { buyer_reference: buyerReference } : {}),
    ...(buyer?.accountSource ? { account_source: buyer.accountSource } : {}),
    ...(buyer?.businessType ? { business_type: compact(buyer.businessType, 60) } : {}),
    ...(buyer?.email ? { buyer_email: compact(buyer.email, 160) } : {}),
  };
}