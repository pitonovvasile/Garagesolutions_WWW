-- Aerodynamic data model for the existing BMW catalog schema.
-- Uses generations + generation_body_styles instead of vehicle_chassis / vehicle_body_style.

create extension if not exists "pgcrypto";

create table if not exists public.aero_package (
  id uuid primary key default gen_random_uuid(),

  generation_id bigint null references public.generations(id) on delete cascade,

  name text not null,
  manufacturer text null,
  package_type text not null default 'OEM',
  description text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint aero_package_type_check
    check (package_type in ('OEM', 'OEM_OPTIONAL', 'AFTERMARKET', 'CUSTOM', 'UNKNOWN')),

  constraint aero_package_unique
    unique nulls not distinct (generation_id, name)
);

create table if not exists public.aero_profile (
  id uuid primary key default gen_random_uuid(),

  generation_body_style_id bigint not null references public.generation_body_styles(id) on delete cascade,
  aero_package_id uuid null references public.aero_package(id) on delete set null,

  name text not null,

  drag_coefficient_cd numeric(6,4) null,
  frontal_area_m2 numeric(6,3) null,
  drag_area_cda_m2 numeric(6,3) null,

  lift_coefficient_cl numeric(7,4) null,
  front_lift_coefficient numeric(7,4) null,
  rear_lift_coefficient numeric(7,4) null,

  front_aero_balance_percent numeric(5,2) null,
  rear_aero_balance_percent numeric(5,2) null,

  reference_speed_kmh numeric(6,1) null,

  data_source_type text not null default 'published_spec',
  confidence_level text not null default 'medium',
  calculation_method text null,

  source_name text null,
  source_url text null,

  is_estimated boolean not null default false,
  is_default boolean not null default false,

  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint aero_profile_source_type_check
    check (data_source_type in (
      'official',
      'published_spec',
      'calculated',
      'estimated',
      'cfd',
      'wind_tunnel',
      'user_measured',
      'unknown'
    )),

  constraint aero_profile_confidence_check
    check (confidence_level in ('low', 'medium', 'high', 'unknown')),

  constraint aero_profile_positive_values_check
    check (
      (drag_coefficient_cd is null or drag_coefficient_cd > 0)
      and (frontal_area_m2 is null or frontal_area_m2 > 0)
      and (drag_area_cda_m2 is null or drag_area_cda_m2 > 0)
      and (reference_speed_kmh is null or reference_speed_kmh > 0)
    ),

  constraint aero_profile_balance_range_check
    check (
      (front_aero_balance_percent is null or front_aero_balance_percent between 0 and 100)
      and (rear_aero_balance_percent is null or rear_aero_balance_percent between 0 and 100)
    ),

  constraint aero_profile_balance_sum_check
    check (
      front_aero_balance_percent is null
      or rear_aero_balance_percent is null
      or round(front_aero_balance_percent + rear_aero_balance_percent, 2) = 100.00
    ),

  constraint aero_profile_unique
    unique nulls not distinct (generation_body_style_id, aero_package_id, name)
);

create table if not exists public.aero_component (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  component_type text not null,
  position text not null,

  manufacturer text null,
  description text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint aero_component_type_check
    check (component_type in (
      'front_splitter',
      'front_lip',
      'rear_spoiler',
      'rear_wing',
      'diffuser',
      'flat_floor',
      'canard',
      'side_skirt',
      'bumper',
      'underbody_panel',
      'hardtop',
      'other'
    )),

  constraint aero_component_position_check
    check (position in ('front', 'rear', 'side', 'underbody', 'roof', 'full_body', 'unknown')),

  constraint aero_component_unique
    unique nulls not distinct (name, component_type, position, manufacturer)
);

create table if not exists public.aero_package_component (
  id uuid primary key default gen_random_uuid(),

  aero_package_id uuid not null references public.aero_package(id) on delete cascade,
  aero_component_id uuid not null references public.aero_component(id) on delete cascade,

  quantity integer not null default 1,
  notes text null,

  created_at timestamptz not null default now(),

  constraint aero_package_component_quantity_check
    check (quantity > 0),

  constraint aero_package_component_unique
    unique (aero_package_id, aero_component_id)
);

create table if not exists public.aero_component_effect (
  id uuid primary key default gen_random_uuid(),

  aero_component_id uuid not null references public.aero_component(id) on delete cascade,
  generation_body_style_id bigint null references public.generation_body_styles(id) on delete cascade,

  speed_kmh numeric(6,1) not null default 160,

  delta_cd numeric(7,4) null,
  delta_cl numeric(7,4) null,

  delta_front_downforce_kg numeric(8,2) null,
  delta_rear_downforce_kg numeric(8,2) null,
  delta_total_downforce_kg numeric(8,2) generated always as (
    case
      when delta_front_downforce_kg is null and delta_rear_downforce_kg is null then null
      else coalesce(delta_front_downforce_kg, 0) + coalesce(delta_rear_downforce_kg, 0)
    end
  ) stored,

  delta_drag_kg numeric(8,2) null,

  data_source_type text not null default 'estimated',
  confidence_level text not null default 'low',

  source_name text null,
  source_url text null,
  notes text null,

  created_at timestamptz not null default now(),

  constraint aero_component_effect_source_type_check
    check (data_source_type in (
      'official',
      'published_spec',
      'calculated',
      'estimated',
      'cfd',
      'wind_tunnel',
      'user_measured',
      'unknown'
    )),

  constraint aero_component_effect_confidence_check
    check (confidence_level in ('low', 'medium', 'high', 'unknown')),

  constraint aero_component_effect_speed_check
    check (speed_kmh > 0),

  constraint aero_component_effect_unique
    unique nulls not distinct (aero_component_id, generation_body_style_id, speed_kmh)
);

create index if not exists idx_aero_package_generation_id
  on public.aero_package(generation_id);

create index if not exists idx_aero_profile_generation_body_style_id
  on public.aero_profile(generation_body_style_id);

create index if not exists idx_aero_profile_aero_package_id
  on public.aero_profile(aero_package_id)
  where aero_package_id is not null;

create unique index if not exists idx_aero_profile_one_default_per_body_style
  on public.aero_profile(generation_body_style_id)
  where is_default;

create index if not exists idx_aero_component_type
  on public.aero_component(component_type);

create index if not exists idx_aero_component_effect_component_id
  on public.aero_component_effect(aero_component_id);

create index if not exists idx_aero_component_effect_generation_body_style_id
  on public.aero_component_effect(generation_body_style_id)
  where generation_body_style_id is not null;

create or replace function public.set_aero_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aero_package_set_updated_at on public.aero_package;
create trigger aero_package_set_updated_at
  before update on public.aero_package
  for each row execute procedure public.set_aero_updated_at();

drop trigger if exists aero_profile_set_updated_at on public.aero_profile;
create trigger aero_profile_set_updated_at
  before update on public.aero_profile
  for each row execute procedure public.set_aero_updated_at();

drop trigger if exists aero_component_set_updated_at on public.aero_component;
create trigger aero_component_set_updated_at
  before update on public.aero_component
  for each row execute procedure public.set_aero_updated_at();

grant select on table
  public.aero_package,
  public.aero_profile,
  public.aero_component,
  public.aero_package_component,
  public.aero_component_effect
to anon, authenticated;

alter table public.aero_package enable row level security;
alter table public.aero_profile enable row level security;
alter table public.aero_component enable row level security;
alter table public.aero_package_component enable row level security;
alter table public.aero_component_effect enable row level security;

drop policy if exists "aero_package public read" on public.aero_package;
create policy "aero_package public read"
on public.aero_package
for select
to anon, authenticated
using (true);

drop policy if exists "aero_profile public read" on public.aero_profile;
create policy "aero_profile public read"
on public.aero_profile
for select
to anon, authenticated
using (true);

drop policy if exists "aero_component public read" on public.aero_component;
create policy "aero_component public read"
on public.aero_component
for select
to anon, authenticated
using (true);

drop policy if exists "aero_package_component public read" on public.aero_package_component;
create policy "aero_package_component public read"
on public.aero_package_component
for select
to anon, authenticated
using (true);

drop policy if exists "aero_component_effect public read" on public.aero_component_effect;
create policy "aero_component_effect public read"
on public.aero_component_effect
for select
to anon, authenticated
using (true);

insert into public.aero_package (
  generation_id,
  name,
  manufacturer,
  package_type,
  description
)
select
  g.id,
  pkg.name,
  pkg.manufacturer,
  pkg.package_type,
  pkg.description
from public.generations g
join public.models m on m.id = g.model_id
cross join (
  values
    ('Stock', 'BMW', 'OEM', 'Factory standard bodywork'),
    ('M-Tech I', 'BMW', 'OEM_OPTIONAL', 'OEM sport aerodynamic package'),
    ('M-Tech II', 'BMW', 'OEM_OPTIONAL', 'OEM facelift sport aerodynamic package'),
    ('M3', 'BMW M', 'OEM', 'Factory M3 aerodynamic bodywork'),
    ('M3 CSL', 'BMW M', 'OEM', 'CSL aerodynamic package'),
    ('Aftermarket Custom', null, 'CUSTOM', 'User-defined aerodynamic setup')
) as pkg(name, manufacturer, package_type, description)
where lower(g.code) = 'e46'
  and lower(coalesce(m.slug, '')) = '3-series'
on conflict (generation_id, name) do nothing;

with e46_generation_body_styles as (
  select
    gbs.id as generation_body_style_id,
    gbs.generation_id,
    bs.code as body_style_code
  from public.generation_body_styles gbs
  join public.generations g on g.id = gbs.generation_id
  join public.models m on m.id = g.model_id
  join public.body_styles bs on bs.id = gbs.body_style_id
  where lower(g.code) = 'e46'
    and lower(coalesce(m.slug, '')) = '3-series'
),
profile_data as (
  select *
  from (
    values
      ('sedan', 'Stock', 'BMW E46 Sedan Stock', 0.3000, 2.060, true, 'Default value based on common E46 sedan published specs'),
      ('coupe', 'Stock', 'BMW E46 Coupe Stock', 0.3000, 1.980, true, 'Default value based on 325Ci/330Ci coupe published specs'),
      ('convertible', 'Stock', 'BMW E46 Convertible Stock', 0.3500, 1.980, true, 'Default value based on 330Ci convertible published specs'),
      ('touring', 'Stock', 'BMW E46 Touring Stock', 0.3200, 2.060, true, 'Default value based on E46 touring published specs'),
      ('compact', 'Stock', 'BMW E46 Compact Stock', 0.3000, 2.070, true, 'Default value based on 325ti compact published specs'),
      ('coupe', 'M3', 'BMW E46 M3 Coupe OEM Aero', 0.3300, 2.090, false, 'Mapped from M3 coupe aero data to the coupe body style via the M3 package'),
      ('convertible', 'M3', 'BMW E46 M3 Convertible OEM Aero', 0.3300, 2.090, false, 'Mapped from M3 cabrio aero data to the convertible body style via the M3 package')
  ) as t(body_style_code, package_name, profile_name, cd, frontal_area, is_default, notes)
)
insert into public.aero_profile (
  generation_body_style_id,
  aero_package_id,
  name,
  drag_coefficient_cd,
  frontal_area_m2,
  drag_area_cda_m2,
  lift_coefficient_cl,
  front_lift_coefficient,
  rear_lift_coefficient,
  front_aero_balance_percent,
  rear_aero_balance_percent,
  reference_speed_kmh,
  data_source_type,
  confidence_level,
  calculation_method,
  source_name,
  source_url,
  is_estimated,
  is_default,
  notes
)
select
  egbs.generation_body_style_id,
  ap.id,
  pd.profile_name,
  pd.cd,
  pd.frontal_area,
  round((pd.cd * pd.frontal_area)::numeric, 3),
  null,
  null,
  null,
  null,
  null,
  null,
  'published_spec',
  'medium',
  'CdA = Cd * frontal_area_m2',
  'Car specifications / public reference data',
  null,
  false,
  pd.is_default,
  pd.notes
from e46_generation_body_styles egbs
join profile_data pd on pd.body_style_code = lower(egbs.body_style_code)
join public.aero_package ap
  on ap.generation_id = egbs.generation_id
  and ap.name = pd.package_name
on conflict (generation_body_style_id, aero_package_id, name) do nothing;

insert into public.aero_component (
  name,
  component_type,
  position,
  manufacturer,
  description
)
values
  ('Front splitter', 'front_splitter', 'front', null, 'Generic front splitter'),
  ('Front lip', 'front_lip', 'front', null, 'Generic front lip spoiler'),
  ('Rear lip spoiler', 'rear_spoiler', 'rear', null, 'Small rear trunk spoiler'),
  ('Rear wing', 'rear_wing', 'rear', null, 'Generic rear wing'),
  ('Rear diffuser', 'diffuser', 'rear', null, 'Generic rear diffuser'),
  ('Flat floor', 'flat_floor', 'underbody', null, 'Flat underbody paneling'),
  ('Side skirts', 'side_skirt', 'side', null, 'Side skirt aerodynamic elements'),
  ('Hardtop', 'hardtop', 'roof', 'BMW', 'Factory or aftermarket hardtop for convertible')
on conflict (name, component_type, position, manufacturer) do nothing;

insert into public.aero_component_effect (
  aero_component_id,
  generation_body_style_id,
  speed_kmh,
  delta_cd,
  delta_cl,
  delta_front_downforce_kg,
  delta_rear_downforce_kg,
  delta_drag_kg,
  data_source_type,
  confidence_level,
  source_name,
  notes
)
select
  ac.id,
  null,
  160,
  eff.delta_cd,
  null,
  eff.front_df,
  eff.rear_df,
  null,
  'estimated',
  'low',
  'Generic estimation model',
  eff.notes
from public.aero_component ac
join (
  values
    ('Front splitter', 0.0100, 12.00, 0.00, 'Estimated generic effect at 160 km/h'),
    ('Front lip', 0.0050, 6.00, 0.00, 'Estimated generic effect at 160 km/h'),
    ('Rear lip spoiler', 0.0050, 0.00, 8.00, 'Estimated generic effect at 160 km/h'),
    ('Rear wing', 0.0400, 0.00, 35.00, 'Estimated generic effect at 160 km/h'),
    ('Rear diffuser', 0.0150, 0.00, 18.00, 'Estimated generic effect at 160 km/h'),
    ('Flat floor', 0.0050, 6.00, 8.00, 'Estimated generic effect at 160 km/h'),
    ('Side skirts', 0.0030, 2.00, 2.00, 'Estimated generic effect at 160 km/h'),
    ('Hardtop', -0.0100, 0.00, 0.00, 'May reduce turbulence on convertible compared to soft-top/open cabin')
) as eff(component_name, delta_cd, front_df, rear_df, notes)
  on ac.name = eff.component_name
on conflict (aero_component_id, generation_body_style_id, speed_kmh) do nothing;

comment on table public.aero_package is
  'Aerodynamic packages per catalog generation, for OEM/optional/aftermarket setups.';
comment on table public.aero_profile is
  'Base aerodynamic profile per generation body style and optional aero package.';
comment on table public.aero_component is
  'Reusable aerodynamic components such as splitters, spoilers, wings, diffusers and hardtops.';
comment on table public.aero_package_component is
  'Join table between aero packages and reusable aero components.';
comment on table public.aero_component_effect is
  'Estimated or measured aerodynamic delta for a component, generic or generation-body-style-specific.';
