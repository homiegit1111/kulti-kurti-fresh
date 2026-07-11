import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getCommerceAdapter } from "@/lib/commerce";
import { getPhonePeOrderStatus } from "@/lib/payments/phonepe-api";
import { markRecoveredByEmail } from "@/lib/server/abandoned-cart";

/**
 * PhonePe payment → Medusa order ledger + completion.
 *
 * Keyed by merchant_order_id (our id). Both the browser return-redirect and the
 * async webhook route call finalizePhonePeOrder(); the DB row's status is the
 * idempotency guard so the order completes exactly once. See
 * supabase/phonepe_payment_orders_schema.sql.
 */

const TABLE = "phonepe_payment_orders";

export type PhonePeOrderStatus = "pending" | "completed" | "failed";

export type PhonePeOrderRecord = {
  merchantOrderId: string;
  phonepeOrderId: string | null;
  medusaCartId: string | null;
  medusaOrderId: string | null;
  medusaDisplayId: number | null;
  amount: number;
  currency: string;
  status: PhonePeOrderStatus;
};

type Row = {
  merchant_order_id: string;
  phonepe_order_id: string | null;
  medusa_cart_id: string | null;
  medusa_order_id: string | null;
  medusa_display_id: number | null;
  amount: number;
  currency: string;
  status: PhonePeOrderStatus;
};

function toRecord(row: Row): PhonePeOrderRecord {
  return {
    merchantOrderId: row.merchant_order_id,
    phonepeOrderId: row.phonepe_order_id,
    medusaCartId: row.medusa_cart_id,
    medusaOrderId: row.medusa_order_id,
    medusaDisplayId: row.medusa_display_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
  };
}

export async function createPendingPhonePeOrder(input: {
  merchantOrderId: string;
  medusaCartId?: string;
  amount: number;
  currency: string;
}): Promise<boolean> {
  const client = createServiceRoleClient();
  if (!client) return false;

  const { error } = await client.from(TABLE).insert({
    merchant_order_id: input.merchantOrderId,
    medusa_cart_id: input.medusaCartId ?? null,
    amount: input.amount,
    currency: input.currency,
    status: "pending",
  });
  return !error;
}

export async function findPhonePeOrder(
  merchantOrderId: string,
): Promise<PhonePeOrderRecord | null> {
  const client = createServiceRoleClient();
  if (!client) return null;

  const { data } = await client
    .from(TABLE)
    .select(
      "merchant_order_id,phonepe_order_id,medusa_cart_id,medusa_order_id,medusa_display_id,amount,currency,status",
    )
    .eq("merchant_order_id", merchantOrderId)
    .maybeSingle();

  return data ? toRecord(data as Row) : null;
}

export type FinalizeResult = {
  status: PhonePeOrderStatus;
  medusaOrderId?: string;
  medusaDisplayId?: number;
  reason?: string;
};

/**
 * Resolve the true payment state from PhonePe, then complete the Medusa order
 * exactly once. Safe to call from both the return-redirect and the webhook.
 */
export async function finalizePhonePeOrder(
  merchantOrderId: string,
): Promise<FinalizeResult> {
  const record = await findPhonePeOrder(merchantOrderId);
  if (!record) {
    return { status: "failed", reason: "Unknown merchant order id." };
  }

  // Already resolved — idempotent short-circuit.
  if (record.status === "completed" && record.medusaOrderId) {
    return {
      status: "completed",
      medusaOrderId: record.medusaOrderId,
      medusaDisplayId: record.medusaDisplayId ?? undefined,
    };
  }
  if (record.status === "failed") {
    return { status: "failed", reason: "Payment previously marked failed." };
  }

  // Authoritative status comes from PhonePe, never from the client redirect.
  const status = await getPhonePeOrderStatus(merchantOrderId);
  if (!status.ok) {
    return { status: "pending", reason: status.error || "Status unavailable." };
  }

  if (status.state === "FAILED") {
    await markPhonePeOrderFailed(merchantOrderId, "PhonePe reported FAILED.");
    return { status: "failed", reason: "Payment failed." };
  }

  if (status.state !== "COMPLETED") {
    return { status: "pending", reason: `PhonePe state: ${status.state}.` };
  }

  // Guard against amount tampering: PhonePe's amount must match what we stored.
  if (
    typeof status.amount === "number" &&
    status.amount !== record.amount
  ) {
    await markPhonePeOrderFailed(
      merchantOrderId,
      `Amount mismatch: PhonePe ${status.amount} vs ledger ${record.amount}.`,
    );
    return { status: "failed", reason: "Payment amount mismatch." };
  }

  if (!record.medusaCartId) {
    // Payment is good but there's no cart to complete (e.g. mock backend).
    await markPhonePeOrderCompleted({
      merchantOrderId,
      phonepeOrderId: status.orderId,
    });
    return { status: "completed", reason: "No Medusa cart linked." };
  }

  const adapter = getCommerceAdapter();
  if (!adapter.completePaidOrder) {
    await markPhonePeOrderCompleted({
      merchantOrderId,
      phonepeOrderId: status.orderId,
    });
    return { status: "completed", reason: "Backend has no order completion." };
  }

  const completion = await adapter.completePaidOrder({
    cartId: record.medusaCartId,
    paymentProvider: "phonepe",
    paymentId: status.orderId || merchantOrderId,
    paymentOrderId: merchantOrderId,
    amountPaise: record.amount,
    currency: record.currency,
  });

  if (!completion.ok || !completion.orderId) {
    await markPhonePeOrderFailed(
      merchantOrderId,
      completion.reason || "Medusa order completion failed.",
    );
    return {
      status: "failed",
      reason: completion.reason || "Order completion failed.",
    };
  }

  await markPhonePeOrderCompleted({
    merchantOrderId,
    phonepeOrderId: status.orderId,
    medusaOrderId: completion.orderId,
    medusaDisplayId: completion.displayId,
  });

  // Stop win-back emails for this buyer now that they've purchased (replaces the
  // dead Shopify-webhook reconciliation post-Medusa migration).
  if (completion.buyerEmail) {
    await markRecoveredByEmail(completion.buyerEmail);
  }

  return {
    status: "completed",
    medusaOrderId: completion.orderId,
    medusaDisplayId: completion.displayId,
  };
}

async function markPhonePeOrderCompleted(input: {
  merchantOrderId: string;
  phonepeOrderId?: string;
  medusaOrderId?: string;
  medusaDisplayId?: number;
}): Promise<void> {
  const client = createServiceRoleClient();
  if (!client) return;

  await client
    .from(TABLE)
    .update({
      status: "completed",
      phonepe_order_id: input.phonepeOrderId ?? null,
      medusa_order_id: input.medusaOrderId ?? null,
      medusa_display_id: input.medusaDisplayId ?? null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("merchant_order_id", input.merchantOrderId)
    .neq("status", "completed");
}

async function markPhonePeOrderFailed(
  merchantOrderId: string,
  error: string,
): Promise<void> {
  const client = createServiceRoleClient();
  if (!client) return;

  await client
    .from(TABLE)
    .update({
      status: "failed",
      last_error: error.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("merchant_order_id", merchantOrderId)
    .eq("status", "pending");
}
