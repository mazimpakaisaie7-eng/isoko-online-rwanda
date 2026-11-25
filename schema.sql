-- Isoko Online Rwanda — Supabase database setup (RWF marketplace)
-- Safe to run more than once. Does not delete legacy public stores/products tables.
create extension if not exists pgcrypto;

create table if not exists public.isoko_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  location text not null default '',
  whatsapp text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.isoko_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.isoko_stores(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  price_rwf bigint not null check (price_rwf > 0),
  category text not null default 'Ibindi',
  image_url text not null default '',
  condition text not null default 'Gishya' check (condition in ('Gishya','Occasion')),
  stock integer not null default 1 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade an earlier Isoko schema that stored prices only in Pi.
alter table public.isoko_products add column if not exists price_pi numeric(20,6);
alter table public.isoko_products add column if not exists price_rwf bigint;
alter table public.isoko_products add column if not exists condition text not null default 'Gishya';
alter table public.isoko_products add column if not exists stock integer not null default 1;
alter table public.isoko_products alter column price_pi drop not null;
update public.isoko_products set price_rwf = 1000 where price_rwf is null;
alter table public.isoko_products alter column price_rwf set default 1000;
alter table public.isoko_products alter column price_rwf set not null;
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.isoko_products'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%price_pi%'
  loop execute format('alter table public.isoko_products drop constraint %I', c.conname); end loop;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.isoko_products'::regclass and conname='isoko_products_price_rwf_positive') then
    alter table public.isoko_products add constraint isoko_products_price_rwf_positive check (price_rwf > 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.isoko_products'::regclass and conname='isoko_products_stock_nonnegative') then
    alter table public.isoko_products add constraint isoko_products_stock_nonnegative check (stock >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.isoko_products'::regclass and conname='isoko_products_condition_valid') then
    alter table public.isoko_products add constraint isoko_products_condition_valid check (condition in ('Gishya','Occasion'));
  end if;
end $$;

-- Legacy Pi orders are retained but are not used for RWF orders.
create table if not exists public.isoko_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  pi_uid text not null,
  pi_username text not null,
  amount_pi numeric(20,6) not null check (amount_pi > 0),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  pi_payment_id text unique,
  txid text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists isoko_products_active_created_idx on public.isoko_products(active,created_at desc);
create index if not exists isoko_products_store_idx on public.isoko_products(store_id);
create index if not exists isoko_orders_buyer_idx on public.isoko_orders(buyer_id,created_at desc);

alter table public.isoko_stores enable row level security;
alter table public.isoko_products enable row level security;
alter table public.isoko_orders enable row level security;

drop policy if exists "Public can view active Isoko stores" on public.isoko_stores;
create policy "Public can view active Isoko stores" on public.isoko_stores for select using (active=true or auth.uid()=owner_id);
drop policy if exists "Owners create their Isoko store" on public.isoko_stores;
create policy "Owners create their Isoko store" on public.isoko_stores for insert to authenticated with check (auth.uid()=owner_id);
drop policy if exists "Owners update their Isoko store" on public.isoko_stores;
create policy "Owners update their Isoko store" on public.isoko_stores for update to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
drop policy if exists "Public can view active Isoko products" on public.isoko_products;
create policy "Public can view active Isoko products" on public.isoko_products for select using (active=true or auth.uid()=owner_id);
drop policy if exists "Owners create their Isoko products" on public.isoko_products;
create policy "Owners create their Isoko products" on public.isoko_products for insert to authenticated with check (auth.uid()=owner_id and exists(select 1 from public.isoko_stores s where s.id=store_id and s.owner_id=auth.uid()));
drop policy if exists "Owners update their Isoko products" on public.isoko_products;
create policy "Owners update their Isoko products" on public.isoko_products for update to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id and exists(select 1 from public.isoko_stores s where s.id=store_id and s.owner_id=auth.uid()));
drop policy if exists "Owners delete their Isoko products" on public.isoko_products;
create policy "Owners delete their Isoko products" on public.isoko_products for delete to authenticated using (auth.uid()=owner_id);
drop policy if exists "Buyers read their own orders" on public.isoko_orders;
create policy "Buyers read their own orders" on public.isoko_orders for select to authenticated using (auth.uid()=buyer_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('isoko-products','isoko-products',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Public can view Isoko product images" on storage.objects;
create policy "Public can view Isoko product images" on storage.objects for select using(bucket_id='isoko-products');
drop policy if exists "Authenticated users upload Isoko product images" on storage.objects;
create policy "Authenticated users upload Isoko product images" on storage.objects for insert to authenticated with check(bucket_id='isoko-products' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Owners update Isoko product images" on storage.objects;
create policy "Owners update Isoko product images" on storage.objects for update to authenticated using(bucket_id='isoko-products' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='isoko-products' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Owners delete Isoko product images" on storage.objects;
create policy "Owners delete Isoko product images" on storage.objects for delete to authenticated using(bucket_id='isoko-products' and (storage.foldername(name))[1]=auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Seller commission and verified sales (Isoko Online Rwanda)
-- Commission is 3% and is recorded only after an Admin verifies payment.
-- This release keeps WhatsApp checkout; it does NOT pretend to verify mobile
-- money or Pi payments automatically.
-- ---------------------------------------------------------------------------

create table if not exists public.isoko_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.isoko_is_admin()
returns boolean language sql stable security definer
set search_path = public, auth
as $$ select exists(select 1 from public.isoko_admins where user_id = auth.uid()); $$;
revoke all on function public.isoko_is_admin() from public;
grant execute on function public.isoko_is_admin() to anon, authenticated;

alter table public.isoko_products add column if not exists approval_status text not null default 'approved';
alter table public.isoko_products add column if not exists reviewed_at timestamptz;
alter table public.isoko_products add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.isoko_products'::regclass and conname='isoko_products_approval_status_valid') then
    alter table public.isoko_products add constraint isoko_products_approval_status_valid check(approval_status in ('pending','approved','rejected'));
  end if;
end $$;

create table if not exists public.isoko_activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.isoko_sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete restrict,
  store_id uuid not null references public.isoko_stores(id) on delete restrict,
  product_id uuid not null references public.isoko_products(id) on delete restrict,
  quantity integer not null check(quantity > 0),
  unit_price_rwf bigint not null check(unit_price_rwf > 0),
  gross_amount_rwf bigint generated always as (quantity::bigint * unit_price_rwf) stored,
  customer_reference text not null default '' check(char_length(customer_reference)<=120),
  payment_method text not null default 'offline' check(payment_method in ('cash','mobile_money','bank','pi','offline','other')),
  payment_note text not null default '' check(char_length(payment_note)<=500),
  status text not null default 'awaiting_verification' check(status in ('awaiting_verification','verified_paid','rejected','refunded')),
  reported_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null
);

create table if not exists public.isoko_commissions (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null unique references public.isoko_sales(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  gross_amount_rwf bigint not null check(gross_amount_rwf > 0),
  commission_rate numeric(5,4) not null default 0.03 check(commission_rate=0.03),
  commission_amount_rwf bigint not null check(commission_amount_rwf >= 0),
  seller_amount_rwf bigint not null check(seller_amount_rwf >= 0),
  created_at timestamptz not null default now()
);

alter table public.isoko_commissions add column if not exists collection_status text not null default 'due';
alter table public.isoko_commissions add column if not exists collected_at timestamptz;
alter table public.isoko_commissions add column if not exists collection_reference text not null default '';
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.isoko_commissions'::regclass and conname='isoko_commissions_collection_status_valid') then
    alter table public.isoko_commissions add constraint isoko_commissions_collection_status_valid check(collection_status in ('due','collected'));
  end if;
end $$;

create index if not exists isoko_sales_seller_idx on public.isoko_sales(seller_id,reported_at desc);
create index if not exists isoko_sales_status_idx on public.isoko_sales(status,reported_at desc);
create index if not exists isoko_commissions_seller_idx on public.isoko_commissions(seller_id,created_at desc);

alter table public.isoko_admins enable row level security;
alter table public.isoko_sales enable row level security;
alter table public.isoko_activity_logs enable row level security;
alter table public.isoko_commissions enable row level security;

-- Admins are inserted manually by the project owner in Supabase SQL Editor.
drop policy if exists "Admin manage stores" on public.isoko_stores;
create policy "Admin manage stores" on public.isoko_stores for all to authenticated
using(public.isoko_is_admin()) with check(public.isoko_is_admin());
drop policy if exists "Admin read activity logs" on public.isoko_activity_logs;
create policy "Admin read activity logs" on public.isoko_activity_logs for select to authenticated
using(public.isoko_is_admin());

create or replace function public.isoko_log_activity()
returns trigger language plpgsql security definer
set search_path = public, auth
as $$
declare v jsonb; v_id text; v_actor uuid;
begin
  if TG_OP='DELETE' then v:=to_jsonb(OLD); else v:=to_jsonb(NEW); end if;
  v_id:=coalesce(v->>'id','');
  v_actor:=auth.uid();
  insert into public.isoko_activity_logs(actor_id,action,entity,entity_id,details)
  values(v_actor,lower(TG_OP),TG_TABLE_NAME,v_id,jsonb_strip_nulls(jsonb_build_object(
    'name',v->>'name','status',v->>'status','approval_status',v->>'approval_status',
    'price_rwf',v->>'price_rwf','gross_amount_rwf',v->>'gross_amount_rwf'
  )));
  if TG_OP='DELETE' then return OLD; else return NEW; end if;
end $$;

drop trigger if exists isoko_store_activity on public.isoko_stores;
create trigger isoko_store_activity after insert or update or delete on public.isoko_stores
for each row execute function public.isoko_log_activity();
drop trigger if exists isoko_product_activity on public.isoko_products;
create trigger isoko_product_activity after insert or update or delete on public.isoko_products
for each row execute function public.isoko_log_activity();
drop trigger if exists isoko_sale_activity on public.isoko_sales;
create trigger isoko_sale_activity after insert or update or delete on public.isoko_sales
for each row execute function public.isoko_log_activity();
revoke all on function public.isoko_log_activity() from public;
drop policy if exists "Public can view active Isoko products" on public.isoko_products;
drop policy if exists "Admin manage products" on public.isoko_products;
create policy "Admin manage products" on public.isoko_products for all to authenticated
using(public.isoko_is_admin()) with check(public.isoko_is_admin());
drop policy if exists "Public see approved active products" on public.isoko_products;
create policy "Public see approved active products" on public.isoko_products for select
using((active=true and approval_status='approved') or auth.uid()=owner_id or public.isoko_is_admin());

-- Replace broad old policies with approval-aware owner/admin policies.
drop policy if exists "Owners create their Isoko products" on public.isoko_products;
create policy "Owners create pending Isoko products" on public.isoko_products for insert to authenticated
with check(auth.uid()=owner_id and approval_status='pending' and exists(select 1 from public.isoko_stores s where s.id=store_id and s.owner_id=auth.uid()));
drop policy if exists "Owners update their Isoko products" on public.isoko_products;
create policy "Owners update their pending Isoko products" on public.isoko_products for update to authenticated
using(auth.uid()=owner_id and approval_status in ('pending','rejected'))
with check(auth.uid()=owner_id and approval_status='pending' and exists(select 1 from public.isoko_stores s where s.id=store_id and s.owner_id=auth.uid()));

drop policy if exists "Seller create own sale reports" on public.isoko_sales;
create policy "Seller create own sale reports" on public.isoko_sales for insert to authenticated
with check(auth.uid()=seller_id and status='awaiting_verification' and exists(
  select 1 from public.isoko_products p join public.isoko_stores s on s.id=p.store_id
  where p.id=product_id and p.owner_id=auth.uid() and p.store_id=isoko_sales.store_id and s.owner_id=auth.uid()
));
drop policy if exists "Seller and admin read sales" on public.isoko_sales;
create policy "Seller and admin read sales" on public.isoko_sales for select to authenticated
using(auth.uid()=seller_id or public.isoko_is_admin());
drop policy if exists "Admin update sales" on public.isoko_sales;
create policy "Admin update sales" on public.isoko_sales for update to authenticated
using(public.isoko_is_admin()) with check(public.isoko_is_admin());

drop policy if exists "Seller and admin read commissions" on public.isoko_commissions;
create policy "Seller and admin read commissions" on public.isoko_commissions for select to authenticated
using(auth.uid()=seller_id or public.isoko_is_admin());
drop policy if exists "Admin update commission collection" on public.isoko_commissions;
create policy "Admin update commission collection" on public.isoko_commissions for update to authenticated
using(public.isoko_is_admin()) with check(public.isoko_is_admin());

-- The only path that creates a commission: Admin verifies a reported paid sale.
create or replace function public.isoko_verify_sale(p_sale_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, auth
as $$
declare v_sale public.isoko_sales%rowtype; v_commission bigint;
begin
  if not public.isoko_is_admin() then raise exception 'Admin permission required'; end if;
  select * into v_sale from public.isoko_sales where id=p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if v_sale.status <> 'awaiting_verification' then raise exception 'Sale is not awaiting verification'; end if;
  v_commission := round(v_sale.gross_amount_rwf * 0.03)::bigint;
  update public.isoko_sales set status='verified_paid',verified_at=now(),verified_by=auth.uid() where id=p_sale_id;
  insert into public.isoko_commissions(sale_id,seller_id,gross_amount_rwf,commission_rate,commission_amount_rwf,seller_amount_rwf)
  values(v_sale.id,v_sale.seller_id,v_sale.gross_amount_rwf,0.03,v_commission,v_sale.gross_amount_rwf-v_commission)
  on conflict(sale_id) do nothing;
  return jsonb_build_object('sale_id',p_sale_id,'gross_amount_rwf',v_sale.gross_amount_rwf,'commission_amount_rwf',v_commission,'seller_amount_rwf',v_sale.gross_amount_rwf-v_commission,'status','verified_paid');
end $$;
revoke all on function public.isoko_verify_sale(uuid) from public;
grant execute on function public.isoko_verify_sale(uuid) to authenticated;


-- IMPORTANT: add the owner's Auth user UUID here after creating/signing in to
-- the owner account. Do not expose this table to public users.
-- insert into public.isoko_admins(user_id) values ('YOUR-AUTH-USER-UUID') on conflict do nothing;
