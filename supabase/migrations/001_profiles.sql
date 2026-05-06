-- Rulat în Supabase: SQL Editor → New query, sau: supabase db push (CLI).
-- Creează profilul utilizatorului, legat de auth.users.

create table if not exists public.profiles (
  id uuid not null primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  birth_date date,
  activity_type text check (activity_type in ('fizica', 'juridica')),
  company_name text,
  how_heard text,
  website text,
  newsletter boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_birth_date_idx on public.profiles (birth_date);

alter table public.profiles enable row level security;

-- Citire: doar propriul rând
drop policy if exists "Profiles select own" on public.profiles;
create policy "Profiles select own"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

-- Inserare: doar rândul propriu
drop policy if exists "Profiles insert own" on public.profiles;
create policy "Profiles insert own"
  on public.profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

-- Actualizare: doar rândul propriu
drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- La înregistrare, creează rând de profil gol
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profiles_updated_at();

-- Opțional: profilul poate fi creat automat de trigger (rulați doar dacă Superbase permite trigger pe auth.users).
-- create or replace function public.handle_new_user_profile() ... 
-- (Clientul aplicației inserează rândul la primul acces dacă lipsește — vezi account-profile-page.mjs)

comment on table public.profiles is 'Date cont Garage Solutions, legat de auth.users.';
