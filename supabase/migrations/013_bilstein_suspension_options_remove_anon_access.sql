-- Elimină modelul anterior de acces anon pentru catalogul de kituri suspensie (`bilstein_suspension_options`):
-- politica RLS, RLS activat și GRANT SELECT către anon (introduse în 012).
-- Rulează fără eroare dacă tabelul lipsește încă.

DO $$
BEGIN
  IF to_regclass('public.bilstein_suspension_options') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $p$
    DROP POLICY IF EXISTS "Allow read bilstein_suspension_options for anon"
    ON public.bilstein_suspension_options
  $p$;

  EXECUTE $p$
    ALTER TABLE public.bilstein_suspension_options DISABLE ROW LEVEL SECURITY
  $p$;

  EXECUTE $p$
    REVOKE SELECT ON TABLE public.bilstein_suspension_options FROM anon
  $p$;
END $$;
