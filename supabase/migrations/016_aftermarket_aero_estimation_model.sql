-- Aftermarket aerodynamic estimation model.
-- Adds component geometry, known-product metadata and generic low-confidence templates.

alter table public.aero_component
  add column if not exists part_number text null,
  add column if not exists component_origin text not null default 'generic',
  add column if not exists aero_function_type text not null default 'unknown',
  add column if not exists manufacturer_claimed boolean not null default false;

alter table public.aero_component_effect
  add column if not exists delta_cd_min numeric(7,4) null,
  add column if not exists delta_cd_max numeric(7,4) null,
  add column if not exists delta_cda_m2 numeric(8,4) null,
  add column if not exists delta_cda_m2_min numeric(8,4) null,
  add column if not exists delta_cda_m2_max numeric(8,4) null,
  add column if not exists delta_front_downforce_kg_min numeric(8,2) null,
  add column if not exists delta_front_downforce_kg_max numeric(8,2) null,
  add column if not exists delta_rear_downforce_kg_min numeric(8,2) null,
  add column if not exists delta_rear_downforce_kg_max numeric(8,2) null,
  add column if not exists delta_total_downforce_kg_min numeric(8,2) null,
  add column if not exists delta_total_downforce_kg_max numeric(8,2) null,
  add column if not exists delta_drag_percent numeric(6,2) null,
  add column if not exists delta_drag_percent_min numeric(6,2) null,
  add column if not exists delta_drag_percent_max numeric(6,2) null,
  add column if not exists calculation_method text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'aero_component_origin_check'
  ) then
    alter table public.aero_component
      add constraint aero_component_origin_check
      check (component_origin in ('oem', 'aftermarket_known', 'generic', 'custom_user', 'unknown'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'aero_component_function_type_check'
  ) then
    alter table public.aero_component
      add constraint aero_component_function_type_check
      check (aero_function_type in ('cosmetic', 'mild', 'functional', 'track', 'validated', 'unknown'));
  end if;
end $$;

create table if not exists public.aero_component_specification (
  id uuid primary key default gen_random_uuid(),

  aero_component_id uuid not null references public.aero_component(id) on delete cascade,

  width_mm numeric(8,2) null,
  chord_mm numeric(8,2) null,
  protrusion_mm numeric(8,2) null,
  length_mm numeric(8,2) null,
  height_mm numeric(8,2) null,

  angle_deg numeric(6,2) null,
  ramp_angle_deg numeric(6,2) null,
  ground_clearance_mm numeric(8,2) null,
  reference_area_m2 numeric(8,4) null,

  distance_from_front_axle_m numeric(7,3) null,
  distance_from_rear_axle_m numeric(7,3) null,
  height_above_boot_mm numeric(8,2) null,

  airfoil_profile text null,
  material text null,
  mounting_position text null,

  has_endplates boolean null,
  is_adjustable boolean null,
  has_side_fences boolean null,
  sealed_to_undertray boolean null,
  starts_from_flat_floor boolean null,
  has_strakes boolean null,
  strakes_count integer null,
  requires_flat_floor boolean null,

  notes text null,
  created_at timestamptz not null default now(),

  constraint aero_component_specification_positive_check
    check (
      (width_mm is null or width_mm > 0)
      and (chord_mm is null or chord_mm > 0)
      and (protrusion_mm is null or protrusion_mm > 0)
      and (length_mm is null or length_mm > 0)
      and (height_mm is null or height_mm > 0)
      and (reference_area_m2 is null or reference_area_m2 > 0)
      and (strakes_count is null or strakes_count >= 0)
    ),

  unique (aero_component_id)
);

create table if not exists public.generic_aero_template (
  id uuid primary key default gen_random_uuid(),

  component_type text not null,
  size_class text not null,
  usage_class text not null,
  position text not null,

  estimated_delta_cd_min numeric(7,4) null,
  estimated_delta_cd_max numeric(7,4) null,

  estimated_front_downforce_kg_160_min numeric(8,2) null,
  estimated_front_downforce_kg_160_max numeric(8,2) null,

  estimated_rear_downforce_kg_160_min numeric(8,2) null,
  estimated_rear_downforce_kg_160_max numeric(8,2) null,

  drag_impact_percent_min numeric(6,2) null,
  drag_impact_percent_max numeric(6,2) null,

  confidence_level text not null default 'low',
  notes text null,

  created_at timestamptz not null default now(),

  constraint generic_aero_template_size_check
    check (size_class in ('small', 'medium', 'large')),
  constraint generic_aero_template_usage_check
    check (usage_class in ('cosmetic', 'street', 'sport', 'track')),
  constraint generic_aero_template_confidence_check
    check (confidence_level in ('low', 'medium', 'high', 'unknown')),

  unique (component_type, size_class, usage_class, position)
);

create index if not exists idx_aero_component_origin
  on public.aero_component(component_origin);

create index if not exists idx_aero_component_specification_component_id
  on public.aero_component_specification(aero_component_id);

create index if not exists idx_generic_aero_template_lookup
  on public.generic_aero_template(component_type, size_class, usage_class, position);

grant select on table
  public.aero_component_specification,
  public.generic_aero_template
to anon, authenticated;

alter table public.aero_component_specification enable row level security;
alter table public.generic_aero_template enable row level security;

drop policy if exists "aero_component_specification public read" on public.aero_component_specification;
create policy "aero_component_specification public read"
on public.aero_component_specification
for select
to anon, authenticated
using (true);

drop policy if exists "generic_aero_template public read" on public.generic_aero_template;
create policy "generic_aero_template public read"
on public.generic_aero_template
for select
to anon, authenticated
using (true);

insert into public.generic_aero_template (
  component_type,
  size_class,
  usage_class,
  position,
  estimated_delta_cd_min,
  estimated_delta_cd_max,
  estimated_front_downforce_kg_160_min,
  estimated_front_downforce_kg_160_max,
  estimated_rear_downforce_kg_160_min,
  estimated_rear_downforce_kg_160_max,
  drag_impact_percent_min,
  drag_impact_percent_max,
  confidence_level,
  notes
)
values
  ('front_splitter', 'medium', 'sport', 'front', 0.005, 0.015, 6, 15, 0, 2, 1, 4, 'low', 'Generic medium splitter estimate. Strongly affected by protrusion, ride height and sealing.'),
  ('rear_wing', 'medium', 'sport', 'rear', 0.020, 0.050, 0, 2, 20, 45, 5, 15, 'low', 'Generic rear wing estimate. Strongly affected by wing profile, chord, angle and endplates.'),
  ('diffuser', 'medium', 'sport', 'rear', 0.000, 0.020, 0, 2, 5, 20, 0, 6, 'low', 'Generic diffuser estimate. Meaningful only if underbody airflow is reasonably managed.'),
  ('flat_floor', 'medium', 'sport', 'underbody', -0.010, 0.005, 4, 10, 6, 15, -3, 2, 'low', 'Generic flat floor estimate. Can reduce drag and improve underbody stability.'),
  ('rear_spoiler', 'small', 'street', 'rear', 0.000, 0.010, 0, 1, 3, 10, 0, 3, 'low', 'Generic rear lip spoiler estimate. Usually mild effect.'),
  ('side_skirt', 'medium', 'street', 'side', 0.000, 0.008, 0, 3, 0, 3, 0, 3, 'low', 'Generic side skirt estimate. Mainly helps control side airflow and underbody leakage.'),
  ('other', 'small', 'cosmetic', 'unknown', 0.000, 0.002, 0, 1, 0, 1, 0, 1, 'low', 'Cosmetic component estimate. Aerodynamic effect is likely negligible.')
on conflict (component_type, size_class, usage_class, position) do update
set
  estimated_delta_cd_min = excluded.estimated_delta_cd_min,
  estimated_delta_cd_max = excluded.estimated_delta_cd_max,
  estimated_front_downforce_kg_160_min = excluded.estimated_front_downforce_kg_160_min,
  estimated_front_downforce_kg_160_max = excluded.estimated_front_downforce_kg_160_max,
  estimated_rear_downforce_kg_160_min = excluded.estimated_rear_downforce_kg_160_min,
  estimated_rear_downforce_kg_160_max = excluded.estimated_rear_downforce_kg_160_max,
  drag_impact_percent_min = excluded.drag_impact_percent_min,
  drag_impact_percent_max = excluded.drag_impact_percent_max,
  confidence_level = excluded.confidence_level,
  notes = excluded.notes;

insert into public.aero_component (
  name,
  component_type,
  position,
  manufacturer,
  part_number,
  component_origin,
  aero_function_type,
  manufacturer_claimed,
  description
)
values
  ('Maxton Design E46 front splitter', 'front_splitter', 'front', 'Maxton Design', null, 'aftermarket_known', 'functional', false, 'Known aftermarket E46 front splitter entry with estimated geometry.'),
  ('AC Schnitzer E46 rear spoiler', 'rear_spoiler', 'rear', 'AC Schnitzer', null, 'aftermarket_known', 'mild', false, 'Known aftermarket E46 trunk spoiler entry with estimated geometry.'),
  ('APR Performance universal rear wing medium', 'rear_wing', 'rear', 'APR Performance', null, 'aftermarket_known', 'track', false, 'Known aftermarket universal wing entry using representative medium geometry.')
on conflict (name, component_type, position, manufacturer) do update
set
  part_number = excluded.part_number,
  component_origin = excluded.component_origin,
  aero_function_type = excluded.aero_function_type,
  manufacturer_claimed = excluded.manufacturer_claimed,
  description = excluded.description;

with specs as (
  select *
  from (
    values
      ('Maxton Design E46 front splitter', 1500.00, null, 110.00, null, null, null, null, 90.00, null, null, null, null, null, 'ABS', 'front bumper lower edge', false, null, true, false, false, false, null, false, 'Representative dimensions for low-confidence internal aero estimate.'),
      ('AC Schnitzer E46 rear spoiler', 1180.00, 110.00, null, null, 45.00, 6.00, null, null, 0.1298, null, null, null, null, 'ABS / composite', 'trunk lid', false, false, false, false, false, false, null, false, 'Mild lip spoiler geometry estimate.'),
      ('APR Performance universal rear wing medium', 1400.00, 250.00, null, null, 220.00, 10.00, null, null, 0.3500, null, null, 220.00, 'generic dual element style', 'carbon fiber', 'trunk / chassis mount', true, true, false, false, false, false, null, false, 'Representative medium wing geometry for calculator calibration.')
  ) as t(
    component_name,
    width_mm,
    chord_mm,
    protrusion_mm,
    length_mm,
    height_mm,
    angle_deg,
    ramp_angle_deg,
    ground_clearance_mm,
    reference_area_m2,
    distance_from_front_axle_m,
    distance_from_rear_axle_m,
    height_above_boot_mm,
    airfoil_profile,
    material,
    mounting_position,
    has_endplates,
    is_adjustable,
    has_side_fences,
    sealed_to_undertray,
    starts_from_flat_floor,
    has_strakes,
    strakes_count,
    requires_flat_floor,
    notes
  )
)
insert into public.aero_component_specification (
  aero_component_id,
  width_mm,
  chord_mm,
  protrusion_mm,
  length_mm,
  height_mm,
  angle_deg,
  ramp_angle_deg,
  ground_clearance_mm,
  reference_area_m2,
  distance_from_front_axle_m,
  distance_from_rear_axle_m,
  height_above_boot_mm,
  airfoil_profile,
  material,
  mounting_position,
  has_endplates,
  is_adjustable,
  has_side_fences,
  sealed_to_undertray,
  starts_from_flat_floor,
  has_strakes,
  strakes_count,
  requires_flat_floor,
  notes
)
select
  ac.id,
  specs.width_mm,
  specs.chord_mm,
  specs.protrusion_mm,
  specs.length_mm,
  specs.height_mm,
  specs.angle_deg,
  specs.ramp_angle_deg,
  specs.ground_clearance_mm,
  specs.reference_area_m2,
  specs.distance_from_front_axle_m,
  specs.distance_from_rear_axle_m,
  specs.height_above_boot_mm,
  specs.airfoil_profile,
  specs.material,
  specs.mounting_position,
  specs.has_endplates,
  specs.is_adjustable,
  specs.has_side_fences,
  specs.sealed_to_undertray,
  specs.starts_from_flat_floor,
  specs.has_strakes,
  specs.strakes_count,
  specs.requires_flat_floor,
  specs.notes
from specs
join public.aero_component ac on ac.name = specs.component_name
on conflict (aero_component_id) do update
set
  width_mm = excluded.width_mm,
  chord_mm = excluded.chord_mm,
  protrusion_mm = excluded.protrusion_mm,
  length_mm = excluded.length_mm,
  height_mm = excluded.height_mm,
  angle_deg = excluded.angle_deg,
  ramp_angle_deg = excluded.ramp_angle_deg,
  ground_clearance_mm = excluded.ground_clearance_mm,
  reference_area_m2 = excluded.reference_area_m2,
  distance_from_front_axle_m = excluded.distance_from_front_axle_m,
  distance_from_rear_axle_m = excluded.distance_from_rear_axle_m,
  height_above_boot_mm = excluded.height_above_boot_mm,
  airfoil_profile = excluded.airfoil_profile,
  material = excluded.material,
  mounting_position = excluded.mounting_position,
  has_endplates = excluded.has_endplates,
  is_adjustable = excluded.is_adjustable,
  has_side_fences = excluded.has_side_fences,
  sealed_to_undertray = excluded.sealed_to_undertray,
  starts_from_flat_floor = excluded.starts_from_flat_floor,
  has_strakes = excluded.has_strakes,
  strakes_count = excluded.strakes_count,
  requires_flat_floor = excluded.requires_flat_floor,
  notes = excluded.notes;

with known_effects as (
  select *
  from (
    values
      ('Maxton Design E46 front splitter', 0.0060, 0.0140, 7.00, 14.00, 0.00, 2.00, 1.00, 4.00, 'estimated', 'low', 'Internal parametric estimate from stored splitter geometry', 'Stored geometry low-confidence estimate at 160 km/h.'),
      ('AC Schnitzer E46 rear spoiler', 0.0000, 0.0080, 0.00, 1.00, 4.00, 9.00, 0.00, 3.00, 'estimated', 'low', 'Internal mild rear spoiler estimate from stored geometry', 'Mild trunk spoiler effect, not manufacturer-validated.'),
      ('APR Performance universal rear wing medium', 0.0200, 0.0500, 0.00, 2.00, 28.00, 42.00, 5.00, 15.00, 'estimated', 'low', 'Wing equation with stored representative geometry and estimated Cl', 'Representative wing estimate; true value depends on airfoil and mounting.')
  ) as t(
    component_name,
    delta_cd_min,
    delta_cd_max,
    front_min,
    front_max,
    rear_min,
    rear_max,
    drag_min,
    drag_max,
    data_source_type,
    confidence_level,
    calculation_method,
    notes
  )
)
insert into public.aero_component_effect (
  aero_component_id,
  generation_body_style_id,
  speed_kmh,
  delta_cd,
  delta_cd_min,
  delta_cd_max,
  delta_front_downforce_kg,
  delta_front_downforce_kg_min,
  delta_front_downforce_kg_max,
  delta_rear_downforce_kg,
  delta_rear_downforce_kg_min,
  delta_rear_downforce_kg_max,
  delta_drag_percent,
  delta_drag_percent_min,
  delta_drag_percent_max,
  data_source_type,
  confidence_level,
  calculation_method,
  source_name,
  notes
)
select
  ac.id,
  null,
  160,
  round(((ke.delta_cd_min + ke.delta_cd_max) / 2)::numeric, 4),
  ke.delta_cd_min,
  ke.delta_cd_max,
  round(((ke.front_min + ke.front_max) / 2)::numeric, 2),
  ke.front_min,
  ke.front_max,
  round(((ke.rear_min + ke.rear_max) / 2)::numeric, 2),
  ke.rear_min,
  ke.rear_max,
  round(((ke.drag_min + ke.drag_max) / 2)::numeric, 2),
  ke.drag_min,
  ke.drag_max,
  ke.data_source_type,
  ke.confidence_level,
  ke.calculation_method,
  'Garage Solutions internal estimate',
  ke.notes
from known_effects ke
join public.aero_component ac on ac.name = ke.component_name
on conflict (aero_component_id, generation_body_style_id, speed_kmh) do update
set
  delta_cd = excluded.delta_cd,
  delta_cd_min = excluded.delta_cd_min,
  delta_cd_max = excluded.delta_cd_max,
  delta_front_downforce_kg = excluded.delta_front_downforce_kg,
  delta_front_downforce_kg_min = excluded.delta_front_downforce_kg_min,
  delta_front_downforce_kg_max = excluded.delta_front_downforce_kg_max,
  delta_rear_downforce_kg = excluded.delta_rear_downforce_kg,
  delta_rear_downforce_kg_min = excluded.delta_rear_downforce_kg_min,
  delta_rear_downforce_kg_max = excluded.delta_rear_downforce_kg_max,
  delta_drag_percent = excluded.delta_drag_percent,
  delta_drag_percent_min = excluded.delta_drag_percent_min,
  delta_drag_percent_max = excluded.delta_drag_percent_max,
  data_source_type = excluded.data_source_type,
  confidence_level = excluded.confidence_level,
  calculation_method = excluded.calculation_method,
  source_name = excluded.source_name,
  notes = excluded.notes;

comment on table public.aero_component_specification is
  'Geometry and metadata used to estimate or validate aftermarket aerodynamic component effects.';

comment on table public.generic_aero_template is
  'Low-confidence generic aerodynamic effect ranges by component type, size and usage.';
