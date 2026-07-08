# Current Status

Rangat Pehnawa is a B2B wholesale storefront with a Medusa-backed commerce
runtime in transition.

## Done

- Phase 1 wholesale storefront is complete.
- WhatsApp fallback order flow remains available.
- Medusa 2 backend scaffold exists under `apps/rangat-commerce/apps/backend`.
- Medusa cart creation, customer-link boundary, catalog seed/audit/sync scripts,
  and operations report are in place.
- Razorpay order creation, signed intent tokens, server verification, readiness
  checks, and keyless fail-closed behavior are implemented.

## Pending

- Add real Razorpay environment keys.
- Restart the storefront and verify `/api/razorpay/readiness`.
- Run one Razorpay test payment.
- Verify signature, captured status, amount, currency, Razorpay order ID, and
  Medusa cart ID.
- Implement or enable real Medusa order completion after captured payment.

Keep `MEDUSA_ORDER_COMPLETION_ENABLED` blank or false until that final order
completion path exists.

## Useful Docs

- Razorpay setup: `docs/RAZORPAY_SETUP.md`
- Operations runbook: `docs/PHASE_2_OPERATIONS_RUNBOOK.md`

## Key Paths

- Storefront Razorpay order route: `src/app/api/razorpay/order/route.ts`
- Storefront Razorpay verify route: `src/app/api/razorpay/verify/route.ts`
- Razorpay readiness route: `src/app/api/razorpay/readiness/route.ts`
- Razorpay config helper: `src/lib/payments/razorpay-config.ts`
- Medusa adapter: `src/lib/commerce/medusa-adapter.ts`
- Medusa customer link route:
  `apps/rangat-commerce/apps/backend/src/api/store/rangat/customer-link/route.ts`
- Medusa ops report:
  `apps/rangat-commerce/apps/backend/src/scripts/rangat-b2b-ops-report.ts`
