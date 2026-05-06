-- Transmission products seed + fitment support (BMW E46 petrol)
-- Safe to run multiple times in Supabase SQL Editor.

begin;

-- 1) Existing product structure + new fitment field.
create table if not exists public.products (
  id text primary key,
  category text not null,
  subcategory text not null,
  brand text not null,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  fitment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists fitment jsonb not null default '{}'::jsonb;

-- Keep category browsing + fitment filtering fast.
create index if not exists idx_products_category_subcategory
  on public.products (category, subcategory);

create index if not exists idx_products_fitment_chassis_engine
  on public.products ((fitment->>'chassis'), (fitment->>'engine_type'));

-- 2) Normalize historical brand aliases to requested naming.
update public.products
set brand = case
  when lower(brand) in ('cybul', 'cybul solution', 'cybul solutions') then 'Cybul Solutions'
  when lower(brand) in ('tech53', 'tech-53') then 'Tech-53'
  when lower(brand) in ('racing diffs', 'racingdiffs') then 'RacingDiffs'
  when lower(brand) in ('xtreme', 'xtreme clutch') then 'Xtreme Clutch'
  when lower(brand) in ('performance clutches', 'performance clutch') then 'Performance Clutches'
  when lower(brand) in ('ttv', 'ttv racing') then 'TTV Racing'
  when lower(brand) in ('kaaz') then 'Kaaz'
  when lower(brand) in ('dkm') then 'DKM'
  else brand
end
where category in ('clutch', 'differential', 'mounts');

-- 3) Remove potential duplicates for transmission groups (keep newest by updated_at).
with ranked as (
  select
    ctid,
    row_number() over (
      partition by
        lower(trim(category)),
        lower(trim(subcategory)),
        lower(trim(brand)),
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      order by updated_at desc nulls last, created_at desc nulls last
    ) as rn
  from public.products
  where category in ('clutch', 'differential', 'mounts')
)
delete from public.products p
using ranked r
where p.ctid = r.ctid
  and r.rn > 1;

-- 4) Shared BMW E46 petrol fitment payload.
with fit as (
  select
    jsonb_build_object(
      'brand', 'BMW',
      'chassis', 'E46',
      'years', jsonb_build_array(1998, 2006),
      'engine_type', 'petrol',
      'models', jsonb_build_array('320i', '323i', '325i', '328i', '330i', 'M3')
    ) as f
)
insert into public.products (id, category, subcategory, brand, name, price, fitment, updated_at)
select * from (
  values
    ('tx-clutch-kit-performance-clutches-stage1-smf', 'clutch', 'Clutch Kits', 'Performance Clutches', 'Stage 1 Street HD Clutch & Single Mass Flywheel Kit', 855.99),
    ('tx-clutch-kit-dkm-stage1', 'clutch', 'Clutch Kits', 'DKM', 'Stage 1 Uprated Clutch + Flywheel Kit', 853.99),
    ('tx-clutch-kit-dkm-stage2', 'clutch', 'Clutch Kits', 'DKM', 'Stage 2 Uprated Clutch + Flywheel Kit', 1138.99),
    ('tx-clutch-kit-dkm-stage3-twin', 'clutch', 'Clutch Kits', 'DKM', 'Stage 3 Uprated Twin Clutch + Flywheel', 1936.99),
    ('tx-clutch-kit-dkm-stage4-twin', 'clutch', 'Clutch Kits', 'DKM', 'Stage 4 Uprated Twin Clutch + Flywheel Kit', 1480.99),
    ('tx-clutch-kit-dkm-mrx-stage35', 'clutch', 'Clutch Kits', 'DKM', 'MRX Stage 3.5 Uprated Twin Clutch + Flywheel Kit', 2050.99),
    ('tx-clutch-kit-xtreme-stage1', 'clutch', 'Clutch Kits', 'Xtreme Clutch', 'Stage 1 + Flywheel', 1111.99),
    ('tx-flywheel-ttv-racing-lightweight', 'clutch', 'Flywheels', 'TTV Racing', 'Lightweight Flywheel', 516.99),
    ('tx-diff-racingdiffs-zf006-lsd-swap', 'differential', 'Limited Slip Diff', 'RacingDiffs', 'ZF 006 LSD Swap Kit', 347.99),
    ('tx-diff-kaaz-lsd', 'differential', 'Limited Slip Diff', 'Kaaz', 'Limited Slip Differential', 1792.99),
    ('tx-swap-cybul-s62b50-kit', 'mounts', 'Engine & Box Swap Kits', 'Cybul Solutions', 'S62B50 Engine Swap Kit', 1779.99),
    ('tx-swap-cybul-m60-m62-kit', 'mounts', 'Engine & Box Swap Kits', 'Cybul Solutions', 'M60/M62 Engine Swap Kit', 1481.99),
    ('tx-swap-cybul-intermediate-shaft', 'mounts', 'Engine & Box Swap Kits', 'Cybul Solutions', 'Intermediate Steering Shaft', 296.99),
    ('tx-swap-tech53-zf-getrag-adapter', 'mounts', 'Engine & Box Swap Kits', 'Tech-53', 'ZF to Getrag Driveshaft Adapter Plate', 186.99)
) as seed(id, category, subcategory, brand, name, price)
cross join fit
on conflict (id)
do update set
  category = excluded.category,
  subcategory = excluded.subcategory,
  brand = excluded.brand,
  name = excluded.name,
  price = excluded.price,
  fitment = excluded.fitment,
  updated_at = now();

commit;
