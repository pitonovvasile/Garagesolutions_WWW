-- Drepturi explicite pe delivery_addresses (unele instanțe Supabase fără grant implicit pe tabele noi).
-- Rulare manuală în Supabase SQL Editor după 002.

grant select, insert, update, delete on table public.delivery_addresses to authenticated;
