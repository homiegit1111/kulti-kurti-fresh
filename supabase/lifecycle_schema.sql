-- ============================================================================
-- Rangat Pehnawa — lifecycle email tables: wishlist nudges + stock alerts
--
-- Both tables are SERVICE-ROLE ONLY: written by cron sweeps and the
-- /api/stock-alerts route (which validates + rate-limits in code). RLS is
-- enabled with NO policies, so anon/authenticated clients can't touch them;
-- the service-role key bypasses RLS by design.
--
-- Run after wishlist_profile_schema.sql (reuses public.set_updated_at()).
-- ============================================================================

-- ── 1) WISHLIST NUDGES — cooldown stamp per user ────────────────────────────
create table if not exists public.wishlist_nudges (
  clerk_user_id  text primary key,
  last_sent_at   timestamptz not null default now()
);

alter table public.wishlist_nudges enable row level security;
-- No policies: service-role only.

-- ── 2) STOCK ALERTS — back-in-stock / size requests ─────────────────────────
create table if not exists public.stock_alerts (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  product_handle  text not null,
  size            text,                       -- null = any size
  clerk_user_id   text,                       -- set when requested signed-in
  created_at      timestamptz not null default now(),
  notified_at     timestamptz                 -- null = still waiting
);

-- One live alert per (email, product, size). Coalesce so "any size" dedupes too.
create unique index if not exists stock_alerts_unique_idx
  on public.stock_alerts (email, product_handle, coalesce(size, ''));

create index if not exists stock_alerts_pending_idx
  on public.stock_alerts (product_handle)
  where notified_at is null;

alter table public.stock_alerts enable row level security;
-- No policies: service-role only.
