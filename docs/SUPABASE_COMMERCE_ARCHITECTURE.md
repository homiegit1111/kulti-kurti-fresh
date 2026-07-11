# Rangat Pehnawa — Supabase Commerce Architecture

Status: migration design, 2026-07-10

This document defines the target architecture for the B2B storefront after
retiring Medusa. The existing Next.js frontend remains the customer-facing UI.

## Decision

Use Supabase as the commerce data platform:

- Postgres: catalog, variants, prices, wholesale rules, customers, carts/draft
  orders, orders, payments, inventory, reviews, wishlists, and operations data.
- Storage: product and review images.
- Auth: Clerk remains the current identity provider during the cutover. Its
  verified session token is used with Supabase RLS. A later migration to
  Supabase Auth is optional and should not be mixed with the payment cutover.
- Server API: the Next.js route handlers are the trusted application boundary.
  They validate requests, re-price from Postgres, call payment providers, and
  use the service-role key only from server code.
- Hosting: Cloudflare Workers through OpenNext. This application needs server
  route handlers, `node:crypto`, webhooks, and scheduled work, so it is not a
  static Pages-only deployment.
- Payments: one gateway first (Razorpay is the current implementation), with
  WhatsApp/manual collection as a fallback. PhonePe or PayU can be added later
  behind the same payment-provider interface.

Supabase's own Dashboard is useful for Table Editor, SQL migrations, Storage,
Auth configuration, logs, backups, and policies. It is not a finished
ecommerce operations panel. The application's `/admin` area remains the place
for product publishing, inventory editing, order workflow, and business views.

## Data ownership and trust boundaries

| Area | Browser access | Trusted server access |
| --- | --- | --- |
| Published catalog | Read published products/variants only | Admin writes through `/api/admin` |
| Product images | Public read from a deliberately public bucket | Admin-only upload route |
| Customer profile | Own rows through Clerk-backed RLS | Checkout/profile server routes |
| Draft orders | No direct browser writes | Checkout route creates snapshots |
| Orders | Own paid/pending history only | Admin, payment callbacks, reconciliation |
| Payment ledgers | No browser access | Webhooks and verification handlers |
| Inventory | Public availability only | Atomic reservation/release functions |
| Admin operations | No direct table writes | Clerk allowlist/role-gated routes |

The service-role key bypasses RLS and must never be sent to the browser. Every
route using it must perform its own authorization and ownership checks. Public
or authenticated clients use the publishable/anon key only against tables with
explicit RLS policies.

## Core ecommerce model

The minimum reliable model is:

1. `commerce_collections`
2. `commerce_products`
3. `commerce_product_variants` with the authoritative per-set price and stock
4. `commerce_orders` as the order/cart snapshot, never a live price calculation
5. `commerce_order_items` as immutable line-price snapshots
6. `commerce_payment_attempts` or provider ledgers with provider IDs, amounts,
   states, webhook event IDs, and idempotency constraints
7. `commerce_inventory_reservations` plus an atomic SQL function for reserve,
   release, and consume operations
8. `commerce_admin_audit_log` for product, price, stock, refund, and status
   changes

The checkout flow must always:

1. Load the current user identity on the server.
2. Validate the cart and MOQ.
3. Resolve every product and selected variant from Postgres.
4. Recalculate wholesale pricing server-side.
5. Create a draft order and immutable line snapshots.
6. Return a short-lived checkout capability bound to that order and buyer.
7. Create a payment only when the draft is valid and still payable.
8. Verify the provider signature and authoritative provider status.
9. Reconcile provider amount/currency/order ID against the draft snapshot.
10. Atomically consume inventory and mark the order paid, idempotently.

The browser redirect is only a UX signal. Webhooks and server-side provider
lookups are the source of payment truth.

## Admin workflow

The custom admin panel should support:

- Create a draft product.
- Upload validated raster images to `product-images`.
- Add collections and variants.
- Set per-set prices, SKU, size, inventory, and backorder policy.
- Preview the product exactly as the storefront will render it.
- Publish/unpublish with an explicit action and audit entry.
- View products with low/out-of-stock variants.
- View orders by status and payment state.
- Fulfill, cancel, and record manual payment/refund events with audit entries.
- Export orders for invoicing/dispatch.

The publish operation should reject products without a title, handle, image,
valid price, and at least one sellable variant. Product deletion should be
soft-delete/unpublish once orders reference the product; historical order lines
must remain readable.

## Safety requirements before live payments

- Use verified Clerk user ID, never a client-supplied buyer reference, for
  `commerce_orders.clerk_user_id`.
- Never accept a payment without a valid, unexpired draft order capability.
- Require draft status and no existing payment transaction before charging.
- Verify provider signatures, provider status, amount, currency, and order ID.
- Handle provider webhooks with event-level idempotency.
- Add an atomic inventory reservation/consume path. Do not decrement stock with
  two independent browser/API updates.
- Keep payment and order mutations server-only.
- Apply RLS to every exposed table and create no public write policy for
  catalog, orders, payments, or inventory.
- Keep admin authorization separate from ordinary customer authorization.
- Rate-limit checkout, admin mutations, uploads, webhooks, and recovery routes.
- Keep development, staging, and production Supabase projects separate.
- Enable backups appropriate to the production plan and separately back up
  Storage objects; database backups do not restore Storage files.

## Phases

### Phase 0 — Foundation and evidence

- Apply migrations in a deterministic order.
- Set Supabase and payment environment variables.
- Install and verify OpenNext/Cloudflare tooling.
- Fix TypeScript/lint errors.
- Add focused tests for pricing, ownership, payment replay, and inventory race.

### Phase 1 — Secure commerce cutover

- Replace Medusa wire names with commerce-neutral names.
- Bind orders to verified identity and short-lived checkout capabilities.
- Block payments when draft creation or binding fails.
- Add Razorpay webhook reconciliation.

### Phase 2 — Catalog and inventory operations

- Make product draft/publish workflow complete.
- Add atomic inventory reservation/release/consume functions.
- Add admin audit log and safe unpublish behavior.

### Phase 3 — Cloudflare production path

- Deploy the Next.js app as a Workers/OpenNext custom worker.
- Verify secrets, public build-time variables, R2 cache, webhook routes, and
  scheduled jobs in a preview environment.
- Run payment and order smoke tests with test credentials.

### Phase 4 — Business expansion

- Add shipping zones/rates, GST invoice integration, refunds, returns, courier
  tracking, customer credit terms, bulk CSV import, and optional second gateway.

## Official references

- Supabase database and Dashboard: https://supabase.com/docs/guides/database/overview
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Supabase Storage policies: https://supabase.com/docs/guides/storage/security/access-control
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase Clerk third-party auth: https://supabase.com/docs/guides/auth/third-party/clerk
- Cloudflare Next.js on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- OpenNext custom Worker handlers: https://opennext.js.org/cloudflare/howtos/custom-worker
