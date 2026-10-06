-- Stock aerodynamic profiles for the rest of the BMW catalog.
-- Values are a mix of public specifications and conservative estimates. Estimated rows are marked.

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
join public.brands b on b.id = m.brand_id
cross join (
  values
    ('Stock', 'BMW', 'OEM', 'Factory standard bodywork'),
    ('Aftermarket Custom', null, 'CUSTOM', 'User-defined aerodynamic setup')
) as pkg(name, manufacturer, package_type, description)
where lower(b.slug) = 'bmw'
on conflict (generation_id, name) do nothing;

with source_values as (
  select *
  from (
    values
      ('bmw-02', 'E10', 'sedan', 0.4400, 1.850, 'calculated', 'low', 'Autoevolution / dimension estimate', 'https://www.autoevolution.com/cars/bmw-2002-1968.html', true, 'Cd published for BMW 2002; frontal area estimated from period dimensions.'),
      ('3-series', 'E21', 'sedan', 0.4700, 1.866, 'calculated', 'low', 'Automobile-Catalog / dimension estimate', 'https://www.automobile-catalog.com/car/1976/169145/bmw_320i_5-speed_sport_gearbox.html', true, 'Cd claimed for E21 320i; frontal area estimated from width x height x 0.84.'),
      ('3-series', 'E30', 'sedan', 0.3700, 1.860, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-318i-170885', false, 'E30 318i/325e public aerodynamic spec.'),
      ('3-series', 'E30', 'coupe', 0.3700, 1.860, 'calculated', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-318i-170885', true, 'Mapped from E30 two-door saloon dimensions/specification to catalog coupe body style.'),
      ('3-series', 'E30', 'touring', 0.3800, 1.900, 'estimated', 'low', 'Comparable E30 body-style estimate', 'https://www.carfolio.com/bmw-318i-170885', true, 'Estimated from E30 saloon Cd with wagon rear-body penalty.'),
      ('3-series', 'E30', 'convertible', 0.4000, 1.890, 'estimated', 'low', 'Comparable E30 convertible estimate', 'https://www.carfolio.com/bmw-m3-convertible-527417', true, 'Estimated stock cabrio value using E30/M3 convertible public dimensions as reference.'),
      ('3-series', 'E36', 'sedan', 0.3200, 1.940, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-320i-56342', false, 'E36 saloon public aerodynamic spec.'),
      ('3-series', 'E36', 'coupe', 0.3000, 1.880, 'calculated', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-325i-se-coupe-56320', true, 'Cd from E36 coupe public spec; frontal area estimated from E36 coupe/M3 dimensions.'),
      ('3-series', 'E36', 'convertible', 0.3600, 1.910, 'calculated', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-m3-evolution-cabrio-153472', true, 'E36 cabrio Cd from public spec; area from M3 Evolution Cabrio reference.'),
      ('3-series', 'E36', 'touring', 0.3300, 1.960, 'estimated', 'low', 'Comparable E36 body-style estimate', 'https://www.carfolio.com/bmw-320i-56342', true, 'Estimated from E36 saloon with wagon rear-body penalty.'),
      ('3-series', 'E36', 'compact', 0.3100, 1.950, 'published_spec', 'medium', 'EcoModder drag coefficient list', 'https://ecomodder.com/wiki/Vehicle_Coefficient_of_Drag_List', false, 'Compact entry lists Cd 0.31 and frontal area about 20.99 sq ft.'),
      ('3-series', 'E46', 'sedan', 0.2900, 2.060, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-330i-74261', false, 'E46 330i public aerodynamic spec.'),
      ('3-series', 'E46', 'coupe', 0.3000, 1.980, 'published_spec', 'medium', 'Public E46 coupe reference data', 'https://www.press.bmwgroup.com/usa/article/attachment/T0022127EN_US/41385', false, 'Representative E46 coupe stock profile; M3 values are separate package data.'),
      ('3-series', 'E46', 'convertible', 0.3500, 1.980, 'published_spec', 'medium', 'BMW Group technical specifications', 'https://www.press.bmwgroup.com/usa/article/attachment/T0022127EN_US/41385', false, 'Representative E46 convertible public/BMW technical spec.'),
      ('3-series', 'E46', 'touring', 0.3200, 2.060, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-325xi-touring-280852', false, 'E46 Touring public aerodynamic spec.'),
      ('3-series', 'E46', 'compact', 0.3000, 2.070, 'published_spec', 'medium', 'Public E46 compact reference data', 'https://ecomodder.com/wiki/Vehicle_Coefficient_of_Drag_List', false, 'Representative compact stock aerodynamic profile.'),
      ('3-series', 'E90', 'sedan', 0.2600, 2.170, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-320i-180422', false, 'E90 sedan public aerodynamic spec.'),
      ('3-series', 'E90', 'coupe', 0.2700, 2.080, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-325i-coupe-184228', false, 'E92 coupe public aerodynamic spec mapped to catalog E90 coupe body style.'),
      ('3-series', 'E90', 'touring', 0.2700, 2.170, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-320d-efficientdynamics-touring-229097', false, 'E91 Touring public aerodynamic spec mapped to catalog E90 touring body style.'),
      ('3-series', 'E90', 'convertible', 0.2900, 2.080, 'published_spec', 'medium', 'Autostatistics public specifications', 'https://autostatistics.net/bmw/3-series/e93/325i/manual', false, 'E93 convertible public aerodynamic spec mapped to catalog E90 convertible body style.'),
      ('5-series', 'E12', 'sedan', 0.4400, 2.020, 'calculated', 'low', 'BMW 5 Series E12 public reference', 'https://en.wikipedia.org/wiki/BMW_5_Series_%28E12%29', true, 'Cd published for E12; frontal area estimated from body dimensions.'),
      ('5-series', 'E28', 'sedan', 0.3900, 2.030, 'calculated', 'medium', 'Autostatistics public specifications', 'https://autostatistics.net/bmw/5-series/e28/520i', true, 'Cd public spec; frontal area estimated from E28 dimensions.'),
      ('5-series', 'E34', 'sedan', 0.3000, 2.080, 'calculated', 'medium', 'List of automobile drag coefficients', 'https://en.wikipedia.org/wiki/List_of_automobile_drag_coefficients', true, 'Cd public list; frontal area estimated from E34 dimensions.'),
      ('5-series', 'E34', 'touring', 0.3100, 2.100, 'estimated', 'low', 'Comparable E34 body-style estimate', 'https://en.wikipedia.org/wiki/List_of_automobile_drag_coefficients', true, 'Estimated from E34 saloon Cd with wagon rear-body penalty.'),
      ('5-series', 'E39', 'sedan', 0.2800, 2.170, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-520i-automatic-96316', false, 'E39 520i public aerodynamic spec.'),
      ('5-series', 'E39', 'touring', 0.3100, 2.170, 'published_spec', 'medium', 'Motorsporlari public specifications', 'https://eng.motorsporlari.net/car/tech_spec.asp?make=BMW&specID=18876', false, 'E39 530i Touring public aerodynamic spec.'),
      ('5-series', 'E60', 'sedan', 0.2700, 2.260, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-520d-151371', false, 'E60 520d public aerodynamic spec.'),
      ('5-series', 'E60', 'touring', 0.2800, 2.260, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-520i-touring-automatic-160985', false, 'E61 Touring public aerodynamic spec.'),
      ('6-series', 'E24', 'coupe', 0.4000, 2.000, 'calculated', 'medium', 'Carspector / Auto-Data public specifications', 'https://carspector.com/car/bmw/006860/', true, 'Cd public spec; frontal area listed as estimated by source.'),
      ('6-series', 'E63', 'coupe', 0.3000, 2.150, 'published_spec', 'medium', 'Autostatistics public specifications', 'https://autostatistics.net/bmw/6-series/e63/630i/coupe/manual', false, 'E63 coupe public aerodynamic spec.'),
      ('6-series', 'E63', 'convertible', 0.3100, 2.150, 'published_spec', 'medium', 'Autostatistics public specifications', 'https://autostatistics.net/bmw/6-series/e64/630i/manual', false, 'E64 convertible public aerodynamic spec mapped to catalog E63 convertible body style.'),
      ('7-series', 'E23', 'sedan', 0.4000, 2.160, 'calculated', 'medium', 'Auto-Data public specifications', 'https://www.auto-data.net/en/bmw-7-series-e23-facelift-1983-728i-184hp-28115', true, 'Cd public spec; frontal area estimated from width x height x 0.84.'),
      ('7-series', 'E32', 'sedan', 0.3200, 2.090, 'published_spec', 'medium', 'Carbaze public specifications', 'https://carbaze.com/car-3143/bmw-735i-automatic-e32/specifications', false, 'E32 735i public aerodynamic spec.'),
      ('7-series', 'E32', 'long-wheelbase', 0.3200, 2.100, 'estimated', 'low', 'Comparable E32 body-style estimate', 'https://carbaze.com/car-3143/bmw-735i-automatic-e32/specifications', true, 'Estimated from E32 sedan and long-wheelbase dimensions.'),
      ('7-series', 'E38', 'sedan', 0.3000, 2.210, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-728i-automatic-79013', false, 'E38 728i public aerodynamic spec.'),
      ('7-series', 'E38', 'long-wheelbase', 0.3200, 2.210, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-750il-29018', false, 'E38 750iL public aerodynamic spec.'),
      ('7-series', 'E65', 'sedan', 0.2900, 2.380, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-735i-82676', false, 'E65 735i public aerodynamic spec.'),
      ('7-series', 'E65', 'long-wheelbase', 0.2900, 2.400, 'estimated', 'low', 'Comparable E65 body-style estimate', 'https://www.carfolio.com/bmw-735i-82676', true, 'Estimated from E65 sedan and long-wheelbase dimensions.'),
      ('8-series', 'E31', 'coupe', 0.2900, 2.070, 'published_spec', 'medium', 'E31.net air resistance reference', 'https://www.e31.de/resistance.html', false, 'E31 8 Series reference gives Cd 0.29 and frontal area 2.07 m2.'),
      ('z1', 'E30', 'roadster', 0.3600, 1.800, 'calculated', 'low', 'BMW Z1 public reference', 'https://en.wikipedia.org/wiki/BMW_Z1', true, 'Cd with top up from public reference; frontal area estimated from dimensions.'),
      ('z3', 'E36', 'roadster', 0.3800, 1.900, 'calculated', 'low', 'BMW Specs public reference', 'https://bmw-specs.com/z3/1995-2002/body/specs/', true, 'Cd public reference; frontal area estimated from Z3 dimensions.'),
      ('z3', 'E36', 'coupe', 0.4000, 1.950, 'published_spec', 'medium', 'Carspector public specifications', 'https://carspector.com/car/bmw/025546/?u=uk', false, 'Z3 Coupe public aerodynamic spec.'),
      ('z4', 'E85', 'roadster', 0.3500, 1.910, 'published_spec', 'medium', 'Carinfo / public Z4 specification', 'https://www.carinf.com/en/7150712446.html', false, 'Z4 roadster public aerodynamic spec.'),
      ('z4', 'E86', 'coupe', 0.3500, 1.860, 'calculated', 'medium', 'UltimateSpecs / dimension estimate', 'https://www.ultimatespecs.com/car-specs/BMW/5176/BMW-Z4-Coupe-%28E86%29-M.html', true, 'Cd public spec; frontal area estimated from E86 dimensions.'),
      ('z8', 'E52', 'roadster', 0.3900, 1.980, 'published_spec', 'high', 'BMW Group technical specifications', 'https://www.press.bmwgroup.com/usa/article/attachment/T0021940EN_US/41233', false, 'BMW technical spec gives Cd 0.39 with hardtop; public references list frontal area 1.98 m2.'),
      ('m1', 'E26', 'coupe', 0.4000, 1.750, 'calculated', 'medium', 'Carinfo / public M1 specification', 'https://www.carinf.com/en/c6e045393.html', true, 'Cd public spec; frontal area estimated from M1 dimensions.'),
      ('new-six-sedan', 'E3', 'sedan', 0.4300, 2.130, 'calculated', 'low', 'Automobile-Catalog public specifications', 'https://www.automobile-catalog.com/car/1969/77510/bmw_2500_automatic.html', true, 'Cd estimated by source; frontal area estimated from E3 dimensions.'),
      ('new-six-sedan', 'E3', 'long-wheelbase', 0.4300, 2.130, 'estimated', 'low', 'Comparable E3 body-style estimate', 'https://www.automobile-catalog.com/car/1974/78050/bmw_3_0_s_automatic.html', true, 'Estimated from E3 sedan/longer-body public dimensions.'),
      ('new-six-coupe', 'E9', 'coupe', 0.4000, 2.010, 'calculated', 'low', 'Automobile-Catalog public specifications', 'https://www.automobile-catalog.com/car/1972/78260/bmw_3_0_csl.html', true, 'Cd estimated by source; frontal area listed by public reference.'),
      ('new-class', 'NK', 'sedan', 0.4500, 2.050, 'estimated', 'low', 'Comparable Neue Klasse estimate', 'https://autostatistics.net/bmw/new-class/2000/c/coupe', true, 'Estimated from Neue Klasse period dimensions and coupe Cd estimate.'),
      ('new-class-coupe', 'NK Coupe', 'coupe', 0.4500, 2.010, 'calculated', 'low', 'Automobile-Catalog public specifications', 'https://www.automobile-catalog.com/car/1969/77465/bmw_2000_cs.html', true, 'Cd estimated by source; frontal area from public dimensions.'),
      ('700-ls', '700 LS', 'sedan', 0.4500, 1.690, 'estimated', 'low', 'BMW 700 public dimensions', 'https://eng.motorsporlari.net/car/tech_spec.asp?make=BMW&specID=13224', true, 'Estimated from period small-saloon dimensions; no reliable stock Cd found.'),
      ('1-series', 'E87', 'hatchback-5dr', 0.3000, 2.090, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-120i-152471', false, 'E87 120i public aerodynamic spec.'),
      ('1-series', 'E87', 'hatchback-3dr', 0.3000, 2.090, 'calculated', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-120i-152471', true, 'Mapped from E87 5-door hatchback spec to 3-door hatchback.'),
      ('1-series', 'E87', 'coupe', 0.3200, 2.100, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-135i-coupe-160006', false, 'E82 coupe public aerodynamic spec mapped to catalog E87 coupe body style.'),
      ('1-series', 'E87', 'convertible', 0.3200, 2.090, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-120i-cabrio-162162', false, 'E88 convertible public aerodynamic spec mapped to catalog E87 convertible body style.'),
      ('x1', 'E84', 'sav', 0.3200, 2.340, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x1-sdrive20d-automatic-216062', false, 'E84 X1 public aerodynamic spec.'),
      ('x1', 'E84', 'suv', 0.3200, 2.340, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x1-sdrive20d-automatic-216062', false, 'Alias profile for catalog SUV body style.'),
      ('x3', 'E83', 'sav', 0.3500, 2.500, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x3-3.0sd-145673', false, 'E83 X3 public aerodynamic spec.'),
      ('x3', 'E83', 'suv', 0.3500, 2.500, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x3-3.0sd-145673', false, 'Alias profile for catalog SUV body style.'),
      ('x5', 'E53', 'sav', 0.3500, 2.700, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x5-3.0i-automatic-86273', false, 'E53 X5 3.0i public aerodynamic spec.'),
      ('x5', 'E53', 'suv', 0.3500, 2.700, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x5-3.0i-automatic-86273', false, 'Alias profile for catalog SUV body style.'),
      ('x5', 'E70', 'sav', 0.3400, 2.870, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x5-3.0d-184657', false, 'E70 X5 3.0d public aerodynamic spec.'),
      ('x5', 'E70', 'suv', 0.3400, 2.870, 'published_spec', 'medium', 'Carfolio public specifications', 'https://www.carfolio.com/bmw-x5-3.0d-184657', false, 'Alias profile for catalog SUV body style.'),
      ('x6', 'E71', 'sac', 0.3300, 2.820, 'published_spec', 'medium', 'Autostatistics public specifications', 'https://autostatistics.net/bmw/x6/e71/30d/8-speed-automatic', false, 'E71 X6 30d public aerodynamic spec.'),
      ('507', '507', 'roadster', 0.4200, 1.750, 'estimated', 'low', 'Comparable 1950s roadster estimate', 'https://en.wikipedia.org/wiki/BMW_507', true, 'Estimated from BMW 507 dimensions and comparable 1950s roadster aero data.')
  ) as t(
    model_slug,
    generation_code,
    body_style_code,
    drag_coefficient_cd,
    frontal_area_m2,
    data_source_type,
    confidence_level,
    source_name,
    source_url,
    is_estimated,
    notes
  )
),
fallback_values as (
  select *
  from (
    values
      ('sedan', 0.3500, 2.100),
      ('coupe', 0.3400, 2.000),
      ('convertible', 0.3800, 2.000),
      ('touring', 0.3500, 2.160),
      ('compact', 0.3200, 2.000),
      ('hatchback', 0.3200, 2.100),
      ('hatchback-3dr', 0.3200, 2.100),
      ('hatchback-5dr', 0.3200, 2.100),
      ('roadster', 0.3900, 1.900),
      ('long-wheelbase', 0.3300, 2.300),
      ('sav', 0.3500, 2.650),
      ('suv', 0.3500, 2.650),
      ('sac', 0.3400, 2.820),
      ('sports-activity-coupe', 0.3400, 2.820)
  ) as t(body_style_code, drag_coefficient_cd, frontal_area_m2)
),
stock_targets as (
  select
    gbs.id as generation_body_style_id,
    ap.id as aero_package_id,
    case
      when lower(m.name) like 'bmw%' then m.name
      else 'BMW ' || m.name
    end as model_display_name,
    g.code as generation_code,
    bs.code as body_style_code,
    coalesce(sv.drag_coefficient_cd, fv.drag_coefficient_cd) as drag_coefficient_cd,
    coalesce(sv.frontal_area_m2, fv.frontal_area_m2) as frontal_area_m2,
    coalesce(sv.data_source_type, 'estimated') as data_source_type,
    coalesce(sv.confidence_level, 'low') as confidence_level,
    coalesce(sv.source_name, 'Generic BMW body-style estimate') as source_name,
    coalesce(sv.source_url, 'https://ecomodder.com/wiki/Vehicle_Coefficient_of_Drag_List') as source_url,
    coalesce(sv.is_estimated, true) as is_estimated,
    coalesce(sv.notes, 'Fallback estimate by body style for an uncovered BMW catalog row.') as notes
  from public.generation_body_styles gbs
  join public.generations g on g.id = gbs.generation_id
  join public.models m on m.id = g.model_id
  join public.brands b on b.id = m.brand_id
  join public.body_styles bs on bs.id = gbs.body_style_id
  join public.aero_package ap
    on ap.generation_id = g.id
    and ap.name = 'Stock'
  left join source_values sv
    on lower(sv.model_slug) = lower(m.slug)
    and lower(sv.generation_code) = lower(g.code)
    and lower(sv.body_style_code) = lower(bs.code)
  left join fallback_values fv
    on lower(fv.body_style_code) = lower(bs.code)
  where lower(b.slug) = 'bmw'
    and coalesce(sv.drag_coefficient_cd, fv.drag_coefficient_cd) is not null
    and not exists (
      select 1
      from public.aero_profile existing
      where existing.generation_body_style_id = gbs.id
        and existing.is_default = true
    )
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
  st.generation_body_style_id,
  st.aero_package_id,
  concat_ws(
    ' ',
    st.model_display_name,
    case
      when lower(st.generation_code) = lower(replace(st.model_display_name, 'BMW ', '')) then null
      else st.generation_code
    end,
    case
      when lower(st.body_style_code) = 'suv' then 'SUV'
      when lower(st.body_style_code) = 'sav' then 'SAV'
      when lower(st.body_style_code) = 'sac' then 'SAC'
      else initcap(replace(st.body_style_code, '-', ' '))
    end,
    'Stock'
  ),
  st.drag_coefficient_cd,
  st.frontal_area_m2,
  round((st.drag_coefficient_cd * st.frontal_area_m2)::numeric, 3),
  null,
  null,
  null,
  null,
  null,
  null,
  st.data_source_type,
  st.confidence_level,
  case
    when st.is_estimated then 'Cd and/or frontal_area_m2 from public specifications plus conservative body-style estimation; CdA = Cd * frontal_area_m2'
    else 'CdA = Cd * frontal_area_m2'
  end,
  st.source_name,
  st.source_url,
  st.is_estimated,
  true,
  st.notes
from stock_targets st
on conflict (generation_body_style_id, aero_package_id, name) do nothing;

comment on table public.aero_profile is
  'Base aerodynamic profile per generation body style and optional aero package. Stock BMW rows may include public specs or low-confidence estimates marked by is_estimated.';
