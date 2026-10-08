-- Active aerodynamic component modes for DRS, front lips and future movable aero elements.

alter table public.aero_component
  add column if not exists is_active_aero boolean not null default false;

create table if not exists public.aero_component_mode (
  id uuid primary key default gen_random_uuid(),

  aero_component_id uuid not null references public.aero_component(id) on delete cascade,

  name text not null,
  mode_type text not null,

  angle_deg numeric(6,2) null,
  deployment_percent numeric(6,2) null,

  is_default boolean not null default false,
  description text null,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint aero_component_mode_deployment_check
    check (deployment_percent is null or deployment_percent between 0 and 100),

  constraint aero_component_mode_type_check
    check (mode_type in (
      'high_downforce',
      'balanced',
      'low_drag',
      'drs_off',
      'drs_on',
      'retracted',
      'street',
      'sport',
      'track',
      'custom'
    )),

  constraint aero_component_mode_unique
    unique (aero_component_id, mode_type)
);

create table if not exists public.aero_component_mode_effect (
  id uuid primary key default gen_random_uuid(),

  aero_component_mode_id uuid not null references public.aero_component_mode(id) on delete cascade,

  speed_kmh numeric(6,1) not null default 160,

  delta_cd numeric(7,4) null,
  delta_front_downforce_kg numeric(8,2) null,
  delta_rear_downforce_kg numeric(8,2) null,

  confidence_level text not null default 'low',
  data_source_type text not null default 'estimated',
  calculation_method text null,
  source_name text null,
  notes text null,

  created_at timestamptz not null default now(),

  constraint aero_component_mode_effect_speed_check
    check (speed_kmh > 0),

  constraint aero_component_mode_effect_confidence_check
    check (confidence_level in ('low', 'medium', 'high', 'unknown')),

  constraint aero_component_mode_effect_source_type_check
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

  constraint aero_component_mode_effect_unique
    unique (aero_component_mode_id, speed_kmh)
);

create index if not exists idx_aero_component_active
  on public.aero_component(is_active_aero)
  where is_active_aero;

create index if not exists idx_aero_component_mode_component_id
  on public.aero_component_mode(aero_component_id);

create unique index if not exists idx_aero_component_mode_one_default
  on public.aero_component_mode(aero_component_id)
  where is_default;

create index if not exists idx_aero_component_mode_effect_mode_id
  on public.aero_component_mode_effect(aero_component_mode_id);

drop trigger if exists aero_component_mode_set_updated_at on public.aero_component_mode;
create trigger aero_component_mode_set_updated_at
  before update on public.aero_component_mode
  for each row execute procedure public.set_aero_updated_at();

grant select on table
  public.aero_component_mode,
  public.aero_component_mode_effect
to anon, authenticated;

alter table public.aero_component_mode enable row level security;
alter table public.aero_component_mode_effect enable row level security;

drop policy if exists "aero_component_mode public read" on public.aero_component_mode;
create policy "aero_component_mode public read"
on public.aero_component_mode
for select
to anon, authenticated
using (true);

drop policy if exists "aero_component_mode_effect public read" on public.aero_component_mode_effect;
create policy "aero_component_mode_effect public read"
on public.aero_component_mode_effect
for select
to anon, authenticated
using (true);

insert into public.aero_component (
  name,
  component_type,
  position,
  manufacturer,
  part_number,
  component_origin,
  aero_function_type,
  manufacturer_claimed,
  is_active_aero,
  description
)
values
  ('Active Rear Wing', 'rear_wing', 'rear', 'Garage Solutions', null, 'generic', 'track', false, true, 'Active rear wing with high-downforce, balanced and low-drag DRS modes.'),
  ('Active Front Lip', 'front_lip', 'front', 'Garage Solutions', null, 'generic', 'functional', false, true, 'Deployable front lip with retracted, street, sport and track modes.')
on conflict (name, component_type, position, manufacturer) do update
set
  is_active_aero = true,
  component_origin = excluded.component_origin,
  aero_function_type = excluded.aero_function_type,
  manufacturer_claimed = excluded.manufacturer_claimed,
  description = excluded.description;

with mode_seed as (
  select *
  from (
    values
      ('Active Rear Wing', 'high_downforce', 'High Downforce / DRS OFF', 14.00, 100.00, true, 10, 'Cornering / braking / stability'),
      ('Active Rear Wing', 'balanced', 'Balanced', 8.00, 70.00, false, 20, 'Mixed road / fast bends'),
      ('Active Rear Wing', 'low_drag', 'DRS / Low Drag', 2.00, 100.00, false, 30, 'Straight-line speed / acceleration'),
      ('Active Front Lip', 'retracted', 'Retracted', 0.00, 0.00, true, 10, 'Clearance / low drag'),
      ('Active Front Lip', 'street', 'Street', 4.00, 35.00, false, 20, 'Street stability'),
      ('Active Front Lip', 'sport', 'Sport', 8.00, 70.00, false, 30, 'Sport front grip'),
      ('Active Front Lip', 'track', 'Track', 12.00, 100.00, false, 40, 'Track front axle load')
  ) as t(component_name, mode_type, name, angle_deg, deployment_percent, is_default, sort_order, description)
)
insert into public.aero_component_mode (
  aero_component_id,
  mode_type,
  name,
  angle_deg,
  deployment_percent,
  is_default,
  sort_order,
  description
)
select
  ac.id,
  mode_seed.mode_type,
  mode_seed.name,
  mode_seed.angle_deg,
  mode_seed.deployment_percent,
  mode_seed.is_default,
  mode_seed.sort_order,
  mode_seed.description
from mode_seed
join public.aero_component ac
  on ac.name = mode_seed.component_name
  and ac.manufacturer = 'Garage Solutions'
on conflict (aero_component_id, mode_type) do update
set
  name = excluded.name,
  angle_deg = excluded.angle_deg,
  deployment_percent = excluded.deployment_percent,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  description = excluded.description;

with effect_seed as (
  select *
  from (
    values
      ('Active Rear Wing', 'high_downforce', 160.00, 0.0450, 0.00, 45.00, 'estimated', 'low', 'DRS OFF estimate at 160 km/h; force values scale with speed squared'),
      ('Active Rear Wing', 'balanced', 160.00, 0.0300, 0.00, 32.00, 'estimated', 'low', 'Intermediate rear wing estimate at 160 km/h; force values scale with speed squared'),
      ('Active Rear Wing', 'low_drag', 160.00, 0.0180, 0.00, 18.00, 'estimated', 'low', 'DRS ON estimate at 160 km/h; force values scale with speed squared'),
      ('Active Front Lip', 'retracted', 160.00, 0.0000, 0.00, 0.00, 'estimated', 'low', 'Retracted front lip reference at 160 km/h'),
      ('Active Front Lip', 'street', 160.00, 0.0030, 4.00, 0.00, 'estimated', 'low', 'Street front lip estimate at 160 km/h; force values scale with speed squared'),
      ('Active Front Lip', 'sport', 160.00, 0.0080, 10.00, 0.00, 'estimated', 'low', 'Sport front lip estimate at 160 km/h; force values scale with speed squared'),
      ('Active Front Lip', 'track', 160.00, 0.0150, 18.00, 0.00, 'estimated', 'low', 'Track front lip estimate at 160 km/h; force values scale with speed squared')
  ) as t(component_name, mode_type, speed_kmh, delta_cd, front_kg, rear_kg, data_source_type, confidence_level, calculation_method)
)
insert into public.aero_component_mode_effect (
  aero_component_mode_id,
  speed_kmh,
  delta_cd,
  delta_front_downforce_kg,
  delta_rear_downforce_kg,
  data_source_type,
  confidence_level,
  calculation_method,
  source_name
)
select
  mode.id,
  effect_seed.speed_kmh,
  effect_seed.delta_cd,
  effect_seed.front_kg,
  effect_seed.rear_kg,
  effect_seed.data_source_type,
  effect_seed.confidence_level,
  effect_seed.calculation_method,
  'Garage Solutions active aero baseline'
from effect_seed
join public.aero_component ac
  on ac.name = effect_seed.component_name
  and ac.manufacturer = 'Garage Solutions'
join public.aero_component_mode mode
  on mode.aero_component_id = ac.id
  and mode.mode_type = effect_seed.mode_type
on conflict (aero_component_mode_id, speed_kmh) do update
set
  delta_cd = excluded.delta_cd,
  delta_front_downforce_kg = excluded.delta_front_downforce_kg,
  delta_rear_downforce_kg = excluded.delta_rear_downforce_kg,
  data_source_type = excluded.data_source_type,
  confidence_level = excluded.confidence_level,
  calculation_method = excluded.calculation_method,
  source_name = excluded.source_name;

comment on table public.aero_component_mode is
  'Selectable modes for active aero components such as DRS rear wings and deployable front lips.';

comment on table public.aero_component_mode_effect is
  'Aerodynamic effect for one active aero component mode at a reference speed. Force values are scaled by speed squared in the UI.';
