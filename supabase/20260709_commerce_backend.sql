-- ============================================================================
-- Rangat Pehnawa — Supabase commerce backend (replaces Medusa)
--
-- This is the source-of-truth catalog + order store the `supabaseCommerceAdapter`
-- reads/writes. It replaces Medusa's Store API. Security model:
--
--   • Catalog (products / variants / collections): PUBLIC read of *published*
--     rows, NO client write policies. The storefront shows prices; the client
--     can never mutate a price. Writes happen only through the admin API
--     (service role, Clerk-admin-gated in code).
--
--   • Orders / order_items: RLS on. Writes happen ONLY via the service-role
--     checkout flow (server recomputes the total from variant rows, ignoring any
--     client-sent price, and SNAPSHOTS it into the order at creation). A signed-in
--     buyer may READ their own orders (Clerk `sub` match) for /account/orders.
--
--   • Double-charge guard: unique(payment_transaction_id).
--
-- Prices are stored as whole-rupee integers (INR major units), matching the
-- storefront's rupee convention (getBaseSetPrice / normalizeAmount). The adapter
-- converts to paise (×100) only at the payment-reconciliation boundary.
--
-- Run in the Supabase SQL editor. Idempotent (safe to re-run).
-- ============================================================================

-- Shared updated_at trigger fn (defined here idempotently so this file can run
-- standalone; matches the existing set_updated_at used by other schemas).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Collections ─────────────────────────────────────────────────────────────
create table if not exists public.commerce_collections (
  id            uuid primary key default gen_random_uuid(),
  handle        text not null unique,
  title         text not null,
  image         text,
  description   text not null default '',
  rank          int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Products ────────────────────────────────────────────────────────────────
create table if not exists public.commerce_products (
  id                uuid primary key default gen_random_uuid(),
  handle            text not null unique,
  title             text not null,
  description       text not null default '',
  thumbnail         text,
  images            text[] not null default '{}',
  category          text not null default 'Kurtis',
  color_family      text not null default 'ivory',
  is_new            boolean not null default false,
  -- Only 'published' products are visible on the storefront (mirrors Medusa's
  -- published/draft gate). 'draft' lets admins stage a product before listing.
  status            text not null default 'draft'
                    check (status in ('draft', 'published')),
  collection_handle text references public.commerce_collections (handle)
                    on update cascade on delete set null,
  rank              int  not null default 0,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists commerce_products_published_idx
  on public.commerce_products (status) where status = 'published';
create index if not exists commerce_products_collection_idx
  on public.commerce_products (collection_handle)
  where collection_handle is not null;

-- ── Variants (one per size; carries the authoritative set price) ─────────────
-- A wholesale "set" = a size-ratio pack (S/M/L/XL, B2B_CONFIG.setSize). A product
-- that sells as a single set has one variant; sized products have one per size.
create table if not exists public.commerce_product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.commerce_products (id)
                      on delete cascade,
  size                text not null,          -- e.g. 'S/M/L/XL' or 'M'
  sku                 text,
  -- AUTHORITATIVE per-set price in whole rupees. The only place a price lives.
  set_price_inr       int  not null check (set_price_inr > 0),
  inventory_quantity  int  not null default 0,
  manage_inventory    boolean not null default false,  -- false = untracked/infinite
  allow_backorder     boolean not null default false,
  position            int  not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (product_id, size)
);

create index if not exists commerce_variants_product_idx
  on public.commerce_product_variants (product_id);

-- ── Orders (a 'draft' row also plays the cart role) ──────────────────────────
create table if not exists public.commerce_orders (
  id                     uuid primary key default gen_random_uuid(),
  display_number         bigint generated always as identity,
  clerk_user_id          text,               -- null for anonymous checkout
  status                 text not null default 'draft'
                         check (status in
                           ('draft','pending_payment','paid','cancelled','fulfilled')),
  source                 text not null default 'razorpay'
                         check (source in ('razorpay','phonepe','whatsapp')),
  buyer                  jsonb not null default '{}'::jsonb,
  currency               text not null default 'INR',
  -- Price snapshot, computed server-side at creation. total_inr is the single
  -- authoritative charged amount; it is NOT recomputed from live prices later.
  base_subtotal_inr      int  not null default 0,
  discount_percent       int  not null default 0,
  discount_amount_inr    int  not null default 0,
  total_inr              int  not null default 0 check (total_inr >= 0),
  total_sets             int  not null default 0,
  total_pieces           int  not null default 0,
  -- Payment reconciliation fields (written at completion).
  payment_provider       text check (payment_provider in ('razorpay','phonepe')),
  payment_transaction_id text,
  payment_order_id       text,
  payment_amount_paise   bigint,
  completed_at           timestamptz,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Double-charge guard: a given provider payment id can complete exactly one order.
create unique index if not exists commerce_orders_payment_txn_uniq
  on public.commerce_orders (payment_transaction_id)
  where payment_transaction_id is not null;
create index if not exists commerce_orders_user_idx
  on public.commerce_orders (clerk_user_id)
  where clerk_user_id is not null;
create index if not exists commerce_orders_status_idx
  on public.commerce_orders (status);

-- ── Order items (price snapshot per line) ────────────────────────────────────
create table if not exists public.commerce_order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.commerce_orders (id)
                 on delete cascade,
  product_id     text,
  variant_id     text,
  handle         text not null,
  title          text not null,
  size           text,
  color          text,
  style_code     text,
  quantity       int  not null check (quantity > 0),   -- sets
  unit_price_inr int  not null check (unit_price_inr > 0),  -- snapshot
  line_total_inr int  not null check (line_total_inr >= 0), -- snapshot
  pieces         int  not null default 0,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists commerce_order_items_order_idx
  on public.commerce_order_items (order_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
drop trigger if exists trg_commerce_collections_updated_at on public.commerce_collections;
create trigger trg_commerce_collections_updated_at
  before update on public.commerce_collections
  for each row execute function public.set_updated_at();

drop trigger if exists trg_commerce_products_updated_at on public.commerce_products;
create trigger trg_commerce_products_updated_at
  before update on public.commerce_products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_commerce_variants_updated_at on public.commerce_product_variants;
create trigger trg_commerce_variants_updated_at
  before update on public.commerce_product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_commerce_orders_updated_at on public.commerce_orders;
create trigger trg_commerce_orders_updated_at
  before update on public.commerce_orders
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

-- ── Catalog: public read of published, NO client writes ──────────────────────
alter table public.commerce_collections enable row level security;
drop policy if exists "collections_public_read" on public.commerce_collections;
create policy "collections_public_read" on public.commerce_collections
  for select to anon, authenticated using (true);

alter table public.commerce_products enable row level security;
drop policy if exists "products_public_read_published" on public.commerce_products;
create policy "products_public_read_published" on public.commerce_products
  for select to anon, authenticated using (status = 'published');

alter table public.commerce_product_variants enable row level security;
drop policy if exists "variants_public_read" on public.commerce_product_variants;
-- Variants of published products are readable; the price is public (shown on the
-- storefront) but never client-writable (no insert/update/delete policies).
create policy "variants_public_read" on public.commerce_product_variants
  for select to anon, authenticated
  using (exists (
    select 1 from public.commerce_products p
    where p.id = product_id and p.status = 'published'
  ));

-- NOTE: no insert/update/delete policies on any catalog table → only the
-- service role (admin API, Clerk-admin-gated in code) can write. This is the
-- price-tamper defence: the client physically cannot mutate set_price_inr.

-- ── Orders: service-role writes; buyer reads own ─────────────────────────────
alter table public.commerce_orders enable row level security;
drop policy if exists "orders_select_own" on public.commerce_orders;
create policy "orders_select_own" on public.commerce_orders
  for select to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'));
-- No client insert/update/delete: the checkout flow uses the service role, which
-- recomputes + snapshots the total server-side. Anonymous draft orders have a
-- null clerk_user_id and are therefore invisible to any client — intended;
-- they're only ever touched by the service-role checkout/payment path.

alter table public.commerce_order_items enable row level security;
drop policy if exists "order_items_select_own" on public.commerce_order_items;
create policy "order_items_select_own" on public.commerce_order_items
  for select to authenticated
  using (exists (
    select 1 from public.commerce_orders o
    where o.id = order_id
      and o.clerk_user_id = (select auth.jwt() ->> 'sub')
  ));
