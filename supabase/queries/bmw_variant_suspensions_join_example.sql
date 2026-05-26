-- Exemplu: suspensie OEM din `bmw_variant_configurations` cu denumiri catalog.
-- În app, `bmwVariantId` salvat din garaj trebuie să fie același cu `public.bmw_variants.id`
-- (coloana `bmw_variant_configurations.variant_id` face join pe `bmw_variants.id`).

select
  b.name as brand,
  m.name as model,
  g.code as generation,
  bv.variant_name,
  bvc.front_suspension_type,
  bvc.rear_suspension_type
from public.bmw_variant_configurations bvc
join public.bmw_variants bv
  on bv.id = bvc.variant_id
join public.generations g
  on g.id = bv.generation_id
join public.models m
  on m.id = g.model_id
join public.brands b
  on b.id = m.brand_id;
