# Current Status

Rangat Pehnawa is a B2B wholesale storefront. The commerce runtime is the
Supabase-backed adapter (catalog, orders, payment ledgers — no separate
commerce server). The Medusa 2 scaffold under `apps/rangat-commerce` is
retired from the runtime and kept for reference.

## Done

- Phase 1 wholesale storefront is complete.
- WhatsApp fallback order flow remains available.
- Supabase commerce backend is primary: catalog, commerce order drafts,
  payment reconciliation, lifecycle crons, admin dashboard (`/admin`).
- Razorpay order creation, signed intent tokens, server verification, readiness
  checks, and keyless fail-closed behavior are implemented.
- Storefront UI overhaul shipped 2026-07-23 (commits `7a33dce`…`681420d`):
  desk-math margin planner, command-desk search, printable line sheet
  (`/line-sheet`), lookbook/collections elevation, per-product OG share
  cards, view transitions, cinematic hero, accessibility pass.
- Medusa 2 backend scaffold retained under `apps/rangat-commerce/apps/backend`
  (retired from the runtime; the `"medusa"` backend value is treated as unset).

## Pending

- Add real Razorpay environment keys.
- Restart the storefront and verify `/api/razorpay/readiness`.
- Run one Razorpay test payment.
- Verify signature, captured status, amount, currency, Razorpay order ID, and
  the linked commerce order id.
- Confirm automatic order completion end-to-end on the first captured test
  payment.

Order completion is ON by default: a verified + captured payment with a linked
commerce order completes it. Set `COMMERCE_ORDER_COMPLETION_DISABLED=true`
only to pause completion temporarily (see the runbook). Also decide the GST
charging question: the storefront currently charges the GST-exclusive subtotal
online and estimates GST at invoice (displays were reconciled to match).

## Useful Docs

- Razorpay setup: `docs/RAZORPAY_SETUP.md`
- Operations runbook: `docs/PHASE_2_OPERATIONS_RUNBOOK.md`

## Key Paths

- Storefront Razorpay order route: `src/app/api/razorpay/order/route.ts`
- Storefront Razorpay verify route: `src/app/api/razorpay/verify/route.ts`
- Razorpay readiness route: `src/app/api/razorpay/readiness/route.ts`
- Razorpay config helper: `src/lib/payments/razorpay-config.ts`
- Supabase commerce adapter: `src/lib/commerce/supabase-adapter.ts`
- Order finalization semantics: `src/lib/commerce/order-finalization.ts`
- Checkout draft (signed amount source of truth):
  `src/lib/commerce/checkout-draft.ts`
- Legacy Medusa scaffold (retired): `apps/rangat-commerce/apps/backend`
