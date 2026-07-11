-- ============================================================================
-- Production commerce lifecycle: atomic checkout holds, payment finalization,
-- expiry/cancellation, and stable inventory adjustments.
--
-- Apply after 20260709_commerce_backend.sql and
-- 20260710_admin_catalog_safety.sql.
-- ============================================================================

begin;

alter table public.commerce_orders
  add column if not exists checkout_idempotency_key uuid,
  add column if not exists checkout_fingerprint text,
  add column if not exists payment_attempt_expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

create unique index if not exists commerce_orders_checkout_idempotency_uniq
  on public.commerce_orders (checkout_idempotency_key)
  where checkout_idempotency_key is not null;

alter table public.commerce_product_variants
  add column if not exists archived_at timestamptz;

drop policy if exists "variants_public_read" on public.commerce_product_variants;
create policy "variants_public_read" on public.commerce_product_variants
  for select to anon, authenticated
  using (
    archived_at is null
    and exists (
      select 1 from public.commerce_products p
      where p.id = product_id
        and p.status = 'published'
        and p.deleted_at is null
    )
  );

alter table public.commerce_orders
  drop constraint if exists commerce_orders_status_check;
alter table public.commerce_orders
  add constraint commerce_orders_status_check
  check (status in (
    'draft', 'pending_payment', 'paid', 'fulfilled', 'cancelled', 'payment_review'
  ));

create table if not exists public.commerce_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  provider text not null check (provider = 'razorpay'),
  idempotency_key uuid not null,
  provider_order_id text unique,
  receipt text not null unique,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null check (currency = 'INR'),
  status text not null default 'created'
    check (status in (
      'created', 'gateway_created', 'captured', 'completed', 'expired', 'failed',
      'review_required'
    )),
  expires_at timestamptz not null,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, idempotency_key)
);

create unique index if not exists commerce_one_live_payment_attempt_per_order
  on public.commerce_payment_attempts (order_id)
  where status in ('created', 'gateway_created');
create index if not exists commerce_payment_attempt_order_status_idx
  on public.commerce_payment_attempts (order_id, status);

create table if not exists public.commerce_payment_captures (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'razorpay'),
  provider_payment_id text not null,
  provider_order_id text not null,
  order_id uuid references public.commerce_orders(id) on delete restrict,
  attempt_id uuid references public.commerce_payment_attempts(id) on delete restrict,
  amount_paise bigint not null,
  currency text not null,
  captured_at timestamptz,
  state text not null default 'received'
    check (state in ('received', 'completed', 'review_required')),
  review_reason text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index if not exists commerce_payment_captures_order_idx
  on public.commerce_payment_captures (order_id, state);

alter table public.commerce_payment_attempts enable row level security;
alter table public.commerce_payment_captures enable row level security;
revoke all on public.commerce_payment_attempts from anon, authenticated;
revoke all on public.commerce_payment_captures from anon, authenticated;
grant all on public.commerce_payment_attempts to service_role;
grant all on public.commerce_payment_captures to service_role;

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
      v.id, v.size, v.set_price_inr, v.inventory_quantity, v.manage_inventory,
      v.allow_backorder, p.id as product_id, p.handle, p.title, p.color_family,
      p.thumbnail
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

    v_total_sets := v_total_sets + v_line.quantity;
    v_base_subtotal := v_base_subtotal + (v_variant.set_price_inr * v_line.quantity);
    v_normalized_lines := v_normalized_lines || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id,
      'product_id', v_variant.product_id,
      'handle', v_variant.handle,
      'title', v_variant.title,
      'size', v_variant.size,
      'color', v_variant.color_family,
      'thumbnail', v_variant.thumbnail,
      'unit_price_inr', v_variant.set_price_inr,
      'quantity', v_line.quantity,
      'metadata', v_line.metadata,
      'manage_inventory', v_variant.manage_inventory,
      'allow_backorder', v_variant.allow_backorder
    ));
  end loop;

  if v_total_sets < 4 then
    raise exception 'Minimum order quantity is 4 sets.' using errcode = '22023';
  end if;
  v_discount_percent := case
    when v_total_sets >= 20 then 10
    when v_total_sets >= 8 then 5
    else 0
  end;
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
    v_total_sets, v_total_sets * 4, jsonb_build_object('size_ratio', 'S/M/L/XL'),
    p_idempotency_key, v_fingerprint, v_expires_at
  ) returning * into v_order;

  for v_line in
    select * from jsonb_to_recordset(v_normalized_lines) as x(
      variant_id uuid, product_id uuid, handle text, title text, size text, color text,
      thumbnail text, unit_price_inr integer, quantity integer, metadata jsonb,
      manage_inventory boolean, allow_backorder boolean
    )
  loop
    insert into public.commerce_order_items (
      order_id, product_id, variant_id, handle, title, size, color, quantity,
      unit_price_inr, line_total_inr, pieces, metadata
    ) values (
      v_order.id, v_line.product_id, v_line.variant_id, v_line.handle, v_line.title,
      v_line.size, v_line.color, v_line.quantity, v_line.unit_price_inr,
      v_line.unit_price_inr * v_line.quantity, v_line.quantity * 4,
      v_line.metadata || jsonb_build_object('image', v_line.thumbnail)
    );
    if v_line.manage_inventory and not v_line.allow_backorder then
      update public.commerce_product_variants
      set inventory_quantity = inventory_quantity - v_line.quantity
      where id = v_line.variant_id;
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

create or replace function public.begin_commerce_payment_attempt(
  p_order_id uuid,
  p_idempotency_key uuid
)
returns table (
  attempt_id uuid,
  receipt text,
  amount_paise bigint,
  currency text,
  expires_at timestamptz,
  provider_order_id text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.commerce_orders%rowtype;
  v_attempt public.commerce_payment_attempts%rowtype;
begin
  select * into v_order from public.commerce_orders where id = p_order_id for update;
  if not found or v_order.status not in ('draft', 'pending_payment') then
    raise exception 'Order is not payable.' using errcode = 'P0001';
  end if;
  if v_order.payment_attempt_expires_at is null or v_order.payment_attempt_expires_at <= now() then
    raise exception 'The inventory hold has expired. Please restart checkout.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.commerce_order_items oi
    left join public.commerce_inventory_reservations r
      on r.order_id = oi.order_id
      and r.variant_id = oi.variant_id
      and r.quantity = oi.quantity
    where oi.order_id = p_order_id
      and (r.id is null or r.status <> 'reserved' or r.expires_at <= now())
  ) then
    raise exception 'Inventory is no longer reserved for this order.' using errcode = 'P0001';
  end if;

  select * into v_attempt
  from public.commerce_payment_attempts
  where order_id = p_order_id
    and idempotency_key = p_idempotency_key
  for update;
  if found then
    return query select
      v_attempt.id, v_attempt.receipt, v_attempt.amount_paise, v_attempt.currency,
      v_attempt.expires_at, v_attempt.provider_order_id;
    return;
  end if;
  if exists (
    select 1 from public.commerce_payment_attempts
    where order_id = p_order_id and status in ('created', 'gateway_created')
  ) then
    raise exception 'A payment is already in progress for this order.' using errcode = 'P0001';
  end if;

  insert into public.commerce_payment_attempts (
    order_id, provider, idempotency_key, receipt, amount_paise, currency, expires_at
  ) values (
    p_order_id, 'razorpay', p_idempotency_key,
    ('rp_' || substr(replace(p_order_id::text, '-', ''), 1, 20) || '_' ||
      extract(epoch from clock_timestamp())::bigint)::text,
    v_order.total_inr * 100, v_order.currency, v_order.payment_attempt_expires_at
  ) returning * into v_attempt;
  update public.commerce_orders set status = 'pending_payment' where id = p_order_id;
  return query select
    v_attempt.id, v_attempt.receipt, v_attempt.amount_paise, v_attempt.currency,
    v_attempt.expires_at, v_attempt.provider_order_id;
end;
$$;

create or replace function public.attach_commerce_payment_order(
  p_attempt_id uuid,
  p_provider_order_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.commerce_payment_attempts%rowtype;
begin
  select * into v_attempt from public.commerce_payment_attempts where id = p_attempt_id for update;
  if not found or v_attempt.status not in ('created', 'gateway_created') or v_attempt.expires_at <= now() then
    return false;
  end if;
  if v_attempt.provider_order_id is not null and v_attempt.provider_order_id <> p_provider_order_id then
    return false;
  end if;
  update public.commerce_payment_attempts
  set provider_order_id = p_provider_order_id, status = 'gateway_created'
  where id = p_attempt_id;
  update public.commerce_orders
  set payment_provider = 'razorpay', payment_order_id = p_provider_order_id
  where id = v_attempt.order_id and payment_transaction_id is null;
  return true;
end;
$$;

create or replace function public.finalize_captured_commerce_payment(
  p_provider_payment_id text,
  p_provider_order_id text,
  p_amount_paise bigint,
  p_currency text,
  p_provider_payload jsonb default '{}'::jsonb
)
returns table (
  outcome text,
  order_id uuid,
  display_number bigint,
  review_reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.commerce_payment_attempts%rowtype;
  v_order public.commerce_orders%rowtype;
  v_capture public.commerce_payment_captures%rowtype;
  v_reason text;
begin
  select * into v_capture
  from public.commerce_payment_captures
  where provider = 'razorpay' and provider_payment_id = p_provider_payment_id
  for update;
  if found and v_capture.state = 'completed' then
    return query select 'idempotent'::text, v_capture.order_id, null::bigint, null::text;
    return;
  end if;

  select * into v_attempt
  from public.commerce_payment_attempts
  where provider = 'razorpay' and provider_order_id = p_provider_order_id
  for update;
  if not found then
    insert into public.commerce_payment_captures (
      provider, provider_payment_id, provider_order_id, amount_paise, currency,
      state, review_reason, provider_payload
    ) values (
      'razorpay', p_provider_payment_id, p_provider_order_id, p_amount_paise, p_currency,
      'review_required', 'UNKNOWN_PROVIDER_ORDER', coalesce(p_provider_payload, '{}'::jsonb)
    ) on conflict (provider, provider_payment_id) do update
      set state = 'review_required', review_reason = 'UNKNOWN_PROVIDER_ORDER';
    return query select 'review_required'::text, null::uuid, null::bigint, 'UNKNOWN_PROVIDER_ORDER'::text;
    return;
  end if;

  select * into v_order from public.commerce_orders where id = v_attempt.order_id for update;
  if v_order.status = 'paid' and v_order.payment_transaction_id = p_provider_payment_id then
    return query select 'idempotent'::text, v_order.id, v_order.display_number, null::text;
    return;
  end if;

  if p_amount_paise <> v_attempt.amount_paise
     or upper(p_currency) <> upper(v_attempt.currency)
     or v_attempt.status <> 'gateway_created'
     or v_order.payment_order_id <> p_provider_order_id then
    v_reason := 'PAYMENT_ATTEMPT_MISMATCH';
  elsif v_attempt.expires_at <= now() then
    v_reason := 'RESERVATION_EXPIRED_AFTER_CAPTURE';
  elsif exists (
    select 1 from public.commerce_order_items oi
    left join public.commerce_inventory_reservations r
      on r.order_id = oi.order_id
      and r.variant_id = oi.variant_id
      and r.quantity = oi.quantity
    where oi.order_id = v_order.id
      and (r.id is null or r.status <> 'reserved' or r.expires_at <= now())
  ) then
    v_reason := 'RESERVATION_MISSING_AFTER_CAPTURE';
  end if;

  if v_reason is not null then
    insert into public.commerce_payment_captures (
      provider, provider_payment_id, provider_order_id, order_id, attempt_id,
      amount_paise, currency, state, review_reason, provider_payload
    ) values (
      'razorpay', p_provider_payment_id, p_provider_order_id, v_order.id, v_attempt.id,
      p_amount_paise, p_currency, 'review_required', v_reason,
      coalesce(p_provider_payload, '{}'::jsonb)
    ) on conflict (provider, provider_payment_id) do update
      set state = 'review_required', review_reason = excluded.review_reason;
    update public.commerce_payment_attempts
      set status = 'review_required', failure_reason = v_reason
      where id = v_attempt.id;
    update public.commerce_orders
      set status = 'payment_review'
      where id = v_order.id and status in ('draft', 'pending_payment');
    return query select 'review_required'::text, v_order.id, v_order.display_number, v_reason;
    return;
  end if;

  update public.commerce_inventory_reservations
  set status = 'consumed', consumed_at = now()
  where order_id = v_order.id and status = 'reserved';
  update public.commerce_payment_attempts set status = 'completed' where id = v_attempt.id;
  update public.commerce_orders
  set status = 'paid', payment_provider = 'razorpay',
      payment_transaction_id = p_provider_payment_id,
      payment_amount_paise = p_amount_paise,
      paid_at = now(), completed_at = now()
  where id = v_order.id;
  insert into public.commerce_payment_captures (
    provider, provider_payment_id, provider_order_id, order_id, attempt_id,
    amount_paise, currency, captured_at, state, provider_payload
  ) values (
    'razorpay', p_provider_payment_id, p_provider_order_id, v_order.id, v_attempt.id,
    p_amount_paise, p_currency, now(), 'completed',
    coalesce(p_provider_payload, '{}'::jsonb)
  ) on conflict (provider, provider_payment_id) do update
    set state = 'completed', order_id = excluded.order_id, attempt_id = excluded.attempt_id;
  return query select 'completed'::text, v_order.id, v_order.display_number, null::text;
end;
$$;

create or replace function public.cancel_commerce_order(
  p_order_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation record;
begin
  perform 1
  from public.commerce_orders
  where id = p_order_id and status in ('draft', 'pending_payment')
  for update;
  if not found then
    return false;
  end if;
  for v_reservation in
    select * from public.commerce_inventory_reservations
    where order_id = p_order_id and status = 'reserved'
    for update
  loop
    if v_reservation.inventory_decremented then
      update public.commerce_product_variants
      set inventory_quantity = inventory_quantity + v_reservation.quantity
      where id = v_reservation.variant_id;
    end if;
    update public.commerce_inventory_reservations
    set status = 'released', released_at = now()
    where id = v_reservation.id;
  end loop;
  update public.commerce_payment_attempts
  set status = 'expired', failure_reason = coalesce(p_reason, 'cancelled')
  where order_id = p_order_id and status in ('created', 'gateway_created');
  update public.commerce_orders
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = left(coalesce(p_reason, 'cancelled'), 500)
  where id = p_order_id;
  return true;
end;
$$;

create or replace function public.expire_commerce_checkout_holds(
  p_limit integer default 250
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_reservation_id uuid;
  v_count integer := 0;
begin
  for v_reservation_id, v_order_id in
    select r.id, r.order_id
    from public.commerce_inventory_reservations r
    join public.commerce_orders o on o.id = r.order_id
    where r.status = 'reserved'
      and r.expires_at <= now()
      and o.status in ('draft', 'pending_payment')
    order by r.expires_at, r.id
    limit greatest(1, least(p_limit, 500))
    for update of r skip locked
  loop
    if public.cancel_commerce_order(v_order_id, 'inventory_hold_expired') then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.create_commerce_checkout(text, jsonb, jsonb, uuid, integer) from public, anon, authenticated;
revoke all on function public.begin_commerce_payment_attempt(uuid, uuid) from public, anon, authenticated;
revoke all on function public.attach_commerce_payment_order(uuid, text) from public, anon, authenticated;
revoke all on function public.finalize_captured_commerce_payment(text, text, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_commerce_order(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_commerce_checkout_holds(integer) from public, anon, authenticated;
grant execute on function public.create_commerce_checkout(text, jsonb, jsonb, uuid, integer) to service_role;
grant execute on function public.begin_commerce_payment_attempt(uuid, uuid) to service_role;
grant execute on function public.attach_commerce_payment_order(uuid, text) to service_role;
grant execute on function public.finalize_captured_commerce_payment(text, text, bigint, text, jsonb) to service_role;
grant execute on function public.cancel_commerce_order(uuid, text) to service_role;
grant execute on function public.expire_commerce_checkout_holds(integer) to service_role;

commit;
