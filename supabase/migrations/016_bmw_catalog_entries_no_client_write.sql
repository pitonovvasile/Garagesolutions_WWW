-- Deny client-side writes on bmw_catalog_entries for anon / authenticated.
-- Catalog notes edits should go through a privileged path (service role / SQL Editor / future admin role).
-- Safe to re-run.

do $$
begin
  if to_regclass('public.bmw_catalog_entries') is null then
    raise notice 'bmw_catalog_entries missing — skip 016';
    return;
  end if;

  -- Ensure RLS is on; keep existing SELECT policies for public read.
  alter table public.bmw_catalog_entries enable row level security;

  drop policy if exists "bmw_catalog_entries_no_insert_authenticated" on public.bmw_catalog_entries;
  drop policy if exists "bmw_catalog_entries_no_update_authenticated" on public.bmw_catalog_entries;
  drop policy if exists "bmw_catalog_entries_no_delete_authenticated" on public.bmw_catalog_entries;
  drop policy if exists "bmw_catalog_entries_no_insert_anon" on public.bmw_catalog_entries;
  drop policy if exists "bmw_catalog_entries_no_update_anon" on public.bmw_catalog_entries;
  drop policy if exists "bmw_catalog_entries_no_delete_anon" on public.bmw_catalog_entries;

  -- Explicit deny-style: no USING (true) write policies.
  -- Revoke table-level write grants if present.
  revoke insert, update, delete on public.bmw_catalog_entries from anon, authenticated;

  grant select on public.bmw_catalog_entries to anon, authenticated;
end $$;

comment on table public.bmw_catalog_entries is
  'BMW catalog entries — anon/authenticated SELECT only; writes via service role / SQL.';
