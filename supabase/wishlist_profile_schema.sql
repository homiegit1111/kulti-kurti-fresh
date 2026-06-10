-- ============================================================================
-- Rangat Pehnawa — Supabase schema + RLS for Profiles & Wishlist
--
-- AUTH MODEL: this app authenticates with **Clerk**, not Supabase Auth.
-- For RLS to work per-user, connect Clerk as a Supabase *third-party auth*
-- provider (Supabase Dashboard → Authentication → Sign In / Providers →
-- Third-Party Auth → Clerk). Once connected, the Clerk session token is sent
-- to Supabase and the Clerk user id arrives as the JWT `sub` claim, which we
-- read with  (select auth.jwt() ->> 'sub').
--
-- The Next.js client must use a Supabase client initialised with the Clerk
-- token, e.g.:
--   createClient(URL, ANON_KEY, { accessToken: () => clerk.session?.getToken() })
--
-- Server routes that use the SERVICE ROLE key bypass RLS (by design) and must
-- enforce ownership in code — RLS below is the per-user guard for client access.
-- ============================================================================

-- ── Helper: keep updated_at fresh ───────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1) PROFILES  — one row per Clerk user; maps to the Shopify customer.
-- ============================================================================
create table if not exists public.profiles (
  clerk_user_id        text primary key,           -- Clerk user id (JWT `sub`)
  email                text,
  first_name           text,
  last_name            text,
  shopify_customer_id  text,                        -- Shopify Admin customer id
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- A user can only see/insert/update their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (clerk_user_id = (select auth.jwt() ->> 'sub'));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'))
  with check (clerk_user_id = (select auth.jwt() ->> 'sub'));
-- (No DELETE policy — profiles are not user-deletable. Service role can delete.)

-- ============================================================================
-- 2) WISHLIST_ITEMS — one row per (user, product).
-- ============================================================================
create table if not exists public.wishlist_items (
  id              uuid primary key default gen_random_uuid(),
  clerk_user_id   text not null,                    -- owner (JWT `sub`)
  product_id      text not null,                    -- Shopify product GID / id
  product_handle  text,                             -- for building the PDP link
  created_at      timestamptz not null default now(),
  unique (clerk_user_id, product_id)                -- no duplicate hearts
);

create index if not exists wishlist_items_user_idx
  on public.wishlist_items (clerk_user_id);

alter table public.wishlist_items enable row level security;

-- Full per-user CRUD scoped to the owner.
drop policy if exists "wishlist_select_own" on public.wishlist_items;
create policy "wishlist_select_own" on public.wishlist_items
  for select to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'));

drop policy if exists "wishlist_insert_own" on public.wishlist_items;
create policy "wishlist_insert_own" on public.wishlist_items
  for insert to authenticated
  with check (clerk_user_id = (select auth.jwt() ->> 'sub'));

drop policy if exists "wishlist_delete_own" on public.wishlist_items;
create policy "wishlist_delete_own" on public.wishlist_items
  for delete to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'));

-- ============================================================================
-- Notes
-- • anon role gets NO access (RLS denies by default once enabled).
-- • If you prefer a server-only design, skip Clerk↔Supabase JWT and do all
--   reads/writes from Next.js API routes with the service-role key; keep RLS
--   enabled (above) as defense-in-depth so a leaked anon key can't read data.
-- ============================================================================
