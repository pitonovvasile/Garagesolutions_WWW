-- Adrese livrare + câmpuri facturare pe profil. Rulare manuală în Supabase SQL Editor.

-- ——— Tabel adrese de livrare (mai multe per utilizator) ———
create table if not exists public.delivery_addresses (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  recipient_name text,
  phone text,
  street text,
  address_line2 text,
  city text,
  county text,
  postal_code text,
  country text not null default 'RO',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_addresses_user_id_idx on public.delivery_addresses (user_id);

alter table public.delivery_addresses enable row level security;

drop policy if exists "Delivery select own" on public.delivery_addresses;
create policy "Delivery select own"
  on public.delivery_addresses for select
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "Delivery insert own" on public.delivery_addresses;
create policy "Delivery insert own"
  on public.delivery_addresses for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Delivery update own" on public.delivery_addresses;
create policy "Delivery update own"
  on public.delivery_addresses for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Delivery delete own" on public.delivery_addresses;
create policy "Delivery delete own"
  on public.delivery_addresses for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

create or replace function public.set_delivery_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists delivery_set_updated_at on public.delivery_addresses;
create trigger delivery_set_updated_at
  before update on public.delivery_addresses
  for each row execute procedure public.set_delivery_updated_at();

-- ——— Câmpuri facturare (profil) ———
alter table public.profiles add column if not exists bill_type text
  check (bill_type is null or bill_type in ('fizica', 'juridica'));
alter table public.profiles add column if not exists bill_pf_last_name text;
alter table public.profiles add column if not exists bill_pf_first_name text;
alter table public.profiles add column if not exists bill_pf_cnp text;
alter table public.profiles add column if not exists bill_pf_county text;
alter table public.profiles add column if not exists bill_pf_city text;
alter table public.profiles add column if not exists bill_pf_street text;
alter table public.profiles add column if not exists bill_pf_postal text;
alter table public.profiles add column if not exists bill_pj_denumire text;
alter table public.profiles add column if not exists bill_pj_cui text;
alter table public.profiles add column if not exists bill_pj_reg_com text;
alter table public.profiles add column if not exists bill_pj_county text;
alter table public.profiles add column if not exists bill_pj_city text;
alter table public.profiles add column if not exists bill_pj_street text;
alter table public.profiles add column if not exists bill_pj_postal text;
alter table public.profiles add column if not exists bill_pj_bank text;
alter table public.profiles add column if not exists bill_pj_iban text;
alter table public.profiles add column if not exists bill_pj_contact text;

comment on table public.delivery_addresses is 'Adrese de livrare, per utilizator autentificat.';
