-- ============================================================================
-- Rangat Pehnawa — Generalize payment ledgers off Medusa
--
-- The razorpay/phonepe payment-order ledgers were keyed to Medusa cart/order
-- ids (medusa_cart_id / medusa_order_id / medusa_display_id). With the commerce
-- backend moving to Supabase (see 20260709_commerce_backend.sql), the "cart id"
-- threaded through the payment flow is now a commerce_orders.id (uuid text).
--
-- Rather than a breaking rename, add backend-neutral columns and backfill from
-- the Medusa columns. The adapter/payment routes write the new columns; the old
-- ones stay for historical rows. Idempotent.
-- ============================================================================

-- ── Razorpay ledger ──────────────────────────────────────────────────────────
alter table public.razorpay_payment_orders
  add column if not exists commerce_order_id text,
  add column if not exists commerce_order_number bigint;

-- Backfill neutral column from the legacy Medusa column for existing rows.
update public.razorpay_payment_orders
  set commerce_order_id = coalesce(commerce_order_id, medusa_cart_id)
  where commerce_order_id is null and medusa_cart_id is not null;

create index if not exists razorpay_payment_orders_commerce_idx
  on public.razorpay_payment_orders (commerce_order_id)
  where commerce_order_id is not null;

-- ── PhonePe ledger ───────────────────────────────────────────────────────────
alter table public.phonepe_payment_orders
  add column if not exists commerce_order_id text,
  add column if not exists commerce_order_number bigint;

update public.phonepe_payment_orders
  set commerce_order_id = coalesce(commerce_order_id, medusa_cart_id)
  where commerce_order_id is null and medusa_cart_id is not null;

create index if not exists phonepe_payment_orders_commerce_idx
  on public.phonepe_payment_orders (commerce_order_id)
  where commerce_order_id is not null;

-- Legacy medusa_* columns are intentionally LEFT in place (nullable) so historical
-- rows and any not-yet-updated code keep working. They can be dropped in a later
-- migration once all reads/writes use commerce_order_id.
