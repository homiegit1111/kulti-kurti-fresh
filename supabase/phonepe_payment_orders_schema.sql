-- ============================================================================
-- Rangat Pehnawa — PhonePe payment → Medusa order ledger
--
-- Written/read exclusively by SERVER code using the SERVICE-ROLE key, from:
--   • POST /api/phonepe/pay        → insert a 'pending' row (before redirect)
--   • GET  /api/phonepe/callback   → status check → complete + mark 'completed'
--   • POST /api/webhooks/phonepe   → async confirmation → same completion path
--
-- merchant_order_id is OUR id (we generate it and pass it to PhonePe). It is the
-- IDEMPOTENCY anchor: the return-redirect and the webhook both resolve the same
-- row, so whichever arrives first completes the order and the other is a no-op.
--
-- Service-role only (holds buyer + payment references) → RLS on, NO policies.
-- Run this in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.phonepe_payment_orders (
  merchant_order_id    text primary key,
  phonepe_order_id     text,
  medusa_cart_id       text,
  medusa_order_id      text,
  medusa_display_id    integer,
  amount               bigint not null,            -- paise, as sent to PhonePe
  currency             text not null default 'INR',
  status               text not null default 'pending'
                         check (status in ('pending', 'completed', 'failed')),
  last_error           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists phonepe_payment_orders_cart_idx
  on public.phonepe_payment_orders (medusa_cart_id)
  where medusa_cart_id is not null;

alter table public.phonepe_payment_orders enable row level security;
-- No policies: service-role only.
