/**
 * PhonePe Standard Checkout v2 configuration + readiness.
 *
 * OAuth-based (client_id/client_secret) redirect flow — see the API reference in
 * memory or docs/PHONEPE_SETUP.md. Fail-closed: when credentials are absent the
 * app degrades to a WhatsApp fallback instead of pretending to take payment.
 */

export type PhonePeEnvironment = "sandbox" | "production";

export type PhonePeReadiness = {
  configured: boolean;
  environment: PhonePeEnvironment;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  clientVersionPresent: boolean;
  issue?: string;
};

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export function getPhonePeEnvironment(): PhonePeEnvironment {
  return clean(process.env.PHONEPE_ENVIRONMENT).toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function getPhonePeClientId(): string {
  return clean(process.env.PHONEPE_CLIENT_ID);
}

export function getPhonePeClientSecret(): string {
  return clean(process.env.PHONEPE_CLIENT_SECRET);
}

/** PhonePe requires a client_version; sandbox is typically "1". */
export function getPhonePeClientVersion(): string {
  return clean(process.env.PHONEPE_CLIENT_VERSION) || "1";
}

const HOSTS: Record<PhonePeEnvironment, { oauth: string; pg: string }> = {
  sandbox: {
    oauth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    pg: "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2",
  },
  production: {
    oauth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    pg: "https://api.phonepe.com/apis/pg/checkout/v2",
  },
};

export function getPhonePeOauthUrl(): string {
  return HOSTS[getPhonePeEnvironment()].oauth;
}

export function getPhonePePayUrl(): string {
  return `${HOSTS[getPhonePeEnvironment()].pg}/pay`;
}

export function getPhonePeOrderStatusUrl(merchantOrderId: string): string {
  return `${HOSTS[getPhonePeEnvironment()].pg}/order/${encodeURIComponent(
    merchantOrderId,
  )}/status`;
}

/** Basic-auth-style webhook credentials configured in the PhonePe dashboard. */
export function getPhonePeWebhookCredentials(): {
  username: string;
  password: string;
} {
  return {
    username: clean(process.env.PHONEPE_WEBHOOK_USERNAME),
    password: clean(process.env.PHONEPE_WEBHOOK_PASSWORD),
  };
}

export function getPhonePeReadiness(): PhonePeReadiness {
  const clientId = getPhonePeClientId();
  const clientSecret = getPhonePeClientSecret();
  const clientVersion = getPhonePeClientVersion();
  const clientIdPresent = Boolean(clientId);
  const clientSecretPresent = Boolean(clientSecret);
  const clientVersionPresent = Boolean(clientVersion);
  const configured = clientIdPresent && clientSecretPresent;

  return {
    configured,
    environment: getPhonePeEnvironment(),
    clientIdPresent,
    clientSecretPresent,
    clientVersionPresent,
    ...(clientIdPresent
      ? clientSecretPresent
        ? {}
        : { issue: "PHONEPE_CLIENT_SECRET is missing." }
      : { issue: "PHONEPE_CLIENT_ID is missing." }),
  };
}
