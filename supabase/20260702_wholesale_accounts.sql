-- ============================================================================
-- Rangat Pehnawa - Wholesale buyer profile
--
-- Clerk is the auth provider. RLS scopes rows by Clerk JWT `sub`, matching the
-- existing wishlist/profile schema. Run after wishlist_profile_schema.sql.
-- ============================================================================

create table if not exists public.wholesale_accounts (
  clerk_user_id   text primary key,
  business_name   text not null,
  city            text not null,
  gstin           text,
  whatsapp_phone  text not null,
  business_type   text not null
                  check (business_type in (
                    'Boutique',
                    'Reseller',
                    'Online seller',
                    'Distributor',
                    'Other'
                  )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_wholesale_accounts_updated_at
  on public.wholesale_accounts;
create trigger trg_wholesale_accounts_updated_at
  before update on public.wholesale_accounts
  for each row execute function public.set_updated_at();

alter table public.wholesale_accounts enable row level security;

drop policy if exists "wholesale_accounts_select_own"
  on public.wholesale_accounts;
create policy "wholesale_accounts_select_own"
  on public.wholesale_accounts
  for select to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'));

drop policy if exists "wholesale_accounts_insert_own"
  on public.wholesale_accounts;
create policy "wholesale_accounts_insert_own"
  on public.wholesale_accounts
  for insert to authenticated
  with check (clerk_user_id = (select auth.jwt() ->> 'sub'));

drop policy if exists "wholesale_accounts_update_own"
  on public.wholesale_accounts;
create policy "wholesale_accounts_update_own"
  on public.wholesale_accounts
  for update to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'))
  with check (clerk_user_id = (select auth.jwt() ->> 'sub'));
