# Razorpay Setup - Phase 1 B2B Checkout

Rangat Pehnawa Phase 1 includes a Razorpay-ready wholesale checkout. WhatsApp order confirmation remains the fallback when Razorpay keys are missing or payment needs manual assistance.

## Required Env Vars

```bash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

- `RAZORPAY_KEY_SECRET` is server-only. Never expose it in client code.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` is safe for browser checkout.
- Test mode and live mode use different key pairs. Keep live keys only in production secrets.
- `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` must be the same key id when both are set.

## Readiness Check

After pasting keys and restarting the app, call:

```bash
curl http://localhost:3000/api/razorpay/readiness
```

The response does not expose secrets. It reports booleans and mode:

```json
{
  "ok": true,
  "razorpay": {
    "configured": true,
    "mode": "test",
    "keyIdPresent": true,
    "publicKeyIdPresent": true,
    "secretPresent": true,
    "keyIdsMatch": true,
    "orderCreationReady": true,
    "verificationReady": true
  }
}
```

If `configured` is false, fix the reported `issue` before testing checkout.

## How `/api/razorpay/order` Works

The checkout page posts cart lines and buyer fields to `/api/razorpay/order`.

The server:

- Parses line items.
- Recalculates wholesale totals server-side.
- Enforces MOQ.
- Creates a Razorpay order only when key id and secret are configured.
- Returns setup-required fallback data when keys are missing.
- Returns a signed `intentToken` only when a real Razorpay order is created.
- Never returns the Razorpay secret.

## How `/api/razorpay/verify` Works

After Razorpay Checkout reports a successful payment, the checkout page posts `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, the signed `intentToken`, and the optional `medusaCartId` to `/api/razorpay/verify`.

The server:

- Requires all three Razorpay callback fields.
- Fails closed with `501` when `RAZORPAY_KEY_SECRET` is missing.
- Verifies the signed checkout intent token and confirms the callback order ID matches the server-created Razorpay order.
- Recomputes the HMAC-SHA256 digest over `order_id + "|" + payment_id` using the server-only secret.
- Uses constant-time comparison for the received signature.
- Returns `verified: true` only after the signature matches.
- Does not mark a Medusa order paid yet; payment collection/order completion must compare against a trusted Medusa cart/order record in Phase 2.

## Frontend Checkout Flow

`/checkout` supports two paths:

- WhatsApp confirmation: always available after MOQ is met.
- Razorpay payment: loads `https://checkout.razorpay.com/v1/checkout.js` only when the buyer starts payment and the server returns a Razorpay order.

Below MOQ, both payment and WhatsApp order actions are blocked with a clear message.

## WhatsApp Payment-Link Fallback

If Razorpay env vars are absent or checkout cannot load, buyers can confirm on WhatsApp and request a Razorpay payment link. The WhatsApp message includes buyer details, style codes, sets, pieces, ratio, tier, savings, and final total.

## Security Notes

- Do not trust client totals. Keep server-side amount calculation.
- Signature verification exists in `/api/razorpay/verify`; do not auto-mark orders paid until Medusa payment/order records are reconciled against Razorpay status and amount.
- Keep payment capture, invoice, and fulfillment status in an operations system before Medusa migration.

## Deployment Checklist

- Add Razorpay keys to deployment environment.
- Restart the app after adding keys.
- Confirm `/api/razorpay/readiness` returns `configured: true`, `keyIdsMatch: true`, and the expected `mode`.
- Confirm `/api/razorpay/order` returns `configured: true`.
- Place a test order above MOQ.
- Confirm Razorpay checkout opens with the expected amount.
- Confirm `/api/razorpay/verify` returns `verified: true` after a test payment.
- Confirm `/api/razorpay/verify` includes `orderFinalization.code=MEDUSA_ORDER_COMPLETION_DEFERRED` until Medusa order completion is implemented.
- Confirm WhatsApp fallback still works with keys removed.
- Verify customer-facing Shopify checkout remains hidden by default.
