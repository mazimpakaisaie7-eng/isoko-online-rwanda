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
