-- BMW catalog read access for frontend (anon role)
-- Applies to: models, generations, generation_body_styles, body_styles, bmw_variants

-- 1) Ensure anon can read these tables
GRANT SELECT ON TABLE public.models TO anon;
GRANT SELECT ON TABLE public.generations TO anon;
GRANT SELECT ON TABLE public.generation_body_styles TO anon;
GRANT SELECT ON TABLE public.body_styles TO anon;
GRANT SELECT ON TABLE public.bmw_variants TO anon;

-- 2) Enable RLS and add permissive SELECT policies for anon
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for anon" ON public.models;
CREATE POLICY "Allow read for anon"
ON public.models
FOR SELECT
TO anon
USING (true);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for anon" ON public.generations;
CREATE POLICY "Allow read for anon"
ON public.generations
FOR SELECT
TO anon
USING (true);

ALTER TABLE public.generation_body_styles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for anon" ON public.generation_body_styles;
CREATE POLICY "Allow read for anon"
ON public.generation_body_styles
FOR SELECT
TO anon
USING (true);

ALTER TABLE public.body_styles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for anon" ON public.body_styles;
CREATE POLICY "Allow read for anon"
ON public.body_styles
FOR SELECT
TO anon
USING (true);

ALTER TABLE public.bmw_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for anon" ON public.bmw_variants;
CREATE POLICY "Allow read for anon"
ON public.bmw_variants
FOR SELECT
TO anon
USING (true);

-- Optional debug-only fallback (do not keep in production):
-- ALTER TABLE public.models DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.generations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.generation_body_styles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.body_styles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bmw_variants DISABLE ROW LEVEL SECURITY;
