import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import { createSupabaseCookieMirrorStorage } from "./supabase-session-cookie-mirror.mjs";
import { syncGarageFromCloudAndLocal } from "./garage-cloud-sync.mjs";

const DEMO_PROFILE_KEY = "garageSolutionsDemoAccountProfileV1";
const DEMO_DELIVERY_KEY = "garageSolutionsDemoDeliveryAddressesV1";

let migrationClient = null;

function getMigrationClient() {
  if (migrationClient) return migrationClient;
  migrationClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: createSupabaseCookieMirrorStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return migrationClient;
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function filled(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function mergeMissingFields(base, incoming) {
  const out = { ...(base && typeof base === "object" ? base : {}) };
  if (!incoming || typeof incoming !== "object") return out;
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "id" || key === "created_at" || key === "updated_at") continue;
    if (!filled(out[key]) && filled(value)) out[key] = value;
  }
  return out;
}

function addressIdentity(row) {
  if (!row || typeof row !== "object") return "";
  if (row.id) return `id:${String(row.id)}`;
  return [
    row.label,
    row.recipient_name,
    row.phone,
    row.street,
    row.address_line2,
    row.city,
    row.county,
    row.postal_code,
    row.country,
  ]
    .map((v) => String(v || "").trim().toLowerCase())
    .join("\0");
}

function mergeAddresses(current, incoming) {
  const out = Array.isArray(current) ? [...current] : [];
  const seen = new Set(out.map(addressIdentity).filter(Boolean));
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const key = addressIdentity(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function getSessionWithRetry(sb) {
  for (let i = 0; i < 4; i += 1) {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (session?.user) return session;
    await new Promise((resolve) => setTimeout(resolve, 120 * (i + 1)));
  }
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session ?? null;
}

export async function migrateDemoAccountFromLegacySources() {
  const sb = getMigrationClient();
  let migratedGarage = 0;
  try {
    const beforeRaw = localStorage.getItem("garageSolutionsSavedCars");
    const before = beforeRaw ? JSON.parse(beforeRaw) : [];
    await syncGarageFromCloudAndLocal(sb);
    const afterRaw = localStorage.getItem("garageSolutionsSavedCars");
    const after = afterRaw ? JSON.parse(afterRaw) : [];
    migratedGarage = Math.max(0, (Array.isArray(after) ? after.length : 0) - (Array.isArray(before) ? before.length : 0));
  } catch (e) {
    console.warn("[demo-migration] garaj", e?.message || e);
  }

  const session = await getSessionWithRetry(sb);
  if (!session?.user) {
    return { migratedGarage, migratedAddresses: 0, migratedProfile: false, hasLegacySession: false };
  }

  let migratedAddresses = 0;
  let migratedProfile = false;

  try {
    const { data, error } = await sb
      .from("delivery_addresses")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const current = readJsonStorage(DEMO_DELIVERY_KEY, []);
    const merged = mergeAddresses(current, data || []);
    if (merged.length !== (Array.isArray(current) ? current.length : 0)) {
      writeJsonStorage(DEMO_DELIVERY_KEY, merged);
      migratedAddresses = merged.length - (Array.isArray(current) ? current.length : 0);
    }
  } catch (e) {
    console.warn("[demo-migration] adrese", e?.message || e);
  }

  try {
    const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (error) throw error;
    if (data) {
      const current = readJsonStorage(DEMO_PROFILE_KEY, {});
      const merged = mergeMissingFields(current, data);
      migratedProfile = JSON.stringify(merged) !== JSON.stringify(current);
      if (migratedProfile) writeJsonStorage(DEMO_PROFILE_KEY, merged);
    }
  } catch (e) {
    console.warn("[demo-migration] profil", e?.message || e);
  }

  return { migratedGarage, migratedAddresses, migratedProfile, hasLegacySession: true };
}
