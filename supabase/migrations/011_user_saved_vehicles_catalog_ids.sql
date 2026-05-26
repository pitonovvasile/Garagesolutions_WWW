-- Multi-brand catalog FKs on garaj; `user_saved_vehicles_resolved` rămâne sursa pentru afișare tehnică.
-- ID-uri numerice safe (catalog intern). Ajustează tipul dacă proiectul folosește UUID pe brands/models.

alter table public.user_saved_vehicles
  add column if not exists catalog_brand_id bigint,
  add column if not exists catalog_model_id bigint,
  add column if not exists catalog_generation_id bigint,
  add column if not exists catalog_variant_id bigint,
  add column if not exists catalog_configuration_id bigint,
  add column if not exists catalog_resolved boolean not null default false;

comment on column public.user_saved_vehicles.catalog_brand_id is 'FK catalog marcă (generic, multi-brand).';
comment on column public.user_saved_vehicles.catalog_model_id is 'FK catalog model.';
comment on column public.user_saved_vehicles.catalog_generation_id is 'FK catalog generație.';
comment on column public.user_saved_vehicles.catalog_variant_id is 'FK catalog variantă (BMW: același id ca bmw_variants).';
comment on column public.user_saved_vehicles.catalog_configuration_id is 'FK catalog configurație (BMW: rând bmw_variant_configurations / lookup).';
comment on column public.user_saved_vehicles.catalog_resolved is 'True când rândul a fost rezolvat în catalog (oglindă logică server).';
