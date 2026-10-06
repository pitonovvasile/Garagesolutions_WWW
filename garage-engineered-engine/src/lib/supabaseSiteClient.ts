import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@site-supabase-config";

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export type SiteSupabaseEnvOk = { url: string; anonKey: string };
export type SiteSupabaseEnvErr = { error: string };

/**
 * Citire non-fatală a URL + cheie anon pentru UI (fără throw).
 * Sursa unică: `assets/js/supabase-config.mjs` (alias `@site-supabase-config`) — același fișier ca pentru
 * mărci/modele, garaj, OEM+ și alte categorii pe site.
 */
export function readSiteSupabaseEnv(): SiteSupabaseEnvOk | SiteSupabaseEnvErr {
  const url = trimStr(SUPABASE_URL);
  const anonKey = trimStr(SUPABASE_ANON_KEY);
  if (!url && !anonKey) {
    return {
      error:
        "Lipsesc URL-ul și cheia anon Supabase: editează `SUPABASE_URL` și `SUPABASE_ANON_KEY` în `assets/js/supabase-config.mjs` (configurația unică pentru tot site-ul).",
    };
  }
  if (!url) {
    return { error: "Lipsește `SUPABASE_URL` în `assets/js/supabase-config.mjs`." };
  }
  if (!anonKey) {
    return { error: "Lipsește `SUPABASE_ANON_KEY` în `assets/js/supabase-config.mjs`." };
  }
  return { url, anonKey };
}

export function resolveSupabaseCredentials(): { url: string; anonKey: string } {
  const r = readSiteSupabaseEnv();
  if ("error" in r) {
    throw new Error(r.error);
  }
  return r;
}

let cached: { url: string; anonKey: string; client: SupabaseClient } | null = null;

/** Client Supabase anon — aceleași credențiale ca restul site-ului. */
export function getSiteSupabaseClient(): SupabaseClient {
  const { url, anonKey } = resolveSupabaseCredentials();
  if (!cached || cached.url !== url || cached.anonKey !== anonKey) {
    cached = { url, anonKey, client: createClient(url, anonKey) };
  }
  return cached.client;
}
