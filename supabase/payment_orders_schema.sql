-- ============================================================================
-- Rangat Pehnawa — Razorpay payment → Medusa order ledger
--
-- Written/read exclusively by SERVER code using the SERVICE-ROLE key
-- (src/lib/supabase/admin.ts), from POST /api/razorpay/verify:
--   • On a verified + captured payment → upsert a 'captured' row.
--   • After the Medusa cart completes into an order → mark 'completed'.
--
-- The razorpay_payment_id primary key is the IDEMPOTENCY anchor: a replayed
-- verify call for the same payment finds the existing row and returns the
-- already-created order instead of completing the cart twice.
--
-- Only the service role touches it (it holds buyer + payment references), so
-- RLS stays ON with NO public policies. Run this in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.razorpay_payment_orders (
  razorpay_payment_id  text primary key,
  razorpay_order_id    text not null,
  medusa_cart_id       text,
  medusa_order_id      text,
  medusa_display_id    integer,
  amount               bigint not null,            -- paise, as charged by Razorpay
  currency             text not null default 'INR',
  receipt              text,
  status               text not null default 'captured'
                         check (status in ('captured', 'completed', 'failed')),
  last_error           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Reconciliation lookups by Razorpay order id and by the linked Medusa cart.
create index if not exists razorpay_payment_orders_order_idx
  on public.razorpay_payment_orders (razorpay_order_id);
create index if not exists razorpay_payment_orders_cart_idx
  on public.razorpay_payment_orders (medusa_cart_id)
  where medusa_cart_id is not null;

-- Lock it down: RLS on, intentionally NO policies → only the service role
-- (which bypasses RLS) can read/write. Clients get zero rows.
alter table public.razorpay_payment_orders enable row level security;
