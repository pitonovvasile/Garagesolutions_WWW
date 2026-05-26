/**
 * Configurație unică Supabase pentru întreg site-ul Garage Solutions (pagini statice + aplicații Vite din repo).
 *
 * Aceleași `SUPABASE_URL` și `SUPABASE_ANON_KEY` pentru:
 * - mărci / modele auto și date vehicul în magazin
 * - catalog «Kits suspensii OEM+» (Vite; alias `@site-supabase-config`)
 * - garaj sincron, cont, piese live, BMW catalog, categorii viitoare
 *
 * Nu există o a doua sursă (ex. `VITE_SUPABASE_*`) pentru aceste chei — modifici doar aici și redeploy / rebuild.
 */
export const SUPABASE_URL = "https://nfnamdmdavbaedpesdpy.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_UgbUMWX6g-TKVvYw1FL1tg_OfqdX8VW";
