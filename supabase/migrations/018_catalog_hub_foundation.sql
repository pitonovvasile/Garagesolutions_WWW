-- Catalog Hub foundation.
-- Separates the canonical Garage Solutions vehicle/product catalog from supplier-specific
-- observations, product rows, fitments, prices, stock and delivery data.
--
-- This schema is intentionally private by default: no anon grants are added here.
-- Public site reads should be exposed later through narrow views/RPCs once the import
-- and matching pipeline is stable.

create schema if not exists catalog_hub;

create extension if not exists pgcrypto;

create or replace function catalog_hub.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists catalog_hub.suppliers (
  id text primary key,
  name text not null,
  kind text not null default 'parts_distributor',
  website_url text,
  integration_status text not null default 'planned',
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint suppliers_kind_check
    check (kind in ('parts_distributor', 'marketplace', 'manufacturer', 'internal', 'other')),
  constraint suppliers_integration_status_check
    check (integration_status in ('planned', 'selector_snapshot', 'vehicle_mapping', 'product_capture', 'offers_live', 'paused'))
);

drop trigger if exists suppliers_set_updated_at on catalog_hub.suppliers;
create trigger suppliers_set_updated_at
  before update on catalog_hub.suppliers
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  supplier_id text references catalog_hub.suppliers(id) on delete set null,
  source_kind text not null,
  source_profile text not null default 'unrecorded',
  source_url text,
  source_file text,
  content_hash text,
  observed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),

  constraint source_snapshots_kind_check
    check (source_kind in (
      'selector_index',
      'vehicle_years',
      'vehicle_engines',
      'product_listing',
      'product_detail',
      'offer',
      'manual_import',
      'other'
    ))
);

create unique index if not exists source_snapshots_supplier_kind_hash_uidx
  on catalog_hub.source_snapshots (supplier_id, source_kind, content_hash)
  where content_hash is not null;

create table if not exists catalog_hub.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null,
  country_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (normalized_name)
);

drop trigger if exists vehicle_makes_set_updated_at on catalog_hub.vehicle_makes;
create trigger vehicle_makes_set_updated_at
  before update on catalog_hub.vehicle_makes
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references catalog_hub.vehicle_makes(id) on delete cascade,
  canonical_name text not null,
  normalized_name text not null,
  body_family text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (make_id, normalized_name)
);

drop trigger if exists vehicle_models_set_updated_at on catalog_hub.vehicle_models;
create trigger vehicle_models_set_updated_at
  before update on catalog_hub.vehicle_models
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references catalog_hub.vehicle_models(id) on delete cascade,
  generation_code text not null default '',
  display_name text not null,
  normalized_label text not null,
  year_from integer,
  year_to integer,
  body_type text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_types_year_range_check
    check (
      year_from is null
      or year_to is null
      or year_to = 0
      or year_from <= year_to
    ),
  unique (model_id, normalized_label)
);

drop trigger if exists vehicle_types_set_updated_at on catalog_hub.vehicle_types;
create trigger vehicle_types_set_updated_at
  before update on catalog_hub.vehicle_types
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.vehicle_type_years (
  vehicle_type_id uuid not null references catalog_hub.vehicle_types(id) on delete cascade,
  production_year integer not null,
  review_status text not null default 'unreviewed',
  review_reason text not null default '',
  first_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  last_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (vehicle_type_id, production_year),
  constraint vehicle_type_years_year_check
    check (production_year between 1900 and 2100),
  constraint vehicle_type_years_review_status_check
    check (review_status in ('unreviewed', 'accepted', 'flagged', 'excluded'))
);

drop trigger if exists vehicle_type_years_set_updated_at on catalog_hub.vehicle_type_years;
create trigger vehicle_type_years_set_updated_at
  before update on catalog_hub.vehicle_type_years
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.vehicle_engines (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_label text not null,
  engine_code text not null default '',
  normalized_engine_code text not null default '',
  displacement_cc integer,
  displacement_l numeric(4,2),
  fuel_type text not null default 'unknown',
  power_hp integer,
  power_kw integer,
  torque_nm integer,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_engines_displacement_check
    check (
      (displacement_cc is null or displacement_cc > 0)
      and (displacement_l is null or displacement_l > 0)
    ),
  constraint vehicle_engines_power_check
    check (
      (power_hp is null or power_hp > 0)
      and (power_kw is null or power_kw > 0)
      and (torque_nm is null or torque_nm > 0)
    )
);

create unique index if not exists vehicle_engines_signature_uidx
  on catalog_hub.vehicle_engines (
    normalized_label,
    normalized_engine_code,
    coalesce(displacement_cc, 0),
    fuel_type
  );

drop trigger if exists vehicle_engines_set_updated_at on catalog_hub.vehicle_engines;
create trigger vehicle_engines_set_updated_at
  before update on catalog_hub.vehicle_engines
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.vehicle_variants (
  id uuid primary key default gen_random_uuid(),
  vehicle_type_id uuid not null references catalog_hub.vehicle_types(id) on delete cascade,
  production_year integer not null,
  engine_id uuid not null references catalog_hub.vehicle_engines(id) on delete restrict,
  variant_label text,
  drivetrain text,
  transmission text,
  source_confidence numeric(5,4) not null default 0,
  status text not null default 'unreviewed',
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_variants_year_check
    check (production_year between 1900 and 2100),
  constraint vehicle_variants_confidence_check
    check (source_confidence >= 0 and source_confidence <= 1),
  constraint vehicle_variants_status_check
    check (status in ('unreviewed', 'accepted', 'flagged', 'excluded', 'merged')),
  unique (vehicle_type_id, production_year, engine_id)
);

create index if not exists vehicle_variants_type_year_idx
  on catalog_hub.vehicle_variants (vehicle_type_id, production_year);

drop trigger if exists vehicle_variants_set_updated_at on catalog_hub.vehicle_variants;
create trigger vehicle_variants_set_updated_at
  before update on catalog_hub.vehicle_variants
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.supplier_vehicle_types (
  supplier_id text not null references catalog_hub.suppliers(id) on delete cascade,
  external_type_id text not null,
  external_make_label text not null,
  external_model_label text not null,
  external_generation_label text not null default '',
  external_year_from integer,
  external_year_to integer,
  source_url text,
  canonical_vehicle_type_id uuid references catalog_hub.vehicle_types(id) on delete set null,
  match_status text not null default 'unmatched',
  match_confidence numeric(5,4) not null default 0,
  first_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  last_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (supplier_id, external_type_id),
  constraint supplier_vehicle_types_match_status_check
    check (match_status in ('unmatched', 'auto_matched', 'manual_matched', 'ambiguous', 'rejected')),
  constraint supplier_vehicle_types_confidence_check
    check (match_confidence >= 0 and match_confidence <= 1)
);

drop trigger if exists supplier_vehicle_types_set_updated_at on catalog_hub.supplier_vehicle_types;
create trigger supplier_vehicle_types_set_updated_at
  before update on catalog_hub.supplier_vehicle_types
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.supplier_vehicle_years (
  supplier_id text not null,
  external_type_id text not null,
  production_year integer not null,
  canonical_vehicle_type_id uuid references catalog_hub.vehicle_types(id) on delete set null,
  review_status text not null default 'unreviewed',
  review_reason text not null default '',
  first_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  last_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (supplier_id, external_type_id, production_year),
  foreign key (supplier_id, external_type_id)
    references catalog_hub.supplier_vehicle_types(supplier_id, external_type_id)
    on delete cascade,
  constraint supplier_vehicle_years_year_check
    check (production_year between 1900 and 2100),
  constraint supplier_vehicle_years_review_status_check
    check (review_status in ('unreviewed', 'accepted', 'flagged', 'excluded'))
);

drop trigger if exists supplier_vehicle_years_set_updated_at on catalog_hub.supplier_vehicle_years;
create trigger supplier_vehicle_years_set_updated_at
  before update on catalog_hub.supplier_vehicle_years
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.supplier_vehicle_refs (
  id uuid primary key default gen_random_uuid(),
  supplier_id text not null,
  external_vehicle_id text not null,
  external_type_id text not null,
  production_year integer not null,
  external_engine_label text not null,
  external_engine_code text not null default '',
  displacement_l numeric(4,2),
  fuel_type text not null default 'unknown',
  canonical_vehicle_variant_id uuid references catalog_hub.vehicle_variants(id) on delete set null,
  match_status text not null default 'unmatched',
  match_confidence numeric(5,4) not null default 0,
  review_status text not null default 'unreviewed',
  first_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  last_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (supplier_id, external_vehicle_id),
  foreign key (supplier_id, external_type_id, production_year)
    references catalog_hub.supplier_vehicle_years(supplier_id, external_type_id, production_year)
    on delete cascade,
  constraint supplier_vehicle_refs_year_check
    check (production_year between 1900 and 2100),
  constraint supplier_vehicle_refs_match_status_check
    check (match_status in ('unmatched', 'auto_matched', 'manual_matched', 'ambiguous', 'rejected')),
  constraint supplier_vehicle_refs_review_status_check
    check (review_status in ('unreviewed', 'accepted', 'flagged', 'excluded')),
  constraint supplier_vehicle_refs_confidence_check
    check (match_confidence >= 0 and match_confidence <= 1)
);

create index if not exists supplier_vehicle_refs_variant_idx
  on catalog_hub.supplier_vehicle_refs (canonical_vehicle_variant_id);

drop trigger if exists supplier_vehicle_refs_set_updated_at on catalog_hub.supplier_vehicle_refs;
create trigger supplier_vehicle_refs_set_updated_at
  before update on catalog_hub.supplier_vehicle_refs
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.part_brands (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (normalized_name)
);

drop trigger if exists part_brands_set_updated_at on catalog_hub.part_brands;
create trigger part_brands_set_updated_at
  before update on catalog_hub.part_brands
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.product_categories (
  id text primary key,
  parent_id text references catalog_hub.product_categories(id) on delete set null,
  name text not null,
  normalized_name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists product_categories_set_updated_at on catalog_hub.product_categories;
create trigger product_categories_set_updated_at
  before update on catalog_hub.product_categories
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.canonical_products (
  id uuid primary key default gen_random_uuid(),
  category_id text references catalog_hub.product_categories(id) on delete set null,
  part_brand_id uuid references catalog_hub.part_brands(id) on delete set null,
  canonical_name text not null,
  normalized_name text not null,
  primary_oe_code text,
  status text not null default 'unreviewed',
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint canonical_products_status_check
    check (status in ('unreviewed', 'accepted', 'flagged', 'archived', 'merged'))
);

create index if not exists canonical_products_category_idx
  on catalog_hub.canonical_products (category_id);

drop trigger if exists canonical_products_set_updated_at on catalog_hub.canonical_products;
create trigger canonical_products_set_updated_at
  before update on catalog_hub.canonical_products
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.product_identifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references catalog_hub.canonical_products(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  normalized_value text not null,
  issuer text not null default '',
  created_at timestamptz not null default now(),

  constraint product_identifiers_type_check
    check (identifier_type in ('oe', 'ean', 'manufacturer', 'supplier', 'tecdoc', 'other'))
);

create unique index if not exists product_identifiers_value_uidx
  on catalog_hub.product_identifiers (product_id, identifier_type, normalized_value, issuer);

create index if not exists product_identifiers_lookup_idx
  on catalog_hub.product_identifiers (identifier_type, normalized_value);

create table if not exists catalog_hub.product_fitments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references catalog_hub.canonical_products(id) on delete cascade,
  vehicle_variant_id uuid not null references catalog_hub.vehicle_variants(id) on delete cascade,
  fitment_status text not null default 'unreviewed',
  source_supplier_id text references catalog_hub.suppliers(id) on delete set null,
  source_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  confidence numeric(5,4) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (product_id, vehicle_variant_id),
  constraint product_fitments_status_check
    check (fitment_status in ('unreviewed', 'accepted', 'flagged', 'rejected')),
  constraint product_fitments_confidence_check
    check (confidence >= 0 and confidence <= 1)
);

create index if not exists product_fitments_variant_idx
  on catalog_hub.product_fitments (vehicle_variant_id);

drop trigger if exists product_fitments_set_updated_at on catalog_hub.product_fitments;
create trigger product_fitments_set_updated_at
  before update on catalog_hub.product_fitments
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id text not null references catalog_hub.suppliers(id) on delete cascade,
  external_sku text not null,
  raw_name text not null,
  raw_brand text not null default '',
  raw_category text not null default '',
  raw_oe_codes text[] not null default '{}'::text[],
  product_url text,
  canonical_product_id uuid references catalog_hub.canonical_products(id) on delete set null,
  match_status text not null default 'unmatched',
  match_confidence numeric(5,4) not null default 0,
  first_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  last_seen_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (supplier_id, external_sku),
  constraint supplier_products_match_status_check
    check (match_status in ('unmatched', 'auto_matched', 'manual_matched', 'ambiguous', 'rejected')),
  constraint supplier_products_confidence_check
    check (match_confidence >= 0 and match_confidence <= 1)
);

create index if not exists supplier_products_canonical_idx
  on catalog_hub.supplier_products (canonical_product_id);

drop trigger if exists supplier_products_set_updated_at on catalog_hub.supplier_products;
create trigger supplier_products_set_updated_at
  before update on catalog_hub.supplier_products
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.supplier_product_fitments (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references catalog_hub.supplier_products(id) on delete cascade,
  supplier_vehicle_ref_id uuid references catalog_hub.supplier_vehicle_refs(id) on delete set null,
  canonical_vehicle_variant_id uuid references catalog_hub.vehicle_variants(id) on delete set null,
  match_status text not null default 'unmatched',
  match_confidence numeric(5,4) not null default 0,
  source_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint supplier_product_fitments_match_status_check
    check (match_status in ('unmatched', 'auto_matched', 'manual_matched', 'ambiguous', 'rejected')),
  constraint supplier_product_fitments_confidence_check
    check (match_confidence >= 0 and match_confidence <= 1)
);

create unique index if not exists supplier_product_fitments_supplier_ref_uidx
  on catalog_hub.supplier_product_fitments (supplier_product_id, supplier_vehicle_ref_id)
  where supplier_vehicle_ref_id is not null;

create index if not exists supplier_product_fitments_variant_idx
  on catalog_hub.supplier_product_fitments (canonical_vehicle_variant_id);

drop trigger if exists supplier_product_fitments_set_updated_at on catalog_hub.supplier_product_fitments;
create trigger supplier_product_fitments_set_updated_at
  before update on catalog_hub.supplier_product_fitments
  for each row execute procedure catalog_hub.set_updated_at();

create table if not exists catalog_hub.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references catalog_hub.supplier_products(id) on delete cascade,
  price_gross numeric(12,2),
  currency text not null default 'RON',
  stock_status text not null default 'unknown',
  stock_quantity integer,
  lead_time_label text not null default '',
  delivery_eta_min_days integer,
  delivery_eta_max_days integer,
  observed_at timestamptz not null default now(),
  source_snapshot_id uuid references catalog_hub.source_snapshots(id) on delete set null,
  is_current boolean not null default true,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint supplier_offers_price_check
    check (price_gross is null or price_gross >= 0),
  constraint supplier_offers_stock_qty_check
    check (stock_quantity is null or stock_quantity >= 0),
  constraint supplier_offers_delivery_check
    check (
      (delivery_eta_min_days is null or delivery_eta_min_days >= 0)
      and (delivery_eta_max_days is null or delivery_eta_max_days >= 0)
      and (
        delivery_eta_min_days is null
        or delivery_eta_max_days is null
        or delivery_eta_min_days <= delivery_eta_max_days
      )
    ),
  constraint supplier_offers_stock_status_check
    check (stock_status in ('in_stock', 'limited', 'supplier_stock', 'backorder', 'out_of_stock', 'unknown'))
);

create index if not exists supplier_offers_product_current_idx
  on catalog_hub.supplier_offers (supplier_product_id, is_current, observed_at desc);

drop trigger if exists supplier_offers_set_updated_at on catalog_hub.supplier_offers;
create trigger supplier_offers_set_updated_at
  before update on catalog_hub.supplier_offers
  for each row execute procedure catalog_hub.set_updated_at();

create or replace view catalog_hub.vehicle_selector as
select
  vm.id as make_id,
  vm.canonical_name as make_name,
  vmo.id as model_id,
  vmo.canonical_name as model_name,
  vt.id as vehicle_type_id,
  vt.display_name as vehicle_type_name,
  vt.generation_code,
  vt.year_from,
  vt.year_to,
  vty.production_year,
  vv.id as vehicle_variant_id,
  ve.display_name as engine_name,
  ve.engine_code,
  ve.displacement_cc,
  ve.displacement_l,
  ve.fuel_type
from catalog_hub.vehicle_makes vm
join catalog_hub.vehicle_models vmo on vmo.make_id = vm.id
join catalog_hub.vehicle_types vt on vt.model_id = vmo.id
left join catalog_hub.vehicle_type_years vty on vty.vehicle_type_id = vt.id
left join catalog_hub.vehicle_variants vv
  on vv.vehicle_type_id = vt.id
 and vv.production_year = vty.production_year
left join catalog_hub.vehicle_engines ve on ve.id = vv.engine_id
where vm.is_active = true
  and vmo.is_active = true
  and vt.is_active = true;

create or replace view catalog_hub.current_supplier_offers as
select
  so.id as offer_id,
  sp.supplier_id,
  s.name as supplier_name,
  sp.external_sku,
  sp.raw_name,
  sp.raw_brand,
  sp.canonical_product_id,
  so.price_gross,
  so.currency,
  so.stock_status,
  so.stock_quantity,
  so.lead_time_label,
  so.delivery_eta_min_days,
  so.delivery_eta_max_days,
  so.observed_at
from catalog_hub.supplier_offers so
join catalog_hub.supplier_products sp on sp.id = so.supplier_product_id
join catalog_hub.suppliers s on s.id = sp.supplier_id
where so.is_current = true;

alter table catalog_hub.suppliers enable row level security;
alter table catalog_hub.source_snapshots enable row level security;
alter table catalog_hub.vehicle_makes enable row level security;
alter table catalog_hub.vehicle_models enable row level security;
alter table catalog_hub.vehicle_types enable row level security;
alter table catalog_hub.vehicle_type_years enable row level security;
alter table catalog_hub.vehicle_engines enable row level security;
alter table catalog_hub.vehicle_variants enable row level security;
alter table catalog_hub.supplier_vehicle_types enable row level security;
alter table catalog_hub.supplier_vehicle_years enable row level security;
alter table catalog_hub.supplier_vehicle_refs enable row level security;
alter table catalog_hub.part_brands enable row level security;
alter table catalog_hub.product_categories enable row level security;
alter table catalog_hub.canonical_products enable row level security;
alter table catalog_hub.product_identifiers enable row level security;
alter table catalog_hub.product_fitments enable row level security;
alter table catalog_hub.supplier_products enable row level security;
alter table catalog_hub.supplier_product_fitments enable row level security;
alter table catalog_hub.supplier_offers enable row level security;

insert into catalog_hub.suppliers as s (
  id,
  name,
  kind,
  website_url,
  integration_status,
  settings
)
values (
  'bardi',
  'Bardi Auto',
  'parts_distributor',
  'https://www.bardiauto.ro',
  'selector_snapshot',
  jsonb_build_object(
    'source', 'frontend_selector_capture',
    'vehicle_catalog_note', 'Bardi is treated as a parts distributor; its vehicle selector is supplier-specific mapping data.'
  )
)
on conflict (id) do update set
  name = excluded.name,
  kind = excluded.kind,
  website_url = excluded.website_url,
  integration_status = excluded.integration_status,
  settings = s.settings || excluded.settings,
  updated_at = now();

comment on schema catalog_hub is 'Private canonical catalog hub for vehicle, product, supplier mapping, offers, stock and delivery data.';
comment on table catalog_hub.source_snapshots is 'Raw or semi-raw evidence captured from supplier frontends, files or APIs. Keep this immutable enough for provenance.';
comment on table catalog_hub.supplier_vehicle_refs is 'Supplier-specific vehicle identifiers mapped to canonical Garage Solutions vehicle variants.';
comment on table catalog_hub.supplier_products is 'Supplier product rows exactly as seen at that supplier, optionally matched to canonical products.';
comment on table catalog_hub.supplier_offers is 'Time-varying supplier price, stock and delivery observations.';
