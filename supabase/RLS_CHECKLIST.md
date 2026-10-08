# Checklist RLS (P0) — proiect live `reboxjzkoopkfwaemjrz`

Rulează în Supabase Dashboard → SQL Editor pe proiectul din `assets/js/supabase-config.mjs`.
Anon/publishable key e public; RLS + grants = limita de securitate.

## 1) Tabele user (own-row)

Confirmă că `authenticated` poate CRUD doar rândurile cu `auth.uid() = id` / `user_id`:

- [ ] `public.profiles`
- [ ] `public.delivery_addresses`
- [ ] `public.user_saved_vehicles`
- [ ] view `public.user_saved_vehicles_resolved` — SELECT doar pentru `authenticated` (propriul user)

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'delivery_addresses', 'user_saved_vehicles');

select pol.polname, rel.relname, pol.polcmd, pg_get_expr(pol.polqual, pol.polrelid) as using_expr
from pg_policy pol
join pg_class rel on rel.oid = pol.polrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname in ('profiles', 'delivery_addresses', 'user_saved_vehicles')
order by rel.relname, pol.polname;
```

## 2) Catalog (anon read OK; write restricționat)

- [ ] Tabele catalog BMW: SELECT pentru `anon` / `authenticated` (by design)
- [ ] `bmw_catalog_entries`: rulează `016_bmw_catalog_entries_no_client_write.sql` — SELECT OK, fără INSERT/UPDATE/DELETE pentru `anon` / `authenticated`
- [ ] UI allowlist: `assets/js/catalog-admin-config.mjs` (gol = nimeni)

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name ilike '%catalog%'
order by table_name, grantee, privilege_type;
```

## 3) Bilstein / OEM+

După migrarea 013 (`DISABLE ROW LEVEL SECURITY` pe unele tabele OEM):

- [ ] Confirmă grants: dacă RLS e oprit, table-ul nu trebuie să fie writable de `anon`
- [ ] Read public OK doar dacă e intenționat (catalog OEM+)

## 4) Smoke test din browser (anon key)

Cu cheia din `supabase-config.mjs`:

1. Fără login: `select` pe catalog → OK; `select` pe `profiles` → gol / denied
2. Cu user A: poate citi/scrie doar propriile `delivery_addresses` / `user_saved_vehicles`
3. User A nu poate actualiza row-ul user B

## 5) Types

După confirmare:

```bash
npm run supabase:types
```

Project id trebuie să coincidă cu URL-ul din `supabase-config.mjs` (`reboxjzkoopkfwaemjrz`).
