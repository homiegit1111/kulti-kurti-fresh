// ── Server-only Medusa Admin helpers ─────────────────────────────────────────
//
// This file must ONLY be imported from server-side code:
//   - Next.js API route handlers  (src/app/api/...)
//   - Next.js Server Components
//   - Server Actions
//
// Never import it from a "use client" component or any file that runs
// in the browser — it reads private environment variables.

// ── Public types ───────────────────────────────────────────────────────────────

export type MedusaCustomer = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  has_account?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type EnsureCustomerInput = {
  email: string;
  supabaseUserId: string;
  userMetadata?: Record<string, unknown> | null;
};

// ── Internal types ─────────────────────────────────────────────────────────────

type CustomerListResponse = {
  customers?: MedusaCustomer[];
};

type CustomerResponse = {
  customer?: MedusaCustomer;
};

// ── Configuration ──────────────────────────────────────────────────────────────

const getMedusaBaseUrl = (): string =>
  (
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_URL ||
    "http://localhost:9000"
  ).replace(/\/+$/, "");

const getAdminToken = (): string | undefined =>
  process.env.MEDUSA_ADMIN_API_TOKEN?.trim() || undefined;

/** Returns true when MEDUSA_ADMIN_API_TOKEN is set in the environment. */
export const isMedusaAdminConfigured = (): boolean => Boolean(getAdminToken());

// ── Error class ────────────────────────────────────────────────────────────────

export class MedusaAdminError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "MedusaAdminError";
    this.status = status;
    this.details = details;
  }
}

// ── Internal fetch helper ──────────────────────────────────────────────────────

const safeParseJson = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const extractErrorMessage = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  const msg = rec.message ?? rec.error;
  return typeof msg === "string" ? msg : null;
};

const medusaFetch = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const token = getAdminToken();
  if (!token) {
    throw new MedusaAdminError(
      "MEDUSA_ADMIN_API_TOKEN is not set. Add it to .env.local.",
      500,
    );
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${getMedusaBaseUrl()}${path}`, {
      ...init,
      headers,
      // Never cache admin API calls
      cache: "no-store",
    });
  } catch (networkError) {
    const msg =
      networkError instanceof Error
        ? networkError.message
        : "Network error reaching Medusa backend";
    throw new MedusaAdminError(
      `Cannot connect to Medusa at ${getMedusaBaseUrl()}: ${msg}`,
      503,
    );
  }

  const body = await safeParseJson(response);

  if (!response.ok) {
    throw new MedusaAdminError(
      extractErrorMessage(body) ?? `Medusa Admin API error: ${response.status}`,
      response.status,
      body,
    );
  }

  return body as T;
};

// ── Name extraction ────────────────────────────────────────────────────────────

const extractNames = (
  userMetadata: Record<string, unknown> | null | undefined,
): { first_name?: string; last_name?: string } => {
  if (!userMetadata) return {};

  const raw =
    typeof userMetadata.full_name === "string"
      ? userMetadata.full_name
      : typeof userMetadata.name === "string"
        ? userMetadata.name
        : null;

  if (!raw?.trim()) return {};

  const parts = raw.trim().split(/\s+/);
  const first_name = parts[0];
  const last_name = parts.slice(1).join(" ") || undefined;

  return {
    ...(first_name ? { first_name } : {}),
    ...(last_name ? { last_name } : {}),
  };
};

// ── Duplicate detection ────────────────────────────────────────────────────────

const isDuplicateError = (error: unknown): boolean => {
  if (!(error instanceof MedusaAdminError)) return false;
  if (error.status === 409) return true;
  const combined =
    `${error.message} ${JSON.stringify(error.details ?? "")}`.toLowerCase();
  return (
    combined.includes("duplicate") ||
    combined.includes("already exists") ||
    (combined.includes("email") && combined.includes("exists"))
  );
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Find an existing Medusa customer by exact email address.
 * Returns null if no customer is found.
 */
export const findMedusaCustomerByEmail = async (
  email: string,
): Promise<MedusaCustomer | null> => {
  const params = new URLSearchParams({
    email: email.trim().toLowerCase(),
    limit: "1",
  });

  const data = await medusaFetch<CustomerListResponse>(
    `/admin/customers?${params.toString()}`,
  );

  return data.customers?.[0] ?? null;
};

/**
 * Create a new Medusa customer linked to a Supabase user.
 * Stores supabase_user_id in metadata so the link is traceable.
 */
export const createMedusaCustomer = async (
  input: EnsureCustomerInput,
): Promise<MedusaCustomer> => {
  const names = extractNames(input.userMetadata);

  const data = await medusaFetch<CustomerResponse>("/admin/customers", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      ...names,
      metadata: {
        auth_provider: "supabase",
        supabase_user_id: input.supabaseUserId,
      },
    }),
  });

  if (!data.customer) {
    throw new MedusaAdminError(
      "Medusa returned success but no customer object.",
      502,
      data,
    );
  }

  return data.customer;
};

/**
 * Find the Medusa customer for a Supabase user, creating one if it doesn't
 * exist yet. Handles 409 duplicate conflicts gracefully by re-fetching.
 *
 * This is the main function to call from the API route.
 */
export const ensureMedusaCustomer = async (
  input: EnsureCustomerInput,
): Promise<MedusaCustomer> => {
  // 1. Try to find an existing customer first
  const existing = await findMedusaCustomerByEmail(input.email);
  if (existing) return existing;

  // 2. Create a new one
  try {
    return await createMedusaCustomer(input);
  } catch (error) {
    // 3. If there's a race-condition duplicate, fetch again
    if (isDuplicateError(error)) {
      const retry = await findMedusaCustomerByEmail(input.email);
      if (retry) return retry;
    }
    throw error;
  }
};
