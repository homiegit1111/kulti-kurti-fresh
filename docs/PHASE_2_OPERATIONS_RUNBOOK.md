# Rangat Phase 2 Operations Runbook

This runbook covers the period before live Razorpay keys are configured and a
real test payment has been verified. The commerce runtime is the
**Supabase-backed adapter** (`src/lib/commerce/supabase-adapter.ts`); the Medusa
scaffold under `apps/rangat-commerce` is retired from the runtime (the
`"medusa"` backend value is treated as unset — see `src/lib/commerce/index.ts`)
and kept for reference only.

## Current Source Of Truth

- Catalog, prices, images, orders, payment ledgers: Supabase (apply
  `supabase/20260709_commerce_backend.sql` and related migrations; seed with
  `node scripts/seed-supabase-catalog.mjs`).
- Buyer-facing checkout reservation: a commerce order draft created by
  `/api/commerce/checkout` (Supabase `commerce_orders`).
- Buyer identity during checkout: Clerk/Supabase wholesale profile when signed
  in, otherwise checkout form fields.
- Payment status: automated once real Razorpay keys are configured and
  verified. Until then, use WhatsApp/manual confirmation.
- Order inspection: the `/admin` dashboard (orders + products) for allowlisted
  Clerk users (`ADMIN_CLERK_USER_IDS`), or the Supabase tables directly.

## Daily Checks (LEGACY — Medusa scaffold only)

The commands below target the retired Medusa scaffold and are kept for
reference. They are not part of the live Supabase runtime.

From `apps/rangat-commerce/apps/backend`:

```powershell
$env:XDG_CONFIG_HOME='C:\Kulti\Kurti\apps\rangat-commerce\.config'
.\node_modules\.bin\medusa.CMD exec .\src\scripts\rangat-b2b-catalog-audit.ts
.\node_modules\.bin\medusa.CMD exec .\src\scripts\rangat-b2b-price-audit.ts
.\node_modules\.bin\medusa.CMD exec .\src\scripts\rangat-b2b-image-inventory-audit.ts
.\node_modules\.bin\medusa.CMD exec .\src\scripts\rangat-b2b-customer-group-audit.ts
.\node_modules\.bin\medusa.CMD exec .\src\scripts\rangat-b2b-ops-report.ts
```

The ops report is non-failing by default because historical carts may exist from earlier migration cycles. To fail on pending-cart linkage or quantity issues:

```powershell
$env:RANGAT_OPS_REPORT_STRICT='true'
.\node_modules\.bin\medusa.CMD exec .\src\scripts\rangat-b2b-ops-report.ts
```

## Handling A Buyer Inquiry

Use the commerce order id from checkout diagnostics, the Razorpay keyless
fallback response, or the WhatsApp message if present.

Check these fields (in `/admin/orders` or Supabase `commerce_orders`):

- order id: the reserved commerce order draft.
- line quantities: wholesale set counts, not pieces.
- expected total sets: from the checkout intent notes.
- buyer reference: stable operational buyer reference.
- buyer fields: name, business, city, WhatsApp phone, email, GSTIN when
  supplied (from the checkout form or wholesale profile).

If `customer.id` or group linkage is missing, keep handling through WhatsApp and rerun checkout after confirming buyer email. Do not manually invent customer identity.

## Payment Boundary

Until real Razorpay keys are configured:

- Do not treat `/api/razorpay/order` keyless responses as paid.
- Do not clear carts as confirmed without a real payment or manual confirmation.
- Do not mark a commerce order as paid without a verified capture.
- Keep WhatsApp confirmation as the operational fallback.

After Razorpay keys are added, the next engineering cycle must verify:

- `/api/razorpay/readiness` returns `configured: true`, matching key ids, and the expected key mode.
- Razorpay signature is valid.
- Razorpay payment lookup returns captured status.
- Razorpay amount and currency match the signed checkout intent.
- The commerce order id matches the signed checkout intent.
- Only then does order completion mark the order paid.

`/api/razorpay/verify` returns an `orderFinalization` object after a captured
payment is reconciled (see `src/lib/commerce/order-finalization.ts`):

- `COMMERCE_ORDER_COMPLETION_READY`: captured payment with a linked commerce
  order — completion proceeds.
- `COMMERCE_ORDER_COMPLETION_DEFERRED`: completion is paused by the
  kill-switch (see below).
- `COMMERCE_ORDER_REQUIRED`: the payment did not carry a commerce order id, so
  completion must not run.
- `PAYMENT_CAPTURE_REQUIRED`: the payment is not captured yet.
- `COMMERCE_ORDER_INTENT_MISMATCH` (webhook): the order id does not match the
  signed checkout intent; fails closed.

Completion is ON by default. Set `COMMERCE_ORDER_COMPLETION_DISABLED=true`
only to pause automatic completion in production without a redeploy (payments
still verify and reconcile; completion is deferred until you unset it). The
legacy `MEDUSA_ORDER_COMPLETION_ENABLED` is still honored as an explicit
enable for backward compatibility, but should not be used in new
configuration.

## Customer Support Language

Use clear transition wording:

- "Your wholesale cart is reserved."
- "We will confirm payment and dispatch on WhatsApp."
- "Order history will show automatically after online payment completion is fully enabled."

Avoid saying:

- "Paid" unless payment has been manually verified.
- "Order confirmed" for a cart-only reservation.
- "Shopify checkout" unless explicitly testing legacy Shopify mode.

## Recovery Rules

- Cart exists but no payment: contact buyer on WhatsApp and confirm payment link/manual transfer.
- Cart quantity mismatch: ask buyer to rebuild checkout; do not edit quantities blindly.
- Missing buyer linkage: rerun checkout after confirming the buyer email. (Legacy Medusa scaffold used `RANGAT_MEDUSA_INTERNAL_SECRET`; not part of the live runtime.)
- Catalog/price/image/inventory audit fails: fix catalog governance before accepting new orders for the affected style.
