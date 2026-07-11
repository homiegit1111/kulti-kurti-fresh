-- ============================================================================
-- Rangat Pehnawa — Fix stock_alerts upsert conflict target (bug: 42P10)
--
-- The dedupe index was an EXPRESSION index on coalesce(size, ''), but the
-- application upsert uses PostgREST on_conflict, which can only reference plain
-- column names — never an expression. Result: every registerStockAlert() call
-- raised Postgres 42P10 ("no unique or exclusion constraint matching the ON
-- CONFLICT specification"), which the code didn't catch → new signups failed.
--
-- Fix: add a generated column that materializes coalesce(size, '') and put the
-- plain unique index on it, so on_conflict can target real columns.
-- Run this once in the Supabase SQL editor after lifecycle_schema.sql.
-- ============================================================================

alter table public.stock_alerts
  add column if not exists size_key text
  generated always as (coalesce(size, '')) stored;

drop index if exists stock_alerts_unique_idx;

create unique index if not exists stock_alerts_unique_idx
  on public.stock_alerts (email, product_handle, size_key);
