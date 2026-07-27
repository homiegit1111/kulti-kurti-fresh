-- ============================================================================
-- Rangat Pehnawa — Admin back-office (content, media, offers, stock, roles)
--
-- Apply AFTER:
--   20260709_commerce_backend.sql
--   20260709_payment_ledgers_generalize.sql
--   20260710_admin_catalog_safety.sql
--   20260710_commerce_lifecycle_atomic.sql
--
-- What this adds, and the security posture of each piece:
--
--   • site_content / site_content_drafts / site_content_revisions
--       The storefront copy, images and video paths the owner edits. Published
--       values are PUBLIC-READ (they are literally on the website). Drafts are
--       service-role only, so unpublished work can never be scraped. Every
--       publish writes an immutable revision row → one-click revert.
--
--   • media_assets
--       Registry for the media library. Rows are PUBLIC-READ once 'ready' (the
--       storefront needs alt text and dimensions); writes are service-role only.
--       Large files never pass through the Worker: the admin mints a short-lived
--       signed upload URL and the browser PUTs straight to Supabase Storage.
--
--   • commerce_promotions / commerce_promotion_redemptions
--       Offers and sales. Only AUTOMATIC promotions (code is null) are
--       public-read, so secret coupon codes are never enumerable by the browser.
--       Coded promotions are validated server-side. Redemption limits are
--       enforced by an atomic RPC, not by an application read-then-write.
--
--   • commerce_inventory_movements + a trigger on commerce_product_variants
--       An append-only stock ledger. The trigger means NOTHING can change
--       inventory_quantity without leaving a row — admin edits, checkout
--       reservations, releases, or a human running UPDATE in the SQL editor.
--
--   • admin_users
--       Database-backed roles (owner / manager / staff). ADMIN_CLERK_USER_IDS in
--       env stays the break-glass owner list so the owner can never be locked
--       out of their own store by a bad row.
--
--   • admin_rate_limit_hits + rate_limit_hit()
--       Durable, cross-isolate rate limiting. The in-process limiter is
--       per-Worker-isolate and therefore near-useless as a real control on
--       Cloudflare; this one shares state in Postgres.
--
-- Idempotent: safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Shared helper (defined idempotently so this file can run standalone).
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Admin roles
--
-- The env allowlist (ADMIN_CLERK_USER_IDS) is the break-glass OWNER list and is
-- checked first in application code. This table adds delegated, revocable
-- access with per-role permissions, so the owner can give a staff member stock
-- access without handing over payouts or the ability to add other admins.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  clerk_user_id text primary key,
  email         text,
  display_name  text not null default '',
  role          text not null default 'staff'
                check (role in ('owner', 'manager', 'staff')),
  is_active     boolean not null default true,
  note          text not null default '',
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

create index if not exists admin_users_active_idx
  on public.admin_users (is_active) where is_active;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant all on public.admin_users to service_role;

-- ---------------------------------------------------------------------------
-- 2. Site content (the CMS)
--
-- One row per registry key, e.g. 'home.cover.headline'. `value` holds raw JSON
-- (a string, number, boolean, array or object) whose SHAPE is validated in the
-- application against src/lib/content/registry.ts. The database deliberately
-- does not encode the shape: adding an editable field must never need a
-- migration.
-- ---------------------------------------------------------------------------

create table if not exists public.site_content (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

drop trigger if exists trg_site_content_updated_at on public.site_content;
create trigger trg_site_content_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

-- Published content is public by definition — it is the website. Public read
-- lets the storefront use the ANON key on its hot path, so no request that
-- merely renders a page needs service-role powers.
alter table public.site_content enable row level security;
drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read" on public.site_content
  for select to anon, authenticated using (true);
-- No insert/update/delete policies → only the admin API (service role) writes.

-- Staged edits. NOT public-read: unpublished copy, prices in banners, and
-- upcoming campaign wording must not leak before launch.
create table if not exists public.site_content_drafts (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

drop trigger if exists trg_site_content_drafts_updated_at on public.site_content_drafts;
create trigger trg_site_content_drafts_updated_at
  before update on public.site_content_drafts
  for each row execute function public.set_updated_at();

alter table public.site_content_drafts enable row level security;
revoke all on public.site_content_drafts from anon, authenticated;
grant all on public.site_content_drafts to service_role;

-- Append-only history. `previous_value` is what the publish replaced, which is
-- exactly what a revert needs.
create table if not exists public.site_content_revisions (
  id                  bigint generated always as identity primary key,
  key                 text not null,
  value               jsonb,
  previous_value      jsonb,
  actor_clerk_user_id text,
  created_at          timestamptz not null default now()
);

create index if not exists site_content_revisions_key_idx
  on public.site_content_revisions (key, created_at desc);
create index if not exists site_content_revisions_recent_idx
  on public.site_content_revisions (created_at desc);

alter table public.site_content_revisions enable row level security;
revoke all on public.site_content_revisions from anon, authenticated;
grant all on public.site_content_revisions to service_role;

-- ---------------------------------------------------------------------------
-- 3. Media library
--
-- `path` is the object key inside `bucket`. `url` is denormalised for read
-- speed; it is always derivable from bucket+path, so a bucket rename is a
-- backfill, not a data loss.
-- ---------------------------------------------------------------------------

create table if not exists public.media_assets (
  id               uuid primary key default gen_random_uuid(),
  bucket           text not null default 'site-media',
  path             text not null,
  url              text not null,
  kind             text not null check (kind in ('image', 'video')),
  mime_type        text not null default '',
  bytes            bigint not null default 0 check (bytes >= 0),
  width            int,
  height           int,
  duration_seconds numeric(9, 2),
  alt_text         text not null default '',
  title            text not null default '',
  folder           text not null default 'general',
  tags             text[] not null default '{}',
  -- 'pending' = a signed upload URL was issued but the object was never
  -- confirmed. Pending rows are invisible to the storefront and are swept.
  status           text not null default 'pending'
                   check (status in ('pending', 'ready')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (bucket, path)
);

create index if not exists media_assets_ready_idx
  on public.media_assets (kind, created_at desc) where status = 'ready';
create index if not exists media_assets_folder_idx
  on public.media_assets (folder) where status = 'ready';
create index if not exists media_assets_pending_idx
  on public.media_assets (created_at) where status = 'pending';

drop trigger if exists trg_media_assets_updated_at on public.media_assets;
create trigger trg_media_assets_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;
drop policy if exists "media_assets_public_read_ready" on public.media_assets;
create policy "media_assets_public_read_ready" on public.media_assets
  for select to anon, authenticated using (status = 'ready');
-- No client writes: a browser cannot register an asset it did not upload
-- through the admin API.

-- ---------------------------------------------------------------------------
-- 4. Offers / sales
--
-- Two independent mechanisms, deliberately:
--   • A per-variant sale price (section 5) is the "this style is on sale" case.
--   • A promotion here is the "10% off orders over 6 sets this week" case, and
--     is applied to the ORDER at checkout by server-side code.
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_promotions (
  id            uuid primary key default gen_random_uuid(),
  -- null code = automatic (applies with no coupon). Stored uppercase; the
  -- unique index below is on the normalised form.
  code          text,
  title         text not null,
  description   text not null default '',
  kind          text not null check (kind in ('percent', 'flat_inr', 'free_shipping')),
  value_percent int check (value_percent between 1 and 90),
  value_inr     int check (value_inr > 0),

  -- Eligibility
  scope         text not null default 'all'
                check (scope in ('all', 'collection', 'product')),
  scope_handles text[] not null default '{}',
  min_sets      int not null default 0 check (min_sets >= 0),
  min_subtotal_inr int not null default 0 check (min_subtotal_inr >= 0),

  -- Scheduling. Null start = live immediately; null end = no expiry.
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean not null default false,

  -- Limits
  max_redemptions           int check (max_redemptions > 0),
  max_redemptions_per_buyer int check (max_redemptions_per_buyer > 0),
  redemption_count          int not null default 0 check (redemption_count >= 0),

  -- Storefront presentation
  badge_label   text not null default '',
  priority      int not null default 0,

  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A percent promo must carry a percent and nothing else, and so on. This is
  -- the constraint that stops "50% off" being saved as "₹50 off" by a UI bug.
  constraint commerce_promotions_value_shape check (
    (kind = 'percent'       and value_percent is not null and value_inr is null) or
    (kind = 'flat_inr'      and value_inr is not null     and value_percent is null) or
    (kind = 'free_shipping' and value_percent is null     and value_inr is null)
  ),
  constraint commerce_promotions_window check (
    starts_at is null or ends_at is null or ends_at > starts_at
  ),
  constraint commerce_promotions_scope_shape check (
    scope = 'all' or cardinality(scope_handles) > 0
  )
);

create unique index if not exists commerce_promotions_code_uniq
  on public.commerce_promotions (upper(code)) where code is not null;
create index if not exists commerce_promotions_live_idx
  on public.commerce_promotions (priority desc, created_at desc)
  where is_active;

drop trigger if exists trg_commerce_promotions_updated_at on public.commerce_promotions;
create trigger trg_commerce_promotions_updated_at
  before update on public.commerce_promotions
  for each row execute function public.set_updated_at();

alter table public.commerce_promotions enable row level security;
drop policy if exists "promotions_public_read_automatic" on public.commerce_promotions;
-- ONLY automatic, currently-live promotions are readable by the browser. A
-- coupon code is a secret: making every row public-read would let anyone list
-- every unreleased discount code in the store.
create policy "promotions_public_read_automatic" on public.commerce_promotions
  for select to anon, authenticated
  using (
    code is null
    and is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  );

create table if not exists public.commerce_promotion_redemptions (
  id                  uuid primary key default gen_random_uuid(),
  promotion_id        uuid not null references public.commerce_promotions (id)
                      on delete cascade,
  order_id            uuid references public.commerce_orders (id) on delete set null,
  clerk_user_id       text,
  buyer_email         text,
  discount_amount_inr int not null default 0 check (discount_amount_inr >= 0),
  created_at          timestamptz not null default now()
);

-- One redemption per promotion per order: replaying a checkout cannot burn the
-- allowance twice, and cannot discount the same order twice.
create unique index if not exists commerce_promotion_redemptions_order_uniq
  on public.commerce_promotion_redemptions (promotion_id, order_id)
  where order_id is not null;
create index if not exists commerce_promotion_redemptions_promo_idx
  on public.commerce_promotion_redemptions (promotion_id, created_at desc);
create index if not exists commerce_promotion_redemptions_buyer_idx
  on public.commerce_promotion_redemptions (promotion_id, lower(buyer_email))
  where buyer_email is not null;

alter table public.commerce_promotion_redemptions enable row level security;
revoke all on public.commerce_promotion_redemptions from anon, authenticated;
grant all on public.commerce_promotion_redemptions to service_role;

-- ---------------------------------------------------------------------------
-- 5. Sale pricing + low-stock threshold on the existing catalog tables
--
-- set_price_inr remains the authoritative list price. sale_price_inr, when set
-- and within the product's sale window, is what the buyer pays. Keeping both
-- means "was ₹1,290, now ₹990" is data, not a hand-typed string.
-- ---------------------------------------------------------------------------

alter table public.commerce_product_variants
  add column if not exists sale_price_inr int;
alter table public.commerce_product_variants
  add column if not exists low_stock_threshold int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.commerce_product_variants'::regclass
      and conname = 'commerce_variants_sale_price_valid'
  ) then
    alter table public.commerce_product_variants
      add constraint commerce_variants_sale_price_valid
      check (sale_price_inr is null
             or (sale_price_inr > 0 and sale_price_inr < set_price_inr));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.commerce_product_variants'::regclass
      and conname = 'commerce_variants_low_stock_nonnegative'
  ) then
    alter table public.commerce_product_variants
      add constraint commerce_variants_low_stock_nonnegative
      check (low_stock_threshold >= 0);
  end if;
end;
$$;

alter table public.commerce_products
  add column if not exists sale_starts_at timestamptz;
alter table public.commerce_products
  add column if not exists sale_ends_at timestamptz;
alter table public.commerce_products
  add column if not exists badge_label text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.commerce_products'::regclass
      and conname = 'commerce_products_sale_window'
  ) then
    alter table public.commerce_products
      add constraint commerce_products_sale_window
      check (sale_starts_at is null or sale_ends_at is null
             or sale_ends_at > sale_starts_at);
  end if;
end;
$$;

-- Editorial copy for a collection page, so "collection text" is data too.
alter table public.commerce_collections
  add column if not exists subtitle text not null default '';
alter table public.commerce_collections
  add column if not exists body text not null default '';
alter table public.commerce_collections
  add column if not exists status text not null default 'published';
alter table public.commerce_collections
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.commerce_collections'::regclass
      and conname = 'commerce_collections_status_valid'
  ) then
    alter table public.commerce_collections
      add constraint commerce_collections_status_valid
      check (status in ('draft', 'published'));
  end if;
end;
$$;

-- Draft collections must not appear on the storefront.
drop policy if exists "collections_public_read" on public.commerce_collections;
create policy "collections_public_read" on public.commerce_collections
  for select to anon, authenticated using (status = 'published');

-- ---------------------------------------------------------------------------
-- 6. Stock ledger
--
-- Append-only. Written by a trigger on the variant row, NOT by application
-- code, so there is no code path — admin, checkout, cron, or a human in the
-- SQL editor — that can move stock silently.
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_inventory_movements (
  id                  bigint generated always as identity primary key,
  variant_id          uuid not null references public.commerce_product_variants (id)
                      on delete cascade,
  delta               int not null,
  quantity_after      int not null,
  reason              text not null default 'system',
  note                text not null default '',
  order_id            uuid references public.commerce_orders (id) on delete set null,
  actor_clerk_user_id text,
  created_at          timestamptz not null default now()
);

create index if not exists commerce_inventory_movements_variant_idx
  on public.commerce_inventory_movements (variant_id, created_at desc);
create index if not exists commerce_inventory_movements_recent_idx
  on public.commerce_inventory_movements (created_at desc);

alter table public.commerce_inventory_movements enable row level security;
revoke all on public.commerce_inventory_movements from anon, authenticated;
grant all on public.commerce_inventory_movements to service_role;

-- Callers announce intent with set_config('app.stock_reason', ...) inside their
-- transaction. An unrecognised reason is coerced to 'system' rather than
-- raising: an audit row must never be the thing that fails a paid checkout.
create or replace function public.log_variant_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reason text;
  v_actor  text;
  v_note   text;
  v_order  uuid;
begin
  if new.inventory_quantity is not distinct from old.inventory_quantity then
    return new;
  end if;

  v_reason := coalesce(nullif(current_setting('app.stock_reason', true), ''), 'system');
  if v_reason not in (
    'system', 'manual_adjust', 'manual_set', 'restock', 'bulk_import',
    'order_reserved', 'order_released', 'correction'
  ) then
    v_reason := 'system';
  end if;

  v_actor := nullif(current_setting('app.stock_actor', true), '');
  v_note  := coalesce(nullif(current_setting('app.stock_note', true), ''), '');
  begin
    v_order := nullif(current_setting('app.stock_order_id', true), '')::uuid;
  exception when others then
    v_order := null;
  end;

  insert into public.commerce_inventory_movements (
    variant_id, delta, quantity_after, reason, note, order_id, actor_clerk_user_id
  ) values (
    new.id,
    new.inventory_quantity - old.inventory_quantity,
    new.inventory_quantity,
    v_reason,
    left(v_note, 500),
    v_order,
    v_actor
  );

  return new;
end;
$$;

drop trigger if exists trg_commerce_variants_stock_ledger
  on public.commerce_product_variants;
create trigger trg_commerce_variants_stock_ledger
  after update of inventory_quantity on public.commerce_product_variants
  for each row execute function public.log_variant_inventory_movement();

-- Atomic stock change. Locks the variant row, so two admins editing the same
-- style at once cannot lose one another's change (which a read-modify-write
-- through the REST API absolutely would).
--
-- p_mode: 'delta'  → add p_amount (clamped at zero)
--         'absolute' → set to p_amount
create or replace function public.admin_set_variant_inventory(
  p_variant_id uuid,
  p_amount     integer,
  p_mode       text,
  p_reason     text,
  p_note       text default '',
  p_actor      text default null
)
returns table (variant_id uuid, quantity_before integer, quantity_after integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before integer;
  v_target integer;
begin
  if p_mode not in ('delta', 'absolute') then
    raise exception 'Mode must be delta or absolute.' using errcode = '22023';
  end if;
  if p_amount is null then
    raise exception 'Amount is required.' using errcode = '22023';
  end if;

  select v.inventory_quantity into v_before
  from public.commerce_product_variants v
  where v.id = p_variant_id
  for update;

  if not found then
    raise exception 'Variant not found.' using errcode = 'P0001';
  end if;

  v_target := case
    when p_mode = 'delta' then greatest(v_before + p_amount, 0)
    else greatest(p_amount, 0)
  end;

  perform set_config('app.stock_reason', coalesce(p_reason, 'manual_adjust'), true);
  perform set_config('app.stock_actor',  coalesce(p_actor, ''), true);
  perform set_config('app.stock_note',   coalesce(p_note, ''), true);

  if v_target <> v_before then
    update public.commerce_product_variants
       set inventory_quantity = v_target
     where id = p_variant_id;
  end if;

  -- Leave no reason bleeding into a later statement on this connection.
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_actor', '', true);
  perform set_config('app.stock_note', '', true);

  return query select p_variant_id, v_before, v_target;
end;
$$;

revoke all on function
  public.admin_set_variant_inventory(uuid, integer, text, text, text, text)
  from public, anon, authenticated;
grant execute on function
  public.admin_set_variant_inventory(uuid, integer, text, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 7. Atomic promotion redemption
--
-- Enforces max_redemptions and max_redemptions_per_buyer under a row lock. An
-- application-level "count then insert" would over-issue a limited offer the
-- moment two buyers check out in the same second.
-- ---------------------------------------------------------------------------

create or replace function public.claim_promotion_redemption(
  p_promotion_id uuid,
  p_order_id     uuid,
  p_clerk_user_id text,
  p_buyer_email  text,
  p_discount_amount_inr integer
)
returns table (redemption_id uuid, already_claimed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_promo  record;
  v_existing uuid;
  v_buyer_used integer;
  v_new_id uuid;
begin
  select id, is_active, starts_at, ends_at,
         max_redemptions, max_redemptions_per_buyer, redemption_count
    into v_promo
  from public.commerce_promotions
  where id = p_promotion_id
  for update;

  if not found then
    raise exception 'Promotion not found.' using errcode = 'P0001';
  end if;

  -- Idempotent replay for the same order.
  if p_order_id is not null then
    select id into v_existing
    from public.commerce_promotion_redemptions
    where promotion_id = p_promotion_id and order_id = p_order_id;
    if found then
      return query select v_existing, true;
      return;
    end if;
  end if;

  if not v_promo.is_active then
    raise exception 'Promotion is not active.' using errcode = 'P0001';
  end if;
  if v_promo.starts_at is not null and v_promo.starts_at > now() then
    raise exception 'Promotion has not started.' using errcode = 'P0001';
  end if;
  if v_promo.ends_at is not null and v_promo.ends_at <= now() then
    raise exception 'Promotion has expired.' using errcode = 'P0001';
  end if;
  if v_promo.max_redemptions is not null
     and v_promo.redemption_count >= v_promo.max_redemptions then
    raise exception 'Promotion is fully redeemed.' using errcode = 'P0001';
  end if;

  if v_promo.max_redemptions_per_buyer is not null
     and coalesce(p_buyer_email, '') <> '' then
    select count(*) into v_buyer_used
    from public.commerce_promotion_redemptions
    where promotion_id = p_promotion_id
      and lower(buyer_email) = lower(p_buyer_email);
    if v_buyer_used >= v_promo.max_redemptions_per_buyer then
      raise exception 'Promotion limit reached for this buyer.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.commerce_promotion_redemptions (
    promotion_id, order_id, clerk_user_id, buyer_email, discount_amount_inr
  ) values (
    p_promotion_id, p_order_id, p_clerk_user_id, p_buyer_email,
    greatest(coalesce(p_discount_amount_inr, 0), 0)
  ) returning id into v_new_id;

  update public.commerce_promotions
     set redemption_count = redemption_count + 1
   where id = p_promotion_id;

  return query select v_new_id, false;
end;
$$;

revoke all on function
  public.claim_promotion_redemption(uuid, uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function
  public.claim_promotion_redemption(uuid, uuid, text, text, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 8. Durable rate limiting
--
-- The in-process limiter in src/lib/server/rate-limit.ts lives in one Worker
-- isolate's memory. Cloudflare runs many isolates and recycles them freely, so
-- as a control on credential-adjacent endpoints it is decorative. This shares
-- the counter in Postgres instead.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_rate_limit_hits (
  bucket       text not null,
  identity     text not null,
  window_start timestamptz not null,
  hits         int not null default 0,
  primary key (bucket, identity, window_start)
);

create index if not exists admin_rate_limit_sweep_idx
  on public.admin_rate_limit_hits (window_start);

alter table public.admin_rate_limit_hits enable row level security;
revoke all on public.admin_rate_limit_hits from anon, authenticated;
grant all on public.admin_rate_limit_hits to service_role;

create or replace function public.rate_limit_hit(
  p_bucket   text,
  p_identity text,
  p_limit    integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_limit is null or p_limit <= 0 or p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'Limit and window must be positive.' using errcode = '22023';
  end if;

  -- Fixed window, floored to the window size so every isolate agrees on the
  -- bucket boundary without coordinating.
  v_window_start := to_timestamp(
    (floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)::double precision
  );

  insert into public.admin_rate_limit_hits as rl (bucket, identity, window_start, hits)
  values (p_bucket, left(p_identity, 200), v_window_start, 1)
  on conflict (bucket, identity, window_start)
    do update set hits = rl.hits + 1
  returning rl.hits into v_hits;

  return query select
    v_hits <= p_limit,
    greatest(p_limit - v_hits, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.rate_limit_hit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, integer, integer)
  to service_role;

-- Housekeeping for the daily cron.
create or replace function public.sweep_admin_maintenance()
returns table (rate_limit_rows_deleted integer, pending_media_deleted integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rl integer := 0;
  v_media integer := 0;
begin
  delete from public.admin_rate_limit_hits
  where window_start < now() - interval '1 day';
  get diagnostics v_rl = row_count;

  -- A signed upload URL is short-lived; anything still 'pending' after an hour
  -- was abandoned.
  delete from public.media_assets
  where status = 'pending' and created_at < now() - interval '1 hour';
  get diagnostics v_media = row_count;

  return query select v_rl, v_media;
end;
$$;

revoke all on function public.sweep_admin_maintenance()
  from public, anon, authenticated;
grant execute on function public.sweep_admin_maintenance() to service_role;

-- ---------------------------------------------------------------------------
-- 9. Widen the audit log so it can record more than products and orders.
-- ---------------------------------------------------------------------------

alter table public.commerce_admin_audit_log
  drop constraint if exists commerce_admin_audit_log_entity_type_check;
alter table public.commerce_admin_audit_log
  add constraint commerce_admin_audit_log_entity_type_check
  check (entity_type in (
    'product', 'variant', 'order', 'collection', 'content', 'media',
    'promotion', 'admin_user', 'settings', 'stock'
  ));

alter table public.commerce_admin_audit_log
  add column if not exists ip_hash text;
alter table public.commerce_admin_audit_log
  add column if not exists user_agent text;

-- ---------------------------------------------------------------------------
-- 10. Storage buckets
--
-- Configured here rather than by clicking in the dashboard, so a fresh project
-- is reproducible. allowed_mime_types is a server-side guard that holds even if
-- an upload path is ever called with a wrong content type; the admin API also
-- sniffs magic bytes for images.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = greatest(excluded.file_size_limit,
                                 coalesce(storage.buckets.file_size_limit, 0)),
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media', 'site-media', true, 104857600,  -- 100 MB, for hero video
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public = true,
      file_size_limit = greatest(excluded.file_size_limit,
                                 coalesce(storage.buckets.file_size_limit, 0)),
      allowed_mime_types = excluded.allowed_mime_types;

commit;

-- ============================================================================
-- Post-migration: seed yourself as owner (replace the Clerk user id).
--
--   insert into public.admin_users (clerk_user_id, role, display_name, is_active)
--   values ('user_xxxxxxxxxxxxxxxx', 'owner', 'Store owner', true)
--   on conflict (clerk_user_id) do update
--     set role = 'owner', is_active = true;
--
-- This is optional: any id in ADMIN_CLERK_USER_IDS is already treated as owner.
-- ============================================================================
