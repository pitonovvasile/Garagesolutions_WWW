-- Tipuri suspensie față/spate pentru mapare în modulul Suspension design (citește `anon`).
-- Dacă ai creat deja coloanele în SQL Editor, acest fișier e idempotent.

alter table public.bmw_variant_configurations
  add column if not exists front_suspension_type text,
  add column if not exists rear_suspension_type text;

comment on column public.bmw_variant_configurations.front_suspension_type is
  'Etichetă față (ex. MacPherson strut, Double wishbone) — mapată la șablon simulare în app.';
comment on column public.bmw_variant_configurations.rear_suspension_type is
  'Etichetă spate (ex. Multi-link) — mapată la șablon simulare în app.';
