export type RazorpayPayment = {
  id?: string;
  entity?: string;
  amount?: number;
  currency?: string;
  status?: string;
  order_id?: string;
  captured?: boolean;
  error_code?: string | null;
  error_description?: string | null;
};

export type RazorpayPaymentReconciliation =
  | { ok: true; payment: RazorpayPayment }
  | { ok: false; code: string; error: string; payment?: RazorpayPayment };

export async function fetchRazorpayPayment({
  paymentId,
  keyId,
  keySecret,
}: {
  paymentId: string;
  keyId: string;
  keySecret: string;
}): Promise<RazorpayPayment> {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      cache: "no-store",
    },
  );

  const data = (await response.json().catch(() => ({}))) as RazorpayPayment & {
    error?: { code?: string; description?: string };
  };

  if (!response.ok) {
    throw new Error(
      data.error?.description ||
        data.error_description ||
        `Razorpay payment lookup failed with status ${response.status}.`,
    );
  }

  return data;
}

export function reconcileRazorpayPayment({
  payment,
  expectedOrderId,
  expectedAmount,
  expectedCurrency,
}: {
  payment: RazorpayPayment;
  expectedOrderId: string;
  expectedAmount: number;
  expectedCurrency: string;
}): RazorpayPaymentReconciliation {
  if (payment.id && payment.entity && payment.entity !== "payment") {
    return {
      ok: false,
      code: "RAZORPAY_ENTITY_MISMATCH",
      error: "Razorpay lookup did not return a payment entity.",
      payment,
    };
  }

  if (payment.order_id !== expectedOrderId) {
    return {
      ok: false,
      code: "RAZORPAY_PAYMENT_ORDER_MISMATCH",
      error: "Razorpay payment order id does not match the checkout intent.",
      payment,
    };
  }

  if (Number(payment.amount) !== expectedAmount) {
    return {
      ok: false,
      code: "RAZORPAY_PAYMENT_AMOUNT_MISMATCH",
      error: "Razorpay payment amount does not match the checkout intent.",
      payment,
    };
  }

  if ((payment.currency || "").toUpperCase() !== expectedCurrency.toUpperCase()) {
    return {
      ok: false,
      code: "RAZORPAY_PAYMENT_CURRENCY_MISMATCH",
      error: "Razorpay payment currency does not match the checkout intent.",
      payment,
    };
  }

  if (payment.status !== "captured" || payment.captured !== true) {
    return {
      ok: false,
      code: "RAZORPAY_PAYMENT_NOT_CAPTURED",
      error: "Razorpay payment is not captured yet. Do not fulfil this order until capture is confirmed.",
      payment,
    };
  }

  return { ok: true, payment };
}