-- Required so role `anon` can evaluate `public.bmw_configuration_lookup`
-- (view runs as invoker; SELECT on the view alone does not grant access to base tables).
-- Apply on Supabase (SQL Editor) if transmissions / engines stay empty after Seria 3 seed.

GRANT SELECT ON TABLE public.bmw_variant_configurations TO anon;

ALTER TABLE public.bmw_variant_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for anon" ON public.bmw_variant_configurations;
CREATE POLICY "Allow read for anon"
ON public.bmw_variant_configurations
FOR SELECT
TO anon
USING (true);
