# Rangat Phase 2 Operations Runbook

This runbook is for the Medusa B2B transition period before live Razorpay payment completion and Medusa order finalization are enabled.

## Current Source Of Truth

- Catalog, variants, base prices, images, and high-stock seed inventory: Medusa.
- Buyer-facing checkout cart reservation: Medusa cart created by `/api/commerce/checkout`.
- Buyer identity during checkout: Clerk/Supabase wholesale profile when signed in, otherwise checkout form fields.
- Payment status: not automated yet. Until Razorpay live keys are configured and verified, use WhatsApp/manual confirmation.
- Paid order status: do not mark a Medusa cart/order as paid from the storefront yet.

## Daily Checks

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

Use the Medusa cart ID from checkout diagnostics, Razorpay keyless fallback response, or WhatsApp message if present.

Check these fields:

- `cart.id`: the reserved Medusa cart.
- `cart.items.quantity`: wholesale set count, not pieces.
- `cart.metadata.expected_total_sets`: expected checkout set count.
- `cart.metadata.buyer_reference`: stable operational buyer reference.
- `cart.customer.id`: Medusa customer created/found from checkout email.
- `cart.customer.groups`: should include `Rangat Wholesale Buyers` when the buyer supplied email and the internal customer-link route succeeded.
- `cart.customer.metadata`: buyer reference, account source, business type, GSTIN/city when supplied.

If `customer.id` or group linkage is missing, keep handling through WhatsApp and rerun checkout after confirming buyer email. Do not manually invent customer identity.

## Payment Boundary

Until real Razorpay keys are configured:

- Do not treat `/api/razorpay/order` keyless responses as paid.
- Do not clear carts as confirmed without a real payment or manual confirmation.
- Do not create a paid Medusa order from a cart.
- Keep WhatsApp confirmation as the operational fallback.

After Razorpay keys are added, the next engineering cycle must verify:

- `/api/razorpay/readiness` returns `configured: true`, matching key ids, and the expected key mode.
- Razorpay signature is valid.
- Razorpay payment lookup returns captured status.
- Razorpay amount and currency match the signed checkout intent.
- Medusa cart ID matches the checkout intent.
- Only then can a Medusa order/payment completion path mark the order paid.

`/api/razorpay/verify` now returns an `orderFinalization` object after a captured payment is reconciled. It is intentionally not an order-completion action yet:

- `MEDUSA_ORDER_COMPLETION_DEFERRED`: payment is captured and has a Medusa cart, but finalization is waiting for the final payment cycle.
- `MEDUSA_CART_REQUIRED`: payment verification did not carry a Medusa cart id, so Medusa order completion must not run.
- `MEDUSA_ORDER_COMPLETION_NOT_IMPLEMENTED`: `MEDUSA_ORDER_COMPLETION_ENABLED=true` was set before the implementation exists; this fails closed.

Keep `MEDUSA_ORDER_COMPLETION_ENABLED` blank until the final implementation is ready.

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
- Missing customer group: rerun checkout with buyer email after confirming `RANGAT_MEDUSA_INTERNAL_SECRET` is configured in both storefront and backend.
- Catalog/price/image/inventory audit fails: fix catalog governance before accepting new orders for the affected style.
