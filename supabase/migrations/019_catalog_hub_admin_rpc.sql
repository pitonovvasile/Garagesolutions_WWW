-- Admin-only read RPCs for Catalog Hub.
-- The catalog_hub schema remains private; the public API exposes only these
-- SECURITY DEFINER functions and only to authenticated users.

create table if not exists catalog_hub.admin_users (
  email text primary key,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_users_role_check
    check (role in ('owner', 'admin', 'viewer'))
);

drop trigger if exists admin_users_set_updated_at on catalog_hub.admin_users;
create trigger admin_users_set_updated_at
  before update on catalog_hub.admin_users
  for each row execute procedure catalog_hub.set_updated_at();

alter table catalog_hub.admin_users enable row level security;

insert into catalog_hub.admin_users (email, role, is_active)
values ('pitonov.vasile@gmail.com', 'owner', true)
on conflict (email) do update set
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function public.catalog_hub_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, catalog_hub
as $$
  select exists (
    select 1
    from catalog_hub.admin_users admin
    where admin.is_active = true
      and lower(admin.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.catalog_hub_is_admin() from public;
grant execute on function public.catalog_hub_is_admin() to authenticated;

create or replace function public.catalog_hub_admin_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, catalog_hub
as $$
declare
  result jsonb;
begin
  if not public.catalog_hub_is_admin() then
    raise exception 'catalog_hub admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'adminEmail', lower(coalesce(auth.jwt() ->> 'email', '')),
    'counts', jsonb_build_object(
      'suppliers', (select count(*) from catalog_hub.suppliers),
      'sourceSnapshots', (select count(*) from catalog_hub.source_snapshots),
      'canonicalMakes', (select count(*) from catalog_hub.vehicle_makes),
      'canonicalModels', (select count(*) from catalog_hub.vehicle_models),
      'canonicalVehicleTypes', (select count(*) from catalog_hub.vehicle_types),
      'canonicalVehicleVariants', (select count(*) from catalog_hub.vehicle_variants),
      'canonicalProducts', (select count(*) from catalog_hub.canonical_products),
      'supplierVehicleTypes', (select count(*) from catalog_hub.supplier_vehicle_types),
      'supplierVehicleYears', (select count(*) from catalog_hub.supplier_vehicle_years),
      'supplierVehicleRefs', (select count(*) from catalog_hub.supplier_vehicle_refs),
      'supplierProducts', (select count(*) from catalog_hub.supplier_products),
      'supplierOffersCurrent', (select count(*) from catalog_hub.supplier_offers where is_current = true)
    ),
    'suppliers', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.name)
      from (
        select
          suppliers.id,
          suppliers.name,
          suppliers.kind,
          suppliers.integration_status as "integrationStatus",
          suppliers.is_active as "isActive",
          (select count(*) from catalog_hub.supplier_vehicle_types t where t.supplier_id = suppliers.id) as "vehicleTypes",
          (select count(*) from catalog_hub.supplier_vehicle_years y where y.supplier_id = suppliers.id) as "vehicleYears",
          (select count(*) from catalog_hub.supplier_vehicle_refs r where r.supplier_id = suppliers.id) as "vehicleRefs",
          (select count(*) from catalog_hub.supplier_products p where p.supplier_id = suppliers.id) as "products",
          (select count(*) from catalog_hub.supplier_products p join catalog_hub.supplier_offers o on o.supplier_product_id = p.id where p.supplier_id = suppliers.id and o.is_current = true) as "currentOffers"
        from catalog_hub.suppliers
      ) s
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.catalog_hub_admin_summary() from public;
grant execute on function public.catalog_hub_admin_summary() to authenticated;

create or replace function public.catalog_hub_admin_supplier_coverage(
  p_supplier_id text default 'bardi'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, catalog_hub
as $$
declare
  result jsonb;
begin
  if not public.catalog_hub_is_admin() then
    raise exception 'catalog_hub admin access required' using errcode = '42501';
  end if;

  with makes as (
    select distinct external_make_label as make
    from catalog_hub.supplier_vehicle_types
    where supplier_id = p_supplier_id
  ),
  type_counts as (
    select external_make_label as make, count(*)::integer as vehicle_types
    from catalog_hub.supplier_vehicle_types
    where supplier_id = p_supplier_id
    group by external_make_label
  ),
  year_counts as (
    select t.external_make_label as make, count(*)::integer as model_years
    from catalog_hub.supplier_vehicle_years y
    join catalog_hub.supplier_vehicle_types t
      on t.supplier_id = y.supplier_id
     and t.external_type_id = y.external_type_id
    where y.supplier_id = p_supplier_id
    group by t.external_make_label
  ),
  ref_counts as (
    select t.external_make_label as make, count(*)::integer as vehicle_refs
    from catalog_hub.supplier_vehicle_refs r
    join catalog_hub.supplier_vehicle_types t
      on t.supplier_id = r.supplier_id
     and t.external_type_id = r.external_type_id
    where r.supplier_id = p_supplier_id
    group by t.external_make_label
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'make', makes.make,
        'vehicleTypes', coalesce(type_counts.vehicle_types, 0),
        'modelYears', coalesce(year_counts.model_years, 0),
        'vehicleRefs', coalesce(ref_counts.vehicle_refs, 0)
      )
      order by makes.make
    ),
    '[]'::jsonb
  )
  into result
  from makes
  left join type_counts on type_counts.make = makes.make
  left join year_counts on year_counts.make = makes.make
  left join ref_counts on ref_counts.make = makes.make;

  return jsonb_build_object(
    'supplierId', p_supplier_id,
    'rows', result
  );
end;
$$;

revoke all on function public.catalog_hub_admin_supplier_coverage(text) from public;
grant execute on function public.catalog_hub_admin_supplier_coverage(text) to authenticated;

create or replace function public.catalog_hub_admin_vehicle_types(
  p_supplier_id text default 'bardi',
  p_make text default null,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, catalog_hub
as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 100), 1), 300);
  off integer := greatest(coalesce(p_offset, 0), 0);
  result jsonb;
begin
  if not public.catalog_hub_is_admin() then
    raise exception 'catalog_hub admin access required' using errcode = '42501';
  end if;

  with filtered as (
    select
      t.supplier_id,
      t.external_type_id,
      t.external_make_label,
      t.external_model_label,
      t.external_generation_label,
      t.external_year_from,
      t.external_year_to,
      t.match_status,
      t.match_confidence
    from catalog_hub.supplier_vehicle_types t
    where t.supplier_id = p_supplier_id
      and (p_make is null or p_make = '' or t.external_make_label = p_make)
      and (
        p_search is null
        or p_search = ''
        or lower(t.external_make_label || ' ' || t.external_model_label || ' ' || t.external_generation_label)
          like '%' || lower(p_search) || '%'
      )
  ),
  counted as (
    select count(*)::integer as total from filtered
  ),
  page as (
    select *
    from filtered
    order by external_make_label, external_model_label, external_generation_label, external_type_id
    limit lim offset off
  ),
  rows as (
    select
      page.*,
      (select count(*)::integer from catalog_hub.supplier_vehicle_years y where y.supplier_id = page.supplier_id and y.external_type_id = page.external_type_id) as year_count,
      (select count(*)::integer from catalog_hub.supplier_vehicle_refs r where r.supplier_id = page.supplier_id and r.external_type_id = page.external_type_id) as ref_count
    from page
  )
  select jsonb_build_object(
    'supplierId', p_supplier_id,
    'limit', lim,
    'offset', off,
    'total', (select total from counted),
    'rows', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'externalTypeId', external_type_id,
          'make', external_make_label,
          'model', external_model_label,
          'generation', external_generation_label,
          'yearFrom', external_year_from,
          'yearTo', external_year_to,
          'matchStatus', match_status,
          'matchConfidence', match_confidence,
          'yearCount', year_count,
          'vehicleRefCount', ref_count
        )
        order by external_make_label, external_model_label, external_generation_label, external_type_id
      )
      from rows
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.catalog_hub_admin_vehicle_types(text, text, text, integer, integer) from public;
grant execute on function public.catalog_hub_admin_vehicle_types(text, text, text, integer, integer) to authenticated;

create or replace function public.catalog_hub_admin_vehicle_type_detail(
  p_supplier_id text,
  p_external_type_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, catalog_hub
as $$
declare
  result jsonb;
begin
  if not public.catalog_hub_is_admin() then
    raise exception 'catalog_hub admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'type', to_jsonb(t),
    'years', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'year', y.production_year,
          'reviewStatus', y.review_status,
          'reviewReason', y.review_reason,
          'vehicleRefCount', (
            select count(*)::integer
            from catalog_hub.supplier_vehicle_refs r
            where r.supplier_id = y.supplier_id
              and r.external_type_id = y.external_type_id
              and r.production_year = y.production_year
          )
        )
        order by y.production_year desc
      )
      from catalog_hub.supplier_vehicle_years y
      where y.supplier_id = p_supplier_id
        and y.external_type_id = p_external_type_id
    ), '[]'::jsonb),
    'vehicleRefs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'externalVehicleId', r.external_vehicle_id,
          'year', r.production_year,
          'engineLabel', r.external_engine_label,
          'engineCode', r.external_engine_code,
          'displacementL', r.displacement_l,
          'fuelType', r.fuel_type,
          'matchStatus', r.match_status,
          'reviewStatus', r.review_status
        )
        order by r.production_year desc, r.external_engine_label, r.external_vehicle_id
      )
      from catalog_hub.supplier_vehicle_refs r
      where r.supplier_id = p_supplier_id
        and r.external_type_id = p_external_type_id
      limit 500
    ), '[]'::jsonb)
  )
  into result
  from (
    select
      supplier_id as "supplierId",
      external_type_id as "externalTypeId",
      external_make_label as "make",
      external_model_label as "model",
      external_generation_label as "generation",
      external_year_from as "yearFrom",
      external_year_to as "yearTo",
      source_url as "sourceUrl",
      match_status as "matchStatus",
      match_confidence as "matchConfidence",
      raw_payload as "rawPayload"
    from catalog_hub.supplier_vehicle_types
    where supplier_id = p_supplier_id
      and external_type_id = p_external_type_id
  ) t;

  if result is null then
    return jsonb_build_object(
      'type', null,
      'years', '[]'::jsonb,
      'vehicleRefs', '[]'::jsonb
    );
  end if;

  return result;
end;
$$;

revoke all on function public.catalog_hub_admin_vehicle_type_detail(text, text) from public;
grant execute on function public.catalog_hub_admin_vehicle_type_detail(text, text) to authenticated;

comment on table catalog_hub.admin_users is 'Allowlist for Catalog Hub admin RPCs. Only DB-backed checks expose supplier/catalog data to the static admin UI.';
