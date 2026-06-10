-- ============================================================================
-- Rangat Pehnawa — Abandoned-cart recovery table
--
-- Written/read exclusively by SERVER code using the SERVICE-ROLE key
-- (src/lib/supabase/admin.ts):
--   • POST /api/cart/track            → upsert a snapshot (capture)
--   • GET  /api/cron/abandoned-cart   → scan + send win-back emails
--
-- Because only the service role touches it, RLS stays ON with NO public
-- policies — clients cannot read or write this table directly (it may contain
-- many shoppers' emails + carts). Run this in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.abandoned_carts (
  cart_id        text primary key,
  email          text not null,
  items          jsonb not null default '[]'::jsonb,
  subtotal       numeric not null default 0,
  checkout_url   text,
  recovered      boolean not null default false,
  email_sent_at  timestamptz,
  updated_at     timestamptz not null default now()
);

-- Fast lookup for the sweep: not recovered, not yet emailed, stale carts.
create index if not exists abandoned_carts_sweep_idx
  on public.abandoned_carts (updated_at)
  where recovered = false and email_sent_at is null;

-- Lock it down: RLS on, and intentionally NO policies → anon/auth clients get
-- zero rows. Only the service role (which bypasses RLS) can access it.
alter table public.abandoned_carts enable row level security;

-- Optional housekeeping: drop carts older than 30 days (run via cron/pg_cron).
-- delete from public.abandoned_carts where updated_at < now() - interval '30 days';
