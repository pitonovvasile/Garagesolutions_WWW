-- Citire anonimă pentru catalogul de kituri suspensie (pagina OEM+ din frontend).
-- Rulează doar dacă tabelul `public.bilstein_suspension_options` există deja.

GRANT SELECT ON TABLE public.bilstein_suspension_options TO anon;

ALTER TABLE public.bilstein_suspension_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read bilstein_suspension_options for anon" ON public.bilstein_suspension_options;
CREATE POLICY "Allow read bilstein_suspension_options for anon"
ON public.bilstein_suspension_options
FOR SELECT
TO anon
USING (true);
