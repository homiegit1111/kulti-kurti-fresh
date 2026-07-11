-- ============================================================================
-- Rangat Pehnawa — admin/catalog safety follow-up
--
-- Apply after 20260709_commerce_backend.sql. This migration is intentionally
-- independent of payment routes: it prepares audit and inventory primitives
-- for trusted server callers without changing payment tables or handlers.
-- Re-running it is safe.
-- ============================================================================

begin;

-- A deleted product stays queryable for historical reporting, but is never
-- eligible for storefront reads or new inventory reservations.
alter table public.commerce_products
  add column if not exists deleted_at timestamptz;

create index if not exists commerce_products_active_idx
  on public.commerce_products (status, rank)
  where deleted_at is null;

-- Order items keep product_id as a historical text snapshot. This index makes
-- future reference checks cheap without introducing a destructive FK.
create index if not exists commerce_order_items_product_ref_idx
  on public.commerce_order_items (product_id)
  where product_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.commerce_product_variants'::regclass
      and conname = 'commerce_variants_inventory_nonnegative'
  ) then
    alter table public.commerce_product_variants
      add constraint commerce_variants_inventory_nonnegative
      check (inventory_quantity >= 0) not valid;
  end if;
end;
$$;

-- Validate existing data rather than silently rewriting stock values.
alter table public.commerce_product_variants
  validate constraint commerce_variants_inventory_nonnegative;

-- --------------------------------------------------------------------------
-- Admin audit trail
-- --------------------------------------------------------------------------

create table if not exists public.commerce_admin_audit_log (
  id                   uuid primary key default gen_random_uuid(),
  actor_clerk_user_id  text not null,
  action               text not null,
  entity_type          text not null check (entity_type in ('product', 'order')),
  entity_id            text not null,
  before_state         jsonb not null default '{}'::jsonb,
  after_state          jsonb not null default '{}'::jsonb,
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

create index if not exists commerce_admin_audit_entity_idx
  on public.commerce_admin_audit_log (entity_type, entity_id, created_at desc);
create index if not exists commerce_admin_audit_actor_idx
  on public.commerce_admin_audit_log (actor_clerk_user_id, created_at desc);

alter table public.commerce_admin_audit_log enable row level security;
revoke all on public.commerce_admin_audit_log from anon, authenticated;
grant all on public.commerce_admin_audit_log to service_role;

-- --------------------------------------------------------------------------
-- Inventory reservations
-- --------------------------------------------------------------------------

create table if not exists public.commerce_inventory_reservations (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.commerce_orders(id)
                        on delete restrict,
  variant_id            uuid not null references public.commerce_product_variants(id)
                        on delete restrict,
  quantity              int not null check (quantity > 0),
  inventory_decremented boolean not null default false,
  status                text not null default 'reserved'
                        check (status in ('reserved', 'released', 'consumed')),
  expires_at            timestamptz,
  released_at           timestamptz,
  consumed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists commerce_inventory_active_uniq
  on public.commerce_inventory_reservations (order_id, variant_id)
  where status = 'reserved';
create index if not exists commerce_inventory_order_idx
  on public.commerce_inventory_reservations (order_id, status);
create index if not exists commerce_inventory_expiry_idx
  on public.commerce_inventory_reservations (expires_at)
  where status = 'reserved' and expires_at is not null;

drop trigger if exists trg_commerce_inventory_reservations_updated_at
  on public.commerce_inventory_reservations;
create trigger trg_commerce_inventory_reservations_updated_at
  before update on public.commerce_inventory_reservations
  for each row execute function public.set_updated_at();

alter table public.commerce_inventory_reservations enable row level security;
revoke all on public.commerce_inventory_reservations from anon, authenticated;
grant all on public.commerce_inventory_reservations to service_role;

-- The public client cannot call these functions. They are reserved for the
-- service-role checkout/ops layer when that layer adopts inventory reservations.
create or replace function public.reserve_commerce_inventory(
  p_order_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_variant record;
  v_existing_id uuid;
  v_existing_quantity integer;
  v_reservation_id uuid;
  v_decremented boolean := false;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Reservation quantity must be positive.' using errcode = '22023';
  end if;

  -- Lock the authoritative row before checking/decrementing stock.
  select v.id, v.inventory_quantity, v.manage_inventory, v.allow_backorder
    into v_variant
  from public.commerce_product_variants v
  join public.commerce_products p on p.id = v.product_id
  where v.id = p_variant_id
    and p.status = 'published'
    and p.deleted_at is null
  for update of v;

  if not found then
    raise exception 'Variant is not available for reservation.' using errcode = 'P0001';
  end if;

  -- Idempotent retry for the same order/variant while the reservation remains active.
  select id, quantity into v_existing_id, v_existing_quantity
  from public.commerce_inventory_reservations
  where order_id = p_order_id
    and variant_id = p_variant_id
    and status = 'reserved'
  for update;
  if found then
    if v_existing_quantity <> p_quantity then
      raise exception 'Active reservation quantity does not match retry.' using errcode = 'P0001';
    end if;
    return v_existing_id;
  end if;

  if v_variant.manage_inventory and not v_variant.allow_backorder then
    if v_variant.inventory_quantity < p_quantity then
      raise exception 'Insufficient inventory.' using errcode = 'P0001';
    end if;
    update public.commerce_product_variants
       set inventory_quantity = inventory_quantity - p_quantity
     where id = p_variant_id;
    v_decremented := true;
  end if;

  insert into public.commerce_inventory_reservations (
    order_id, variant_id, quantity, inventory_decremented, expires_at
  ) values (
    p_order_id, p_variant_id, p_quantity, v_decremented, p_expires_at
  ) returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

create or replace function public.release_commerce_inventory(
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation record;
begin
  select variant_id, quantity, inventory_decremented
    into v_reservation
  from public.commerce_inventory_reservations
  where id = p_reservation_id and status = 'reserved'
  for update;

  if not found then
    return false;
  end if;

  update public.commerce_inventory_reservations
     set status = 'released', released_at = now()
   where id = p_reservation_id;

  if v_reservation.inventory_decremented then
    update public.commerce_product_variants
       set inventory_quantity = inventory_quantity + v_reservation.quantity
     where id = v_reservation.variant_id;
  end if;

  return true;
end;
$$;

create or replace function public.consume_commerce_inventory(
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.commerce_inventory_reservations
     set status = 'consumed', consumed_at = now()
   where id = p_reservation_id and status = 'reserved';
  return found;
end;
$$;

revoke all on function public.reserve_commerce_inventory(uuid, uuid, integer, timestamptz)
  from public, anon, authenticated;
revoke all on function public.release_commerce_inventory(uuid)
  from public, anon, authenticated;
revoke all on function public.consume_commerce_inventory(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_commerce_inventory(uuid, uuid, integer, timestamptz)
  to service_role;
grant execute on function public.release_commerce_inventory(uuid)
  to service_role;
grant execute on function public.consume_commerce_inventory(uuid)
  to service_role;

create or replace function public.release_expired_commerce_inventory()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation_id uuid;
  v_released_count integer := 0;
begin
  loop
    select id into v_reservation_id
    from public.commerce_inventory_reservations
    where status = 'reserved'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at
    for update skip locked
    limit 1;

    exit when not found;
    if public.release_commerce_inventory(v_reservation_id) then
      v_released_count := v_released_count + 1;
    end if;
  end loop;
  return v_released_count;
end;
$$;

revoke all on function public.release_expired_commerce_inventory()
  from public, anon, authenticated;
grant execute on function public.release_expired_commerce_inventory()
  to service_role;

-- Ensure a soft-deleted row can never leak through the public catalog policy.
drop policy if exists "products_public_read_published" on public.commerce_products;
create policy "products_public_read_published" on public.commerce_products
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists "variants_public_read" on public.commerce_product_variants;
create policy "variants_public_read" on public.commerce_product_variants
  for select to anon, authenticated
  using (exists (
    select 1
    from public.commerce_products p
    where p.id = product_id
      and p.status = 'published'
      and p.deleted_at is null
  ));

commit;
