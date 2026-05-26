-- Mașini salvate în garaj per utilizator (sincron cu localStorage pe client).
-- Rulare în Supabase SQL Editor sau `supabase db push`.

create table if not exists public.user_saved_vehicles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  brand text not null,
  model text,
  engine text,
  body_type text,
  brand_logo_url text,
  production_years text,
  saved_at timestamptz,
  sort_index int not null default 0,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_saved_vehicles_user_id_idx on public.user_saved_vehicles (user_id);
create index if not exists user_saved_vehicles_user_sort_idx on public.user_saved_vehicles (user_id, sort_index);

alter table public.user_saved_vehicles enable row level security;

drop policy if exists "user_saved_vehicles select own" on public.user_saved_vehicles;
create policy "user_saved_vehicles select own"
  on public.user_saved_vehicles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_saved_vehicles insert own" on public.user_saved_vehicles;
create policy "user_saved_vehicles insert own"
  on public.user_saved_vehicles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_saved_vehicles update own" on public.user_saved_vehicles;
create policy "user_saved_vehicles update own"
  on public.user_saved_vehicles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_saved_vehicles delete own" on public.user_saved_vehicles;
create policy "user_saved_vehicles delete own"
  on public.user_saved_vehicles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_user_saved_vehicles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_saved_vehicles_set_updated_at on public.user_saved_vehicles;
create trigger user_saved_vehicles_set_updated_at
  before update on public.user_saved_vehicles
  for each row execute procedure public.set_user_saved_vehicles_updated_at();

comment on table public.user_saved_vehicles is 'Garaj utilizator — oglindă cloud a listei din localStorage (brand/model/motor etc.).';
