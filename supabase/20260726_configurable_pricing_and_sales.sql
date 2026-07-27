-- ============================================================================
-- Rangat Pehnawa — configurable wholesale pricing + sale-aware checkout
--
-- Apply AFTER 20260726_admin_backoffice.sql (it adds the sale price columns
-- this file reads).
--
-- WHY THIS FILE EXISTS, AND WHY IT IS SEPARATE
--
-- It replaces public.create_commerce_checkout — the function that decides what
-- a buyer is charged. That is the most expensive thing in this codebase to get
-- wrong, so it lives in its own migration: reviewable on its own, revertible on
-- its own (re-run 20260710_commerce_lifecycle_atomic.sql to restore the previous
-- definition).
--
-- Two defects it fixes:
--
--   1. SALE PRICES WERE INVISIBLE TO CHECKOUT.
--      20260726_admin_backoffice.sql lets the owner put a style on sale
--      (sale_price_inr + a window on the product). The previous checkout priced
--      every line from set_price_inr, so a buyer would be SHOWN the sale price
--      and CHARGED the list price. Checkout now prices from the same effective
--      price helper the storefront uses.
--
--   2. THE DISCOUNT LADDER DISAGREED WITH THE STOREFRONT.
--      20260710_commerce_lifecycle_atomic.sql:225-229 hardcoded 5% at >=8 sets
--      and 10% at >=20 sets. src/lib/b2b/config.ts advertised a single flat 0%
--      tier. The database was authoritative, so buyers were quoted full price
--      and charged up to 10% less. The ladder now lives in a table that both
--      sides read, seeded with the DATABASE's values so applying this migration
--      changes nothing about what anyone is charged today. Change the ladder in
--      Admin Studio -> Pricing once you have decided which was intended.
--
-- Everything else in create_commerce_checkout — the idempotency contract, the
-- row locks, the reservation writes, the inventory decrements, the error codes —
-- is preserved exactly.
--
-- Idempotent: safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Pricing configuration (single row) + the volume ladder
--
-- Public-read: MOQ, set size and the tier ladder are printed on the line sheet
-- and quoted on every product page. They are not secrets, and letting the
-- storefront read them directly is what keeps the quoted price and the charged
-- price from drifting apart again.
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_pricing_config (
  -- Single-row table: the primary key can only ever hold `true`.
  id                 boolean primary key default true check (id),
  minimum_order_sets int  not null default 4 check (minimum_order_sets >= 1),
  set_size           int  not null default 4 check (set_size >= 1),
  size_ratio         text not null default 'S/M/L/XL',
  currency           text not null default 'INR',
  updated_at         timestamptz not null default now(),
  updated_by         text
);

insert into public.commerce_pricing_config (id) values (true)
on conflict (id) do nothing;

drop trigger if exists trg_commerce_pricing_config_updated_at
  on public.commerce_pricing_config;
create trigger trg_commerce_pricing_config_updated_at
  before update on public.commerce_pricing_config
  for each row execute function public.set_updated_at();

alter table public.commerce_pricing_config enable row level security;
drop policy if exists "pricing_config_public_read" on public.commerce_pricing_config;
create policy "pricing_config_public_read" on public.commerce_pricing_config
  for select to anon, authenticated using (true);

create table if not exists public.commerce_pricing_tiers (
  min_sets         int primary key check (min_sets >= 0),
  discount_percent int  not null default 0 check (discount_percent between 0 and 50),
  label            text not null default '',
  updated_at       timestamptz not null default now(),
  updated_by       text
);

drop trigger if exists trg_commerce_pricing_tiers_updated_at
  on public.commerce_pricing_tiers;
create trigger trg_commerce_pricing_tiers_updated_at
  before update on public.commerce_pricing_tiers
  for each row execute function public.set_updated_at();

alter table public.commerce_pricing_tiers enable row level security;
drop policy if exists "pricing_tiers_public_read" on public.commerce_pricing_tiers;
create policy "pricing_tiers_public_read" on public.commerce_pricing_tiers
  for select to anon, authenticated using (true);

-- Seed = the ladder the database was ALREADY charging, so this migration is a
-- behaviour-preserving refactor. `do nothing` means a re-run never overwrites
-- the owner's later edits.
insert into public.commerce_pricing_tiers (min_sets, discount_percent, label) values
  (0,  0,  'Wholesale'),
  (8,  5,  'Volume 8+ sets'),
  (20, 10, 'Volume 20+ sets')
on conflict (min_sets) do nothing;

-- ---------------------------------------------------------------------------
-- 1b. Atomic ladder replacement
--
-- Saving the ladder over PostgREST takes two calls — delete the tiers that are
-- gone, upsert the rest — and PostgREST gives no transaction across them. A
-- failure in between leaves the ladder missing a step, so a 20-set basket
-- silently falls back to the 8-set rate and the buyer is overcharged against the
-- owner's intent. Same reason the checkout total is computed in one function
-- rather than assembled by the application: money does not get a partial state.
--
-- This does both statements in one transaction, and validates the shape first so
-- a bad payload is rejected before anything is deleted.
-- ---------------------------------------------------------------------------

create or replace function public.admin_replace_pricing_tiers(
  p_tiers jsonb,
  p_actor text default null
)
returns table (min_sets integer, discount_percent integer, label text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_distinct integer;
begin
  if p_tiers is null or jsonb_typeof(p_tiers) <> 'array' then
    raise exception 'Tiers must be a list.' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_tiers);
  if v_count < 1 or v_count > 8 then
    raise exception 'Provide between 1 and 8 tiers.' using errcode = '22023';
  end if;

  select count(distinct (e ->> 'minSets')::int) into v_distinct
  from jsonb_array_elements(p_tiers) e;
  if v_distinct <> v_count then
    raise exception 'Two tiers cannot start at the same number of sets.'
      using errcode = '22023';
  end if;

  -- Without a tier at 0 there are baskets the ladder cannot price at all.
  if not exists (
    select 1 from jsonb_array_elements(p_tiers) e
    where (e ->> 'minSets')::int = 0
  ) then
    raise exception 'A tier starting at 0 sets is required.' using errcode = '22023';
  end if;

  delete from public.commerce_pricing_tiers
  where min_sets not in (
    select (e ->> 'minSets')::int from jsonb_array_elements(p_tiers) e
  );

  insert into public.commerce_pricing_tiers (min_sets, discount_percent, label, updated_by)
  select
    (e ->> 'minSets')::int,
    (e ->> 'discountPercent')::int,
    left(coalesce(e ->> 'label', ''), 60),
    p_actor
  from jsonb_array_elements(p_tiers) e
  on conflict (min_sets) do update
    set discount_percent = excluded.discount_percent,
        label            = excluded.label,
        updated_by       = excluded.updated_by,
        updated_at       = now();

  return query
    select t.min_sets, t.discount_percent, t.label
    from public.commerce_pricing_tiers t
    order by t.min_sets;
end;
$$;

revoke all on function public.admin_replace_pricing_tiers(jsonb, text)
  from public, anon, authenticated;
grant execute on function public.admin_replace_pricing_tiers(jsonb, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Shared price helpers
--
-- These are the single definition of "what does this set cost right now" and
-- "what volume discount applies". TypeScript mirrors them in
-- src/lib/commerce/pricing-rules.ts; both must agree, and both read the tables
-- above rather than a literal.
-- ---------------------------------------------------------------------------

-- Pure computation over its arguments — touches no table, so it is safe to
-- expose to every role.
create or replace function public.commerce_effective_set_price(
  p_set_price_inr  integer,
  p_sale_price_inr integer,
  p_sale_starts_at timestamptz,
  p_sale_ends_at   timestamptz
)
returns integer
language sql
stable
as $$
  select case
    when p_sale_price_inr is not null
     and p_sale_price_inr > 0
     and p_sale_price_inr < p_set_price_inr
     and (p_sale_starts_at is null or p_sale_starts_at <= now())
     and (p_sale_ends_at   is null or p_sale_ends_at   >  now())
    then p_sale_price_inr
    else p_set_price_inr
  end;
$$;

create or replace function public.commerce_discount_percent_for_sets(p_sets integer)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select t.discount_percent
      from public.commerce_pricing_tiers t
      where t.min_sets <= greatest(coalesce(p_sets, 0), 0)
      order by t.min_sets desc
      limit 1
    ),
    0
  );
$$;

grant execute on function
  public.commerce_effective_set_price(integer, integer, timestamptz, timestamptz)
  to anon, authenticated, service_role;
grant execute on function public.commerce_discount_percent_for_sets(integer)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. create_commerce_checkout — sale-aware and tier-configurable
--
-- Diff against 20260710_commerce_lifecycle_atomic.sql:103-276:
--   • reads minimum_order_sets / set_size / size_ratio from
--     commerce_pricing_config instead of the literals 4, 4, 'S/M/L/XL'
--   • selects v.sale_price_inr, p.sale_starts_at, p.sale_ends_at and prices
--     each line through commerce_effective_set_price()
--   • v_discount_percent comes from commerce_discount_percent_for_sets()
-- Nothing else changes: same signature, same locks, same idempotency
-- behaviour, same error codes, same reservation and decrement writes.
-- ---------------------------------------------------------------------------

create or replace function public.create_commerce_checkout(
  p_clerk_user_id text,
  p_buyer jsonb,
  p_lines jsonb,
  p_idempotency_key uuid,
  p_hold_minutes integer default 30
)
returns table (
  order_id uuid,
  display_number bigint,
  amount_paise bigint,
  currency text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_line record;
  v_variant record;
  v_order public.commerce_orders%rowtype;
  v_normalized_lines jsonb := '[]'::jsonb;
  v_fingerprint text := md5(coalesce(p_lines::text, ''));
  v_total_sets integer := 0;
  v_base_subtotal integer := 0;
  v_discount_percent integer := 0;
  v_discount_amount integer := 0;
  v_total_inr integer := 0;
  v_expires_at timestamptz;
  v_config public.commerce_pricing_config%rowtype;
  v_min_sets integer;
  v_set_size integer;
  v_unit_price integer;
begin
  if p_clerk_user_id is null or btrim(p_clerk_user_id) = '' then
    raise exception 'A signed-in buyer is required.' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'Checkout idempotency key is required.' using errcode = '22023';
  end if;
  if p_hold_minutes < 5 or p_hold_minutes > 30 then
    raise exception 'Checkout hold must be between 5 and 30 minutes.' using errcode = '22023';
  end if;

  -- Fall back to the historical literals if the config row is somehow missing,
  -- so a half-applied migration cannot make checkout unavailable.
  select * into v_config from public.commerce_pricing_config where id;
  v_min_sets := coalesce(v_config.minimum_order_sets, 4);
  v_set_size := coalesce(v_config.set_size, 4);

  select * into v_order
  from public.commerce_orders
  where checkout_idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_order.clerk_user_id <> p_clerk_user_id
       or v_order.checkout_fingerprint <> v_fingerprint
       or v_order.status not in ('draft', 'pending_payment') then
      raise exception 'Checkout idempotency key cannot be reused.' using errcode = '23505';
    end if;
    return query select
      v_order.id,
      v_order.display_number,
      v_order.total_inr * 100,
      v_order.currency,
      v_order.payment_attempt_expires_at;
    return;
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Cart is empty.' using errcode = '22023';
  end if;

  v_expires_at := now() + make_interval(mins => p_hold_minutes);

  for v_line in
    select
      (value ->> 'variant_id')::uuid as variant_id,
      sum((value ->> 'quantity')::integer)::integer as quantity,
      (jsonb_agg(coalesce(value -> 'metadata', '{}'::jsonb)) -> 0) as metadata
    from jsonb_array_elements(p_lines)
    group by (value ->> 'variant_id')
    order by (value ->> 'variant_id')::uuid
  loop
    if v_line.quantity is null or v_line.quantity < 1 then
      raise exception 'Line quantities must be positive.' using errcode = '22023';
    end if;

    select
      v.id, v.size, v.set_price_inr, v.sale_price_inr, v.inventory_quantity,
      v.manage_inventory, v.allow_backorder, p.id as product_id, p.handle,
      p.title, p.color_family, p.thumbnail, p.sale_starts_at, p.sale_ends_at
    into v_variant
    from public.commerce_product_variants v
    join public.commerce_products p on p.id = v.product_id
    where v.id = v_line.variant_id
      and v.archived_at is null
      and p.status = 'published'
      and p.deleted_at is null
    for update of v;

    if not found then
      raise exception 'A selected variant is unavailable.' using errcode = 'P0001';
    end if;
    if v_variant.manage_inventory
       and not v_variant.allow_backorder
       and v_variant.inventory_quantity < v_line.quantity then
      raise exception 'Insufficient inventory for %.', v_variant.handle using errcode = 'P0001';
    end if;

    -- The price the buyer was shown. Snapshotted into the order item below, so
    -- a sale ending mid-checkout never re-prices a placed order.
    v_unit_price := public.commerce_effective_set_price(
      v_variant.set_price_inr,
      v_variant.sale_price_inr,
      v_variant.sale_starts_at,
      v_variant.sale_ends_at
    );

    v_total_sets := v_total_sets + v_line.quantity;
    v_base_subtotal := v_base_subtotal + (v_unit_price * v_line.quantity);
    v_normalized_lines := v_normalized_lines || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id,
      'product_id', v_variant.product_id,
      'handle', v_variant.handle,
      'title', v_variant.title,
      'size', v_variant.size,
      'color', v_variant.color_family,
      'thumbnail', v_variant.thumbnail,
      'unit_price_inr', v_unit_price,
      'list_price_inr', v_variant.set_price_inr,
      'quantity', v_line.quantity,
      'metadata', v_line.metadata,
      'manage_inventory', v_variant.manage_inventory,
      'allow_backorder', v_variant.allow_backorder
    ));
  end loop;

  if v_total_sets < v_min_sets then
    raise exception 'Minimum order quantity is % sets.', v_min_sets using errcode = '22023';
  end if;

  v_discount_percent := public.commerce_discount_percent_for_sets(v_total_sets);
  v_total_inr := round(v_base_subtotal * (100 - v_discount_percent) / 100.0);
  v_discount_amount := v_base_subtotal - v_total_inr;

  insert into public.commerce_orders (
    clerk_user_id, status, source, buyer, currency,
    base_subtotal_inr, discount_percent, discount_amount_inr, total_inr,
    total_sets, total_pieces, metadata, checkout_idempotency_key,
    checkout_fingerprint, payment_attempt_expires_at
  ) values (
    p_clerk_user_id, 'draft', 'razorpay', coalesce(p_buyer, '{}'::jsonb), 'INR',
    v_base_subtotal, v_discount_percent, v_discount_amount, v_total_inr,
    v_total_sets, v_total_sets * v_set_size,
    jsonb_build_object('size_ratio', coalesce(v_config.size_ratio, 'S/M/L/XL')),
    p_idempotency_key, v_fingerprint, v_expires_at
  ) returning * into v_order;

  for v_line in
    select * from jsonb_to_recordset(v_normalized_lines) as x(
      variant_id uuid, product_id uuid, handle text, title text, size text, color text,
      thumbnail text, unit_price_inr integer, list_price_inr integer,
      quantity integer, metadata jsonb, manage_inventory boolean, allow_backorder boolean
    )
  loop
    insert into public.commerce_order_items (
      order_id, product_id, variant_id, handle, title, size, color, quantity,
      unit_price_inr, line_total_inr, pieces, metadata
    ) values (
      v_order.id, v_line.product_id, v_line.variant_id, v_line.handle, v_line.title,
      v_line.size, v_line.color, v_line.quantity, v_line.unit_price_inr,
      v_line.unit_price_inr * v_line.quantity, v_line.quantity * v_set_size,
      v_line.metadata
        || jsonb_build_object('image', v_line.thumbnail)
        -- Keep the list price on the line so an invoice can show "was / now".
        || case
             when v_line.list_price_inr > v_line.unit_price_inr
             then jsonb_build_object('list_price_inr', v_line.list_price_inr)
             else '{}'::jsonb
           end
    );
    if v_line.manage_inventory and not v_line.allow_backorder then
      -- Tell the stock ledger trigger why inventory moved.
      perform set_config('app.stock_reason', 'order_reserved', true);
      perform set_config('app.stock_order_id', v_order.id::text, true);
      update public.commerce_product_variants
      set inventory_quantity = inventory_quantity - v_line.quantity
      where id = v_line.variant_id;
      perform set_config('app.stock_reason', '', true);
      perform set_config('app.stock_order_id', '', true);
    end if;
    insert into public.commerce_inventory_reservations (
      order_id, variant_id, quantity, inventory_decremented, expires_at
    ) values (
      v_order.id, v_line.variant_id, v_line.quantity,
      v_line.manage_inventory and not v_line.allow_backorder, v_expires_at
    );
  end loop;

  return query select v_order.id, v_order.display_number, v_total_inr * 100, 'INR'::text, v_expires_at;
end;
$$;

revoke all on function
  public.create_commerce_checkout(text, jsonb, jsonb, uuid, integer)
  from public, anon, authenticated;
grant execute on function
  public.create_commerce_checkout(text, jsonb, jsonb, uuid, integer)
  to service_role;

commit;

-- ============================================================================
-- VERIFY AFTER APPLYING (run these; they should all pass)
--
--   -- 1. The ladder matches what the database charged before this migration.
--   select public.commerce_discount_percent_for_sets(4)  = 0  as tier_4_ok,
--          public.commerce_discount_percent_for_sets(8)  = 5  as tier_8_ok,
--          public.commerce_discount_percent_for_sets(20) = 10 as tier_20_ok;
--
--   -- 2. A sale price inside its window wins; outside it, the list price wins.
--   select public.commerce_effective_set_price(1290, 990, null, null) = 990 as sale_on,
--          public.commerce_effective_set_price(1290, 990, null,
--            now() - interval '1 day') = 1290 as sale_expired,
--          public.commerce_effective_set_price(1290, null, null, null) = 1290 as no_sale;
--
--   -- 3. Config row exists.
--   select count(*) = 1 as config_ok from public.commerce_pricing_config;
-- ============================================================================
