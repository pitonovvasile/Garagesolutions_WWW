-- Coloane tipizate BMW pe garaj + grant-uri pentru view-uri canonice (ajustează dacă există deja în DB).

alter table public.user_saved_vehicles
  add column if not exists bmw_variant_id bigint,
  add column if not exists bmw_configuration_id bigint;

comment on column public.user_saved_vehicles.bmw_variant_id is
  'Referință catalog BMW (variantă); se join-uiește în user_saved_vehicles_resolved / bmw_technical_specs.';
comment on column public.user_saved_vehicles.bmw_configuration_id is
  'ID configurație BMW (rând catalog); se join-uiește în user_saved_vehicles_resolved / bmw_technical_specs.';

-- View-uri: create statements live în proiectul DB; aici doar permisiuni minime pentru API.
grant select on public.bmw_technical_specs to anon;
grant select on public.user_saved_vehicles_resolved to authenticated;
