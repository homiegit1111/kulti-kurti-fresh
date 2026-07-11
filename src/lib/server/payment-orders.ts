import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Idempotency ledger for Razorpay-captured payments and their Medusa orders.
 *
 * Keyed by razorpay_payment_id (Razorpay guarantees one per successful payment)
 * so a replayed /api/razorpay/verify call cannot complete the same cart twice.
 * All access is service-role only — see supabase/payment_orders_schema.sql.
 *
 * Degrades gracefully: when Supabase isn't configured every call returns a
 * neutral result so checkout keeps working (idempotency is best-effort, but the
 * Medusa cart's own completed_at guard is the backstop against double orders).
 */

const TABLE = "razorpay_payment_orders";

export type PaymentOrderStatus = "captured" | "completed" | "failed";

export type PaymentOrderRecord = {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  commerceOrderId: string | null;
  commerceOrderNumber: number | null;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
};

type Row = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  commerce_order_id: string | null;
  commerce_order_number: number | null;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
};

function toRecord(row: Row): PaymentOrderRecord {
  return {
    razorpayPaymentId: row.razorpay_payment_id,
    razorpayOrderId: row.razorpay_order_id,
    commerceOrderId: row.commerce_order_id,
    commerceOrderNumber: row.commerce_order_number,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
  };
}

export async function findPaymentOrder(
  razorpayPaymentId: string,
): Promise<PaymentOrderRecord | null> {
  const client = createServiceRoleClient();
  if (!client) return null;

  const { data } = await client
    .from(TABLE)
    .select(
      "razorpay_payment_id,razorpay_order_id,commerce_order_id,commerce_order_number,amount,currency,status",
    )
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle();

  return data ? toRecord(data as Row) : null;
}

/** Record a captured payment before attempting cart completion. Idempotent. */
export async function recordCapturedPayment(input: {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  commerceOrderId?: string;
  amount: number;
  currency: string;
  receipt?: string;
}): Promise<boolean> {
  const client = createServiceRoleClient();
  if (!client) return false;

  const { error } = await client.from(TABLE).upsert(
    {
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_order_id: input.razorpayOrderId,
      commerce_order_id: input.commerceOrderId ?? null,
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "razorpay_payment_id", ignoreDuplicates: true },
  );
  return !error;
}

export async function markPaymentOrderCompleted(input: {
  razorpayPaymentId: string;
  commerceOrderId: string;
  commerceOrderNumber?: number;
}): Promise<void> {
  const client = createServiceRoleClient();
  if (!client) return;

  await client
    .from(TABLE)
    .update({
      status: "completed",
      commerce_order_id: input.commerceOrderId,
      commerce_order_number: input.commerceOrderNumber ?? null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_payment_id", input.razorpayPaymentId);
}

export async function markPaymentOrderFailed(input: {
  razorpayPaymentId: string;
  error: string;
}): Promise<void> {
  const client = createServiceRoleClient();
  if (!client) return;

  await client
    .from(TABLE)
    .update({
      status: "failed",
      last_error: input.error.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_payment_id", input.razorpayPaymentId);
}
