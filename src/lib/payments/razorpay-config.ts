export type RazorpayMode = "test" | "live" | "unknown";

export type RazorpayReadiness = {
  configured: boolean;
  mode: RazorpayMode;
  keyIdPresent: boolean;
  publicKeyIdPresent: boolean;
  secretPresent: boolean;
  keyIdsMatch: boolean;
  orderCreationReady: boolean;
  verificationReady: boolean;
  issue?: string;
};

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export function getRazorpayKeyId(): string {
  return clean(process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
}

export function getRazorpayPublicKeyId(): string {
  return clean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID);
}

export function getRazorpayKeySecret(): string {
  return clean(process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayMode(keyId = getRazorpayPublicKeyId()): RazorpayMode {
  if (keyId.startsWith("rzp_test_")) return "test";
  if (keyId.startsWith("rzp_live_")) return "live";
  return "unknown";
}

export function getRazorpayReadiness(): RazorpayReadiness {
  const serverKeyId = clean(process.env.RAZORPAY_KEY_ID);
  const publicKeyId = clean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const resolvedKeyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const keyIdsMatch = Boolean(
    !serverKeyId || !publicKeyId || serverKeyId === publicKeyId,
  );
  const keyIdPresent = Boolean(resolvedKeyId);
  const secretPresent = Boolean(keySecret);
  const configured = keyIdPresent && secretPresent && keyIdsMatch;

  return {
    configured,
    mode: getRazorpayMode(resolvedKeyId),
    keyIdPresent,
    publicKeyIdPresent: Boolean(publicKeyId),
    secretPresent,
    keyIdsMatch,
    orderCreationReady: configured,
    verificationReady: configured,
    ...(!keyIdsMatch
      ? { issue: "RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID must match." }
      : !keyIdPresent
        ? { issue: "Razorpay key id is missing." }
        : !secretPresent
          ? { issue: "Razorpay key secret is missing." }
          : {}),
  };
}
