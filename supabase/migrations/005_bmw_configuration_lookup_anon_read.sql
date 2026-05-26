-- Allow anon read on BMW configuration lookup view (single source for frontend filtering).
GRANT SELECT ON public.bmw_configuration_lookup TO anon;
