import type { SavedGarageCar } from "./garageStorage";
import { garageOemSuspensionComplete, garageOemSuspensionFromCar } from "./garageResolvedSuspension";

/**
 * BMW OEM suspension rows: `public.bmw_variant_configurations`.
 *
 * Root cause (PostgREST / Postgres):
 * - `variant_id` and row `id` are bigint. A single invalid garage value (UUID/text) in
 *   `.in("variant_id", …)` triggers error **22P02** and drops the entire batch.
 * - Live `bmw_variant_configurations` has **no** `configuration_id` column — do not filter on it.
 *
 * Fix:
 * - `sanitizeBigintKeys` — only safe integer strings before `.in("variant_id", …)`.
 * - Batch by `variant_id` only; use `.in("id", …)` / `eq("id", …)` only for **bvc PK** (numeric).
 * - Garage keys: accept `catalogVariantId`, `bmwVariantId` / `variantId` and `catalogConfigurationId` / `bmwConfigurationId` / `configurationId`.
 */
const BMW_CONFIGURATION_LOOKUP = "bmw_configuration_lookup";

/** `bmw_variant_configurations.variant_id` (și `id`) sunt bigint în DB — un singur token nevalid rupe `.in()`. */
function sanitizeBigintKeys(ids: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const s = String(raw ?? "").trim();
    if (!s || seen.has(s)) continue;
    if (!/^\d{1,19}$/.test(s)) continue;
    const n = Number(s);
    if (!Number.isSafeInteger(n)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function variantKey(car: SavedGarageCar): string {
  const o = car as Record<string, unknown>;
  const v =
    o.catalog_variant_id ??
    o.catalogVariantId ??
    o.bmw_variant_id ??
    o.bmwVariantId ??
    o.variantId ??
    o.variant_id;
  return typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
}

function configurationKey(car: SavedGarageCar): string {
  const o = car as Record<string, unknown>;
  const v =
    o.catalog_configuration_id ??
    o.catalogConfigurationId ??
    o.bmw_configuration_id ??
    o.bmwConfigurationId ??
    o.configurationId ??
    o.configuration_id;
  return typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
}

type ConfigRow = Record<string, unknown>;

/** Citește coloanele OEM din rândul `bmw_variant_configurations` (nume flexibile). */
export function suspensionTypesFromConfigRow(row: ConfigRow | null | undefined): {
  front: string;
  rear: string;
} {
  if (!row) return { front: "", rear: "" };
  const front = String(
    row.front_suspension_type ??
      row.FrontSuspensionType ??
      row.front_suspension ??
      row.frontSuspension ??
      "",
  ).trim();
  const rear = String(
    row.rear_suspension_type ??
      row.RearSuspensionType ??
      row.rear_suspension ??
      row.rearSuspension ??
      "",
  ).trim();
  if (front || rear) return { front, rear };
  let f = "";
  let r = "";
  for (const [k, v] of Object.entries(row)) {
    const norm = k.toLowerCase().replace(/_/g, "");
    if (norm === "frontsuspensiontype" || norm === "frontsuspension") f = String(v ?? "").trim();
    if (norm === "rearsuspensiontype" || norm === "rearsuspension") r = String(v ?? "").trim();
  }
  return { front: f, rear: r };
}

function ingestRows(map: Map<string, ConfigRow>, rows: ConfigRow[] | null | undefined) {
  for (const row of rows || []) {
    const vid = String(row.variant_id ?? "").trim();
    const cid = String(row.configuration_id ?? "").trim();
    const id = String(row.id ?? "").trim();
    if (vid) map.set(`vid:${vid}`, row);
    if (cid) map.set(`cfg:${cid}`, row);
    if (id) map.set(`id:${id}`, row);
  }
}

function pickConfigRow(car: SavedGarageCar, byKey: Map<string, ConfigRow>): ConfigRow | null {
  const vk = variantKey(car);
  const ck = configurationKey(car);
  if (vk) {
    const a = byKey.get(`vid:${vk}`);
    if (a) return a;
    const b = byKey.get(`id:${vk}`);
    if (b) return b;
    // Salvări vechi: `bmwVariantId` putea fi `configuration_id` din bvc, nu `bmw_variants.id`.
    const misCfg = byKey.get(`cfg:${vk}`);
    if (misCfg) return misCfg;
  }
  if (ck) {
    const c = byKey.get(`cfg:${ck}`);
    if (c) return c;
    const d = byKey.get(`id:${ck}`);
    if (d) return d;
  }
  return null;
}

/** `bmw_configuration_lookup`: coloane uzuale `configuration_id` / `id` (dacă există în view) → `variant_id`. */
async function resolveVariantIdFromConfigurationLookup(
  sb: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
          maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
        };
      };
    };
  },
  configurationKey: string,
): Promise<string | null> {
  for (const col of ["configuration_id", "id"] as const) {
    const { data, error } = await sb
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("variant_id")
      .eq(col, configurationKey)
      .limit(1);
    if (error) continue;
    const row = Array.isArray(data) ? (data[0] as ConfigRow | undefined) : (data as ConfigRow | null);
    const vid = String(row?.variant_id ?? "").trim();
    if (vid) return vid;
  }
  return null;
}

async function suspensionFromBvcByRowPk(
  tbl: BvcQuery,
  rowId: string,
): Promise<{ front: string; rear: string } | null> {
  if (!/^\d{1,19}$/.test(rowId)) return null;
  const r = await tbl().eq("id", rowId).limit(1);
  const row = Array.isArray(r.data) ? (r.data[0] as ConfigRow | undefined) : (r.data as ConfigRow | null);
  if (r.error || !row) return null;
  const s = suspensionTypesFromConfigRow(row);
  return s.front || s.rear ? s : null;
}

type BvcQuery = () => {
  eq: (
    col: string,
    val: string,
  ) => {
    limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  };
};

async function suspensionFromBvcByVariantId(
  tbl: BvcQuery,
  variantId: string,
): Promise<{ front: string; rear: string } | null> {
  if (!/^\d{1,19}$/.test(variantId)) return null;
  const r = await tbl().eq("variant_id", variantId).limit(1);
  const row = Array.isArray(r.data) ? (r.data[0] as ConfigRow | undefined) : (r.data as ConfigRow | null);
  if (r.error || !row) return null;
  const s = suspensionTypesFromConfigRow(row);
  return s.front || s.rear ? s : null;
}

/**
 * Un singur rând din DB pentru mașina curentă (dacă batch-ul pe listă nu a umplut câmpurile).
 */
export async function fetchBmwVariantSuspensionForCar(
  car: SavedGarageCar,
): Promise<{ front: string; rear: string } | null> {
  const vk = variantKey(car);
  const ck = configurationKey(car);
  if (!vk && !ck) return null;

  try {
    const m = await import("@site-garage-cloud");
    const sb = m.getGarageCloudSupabase();
    const tbl = () => sb.from("bmw_variant_configurations").select("*");

    let trueVariantId = vk;
    if (!trueVariantId && ck) {
      trueVariantId = (await resolveVariantIdFromConfigurationLookup(sb, ck)) ?? "";
    }
    if (trueVariantId && !/^\d{1,19}$/.test(trueVariantId)) {
      trueVariantId = "";
    }

    let hit: { front: string; rear: string } | null = null;
    if (trueVariantId) {
      hit = await suspensionFromBvcByVariantId(tbl, trueVariantId);
    }
    // `bmwVariantId` vechi putea fi cheie din lookup (configuration), nu `variant_id`.
    if (!hit && vk) {
      const resolved = await resolveVariantIdFromConfigurationLookup(sb, vk);
      if (resolved) {
        hit = await suspensionFromBvcByVariantId(tbl, resolved);
      }
    }
    if (!hit && vk) {
      hit = await suspensionFromBvcByRowPk(tbl, vk);
    }
    if (hit) return hit;

    if (ck) {
      hit = await suspensionFromBvcByRowPk(tbl, ck);
      if (hit) return hit;
    }
    return null;
  } catch (e) {
    console.warn("[suspension] fetchBmwVariantSuspensionForCar", e);
    return null;
  }
}

function suspensionFromRow(row: ConfigRow): { front: string; rear: string } {
  return suspensionTypesFromConfigRow(row);
}

/**
 * Citește `public.bmw_variant_configurations` (rol `anon`, migrare 006).
 *
 * Schema: `bvc.variant_id` → `public.bmw_variants.id` (FK). Coloane OEM:
 * `front_suspension_type`, `rear_suspension_type`.
 * Exemplu join complet: `supabase/queries/bmw_variant_suspensions_join_example.sql`.
 *
 * În garaj, `bmwVariantId` trebuie să coincidă cu `bmw_variants.id` (același ID folosit în lookup).
 */
export async function enrichGarageCarsWithBmwVariantSuspension(
  cars: SavedGarageCar[],
): Promise<SavedGarageCar[]> {
  const variantIds = [...new Set(cars.map(variantKey).filter(Boolean))];
  const configIds = [...new Set(cars.map(configurationKey).filter(Boolean))];
  if (!variantIds.length && !configIds.length) return cars;

  try {
    const m = await import("@site-garage-cloud");
    const sb = m.getGarageCloudSupabase();
    const byKey = new Map<string, ConfigRow>();

    const resolvedFromConfigKeys = await Promise.all(
      configIds.map((cid) => resolveVariantIdFromConfigurationLookup(sb, cid)),
    );
    const mergedVariantIds = sanitizeBigintKeys([
      ...new Set([
        ...variantIds,
        ...resolvedFromConfigKeys.filter((x): x is string => typeof x === "string" && x.length > 0),
      ]),
    ]);

    if (mergedVariantIds.length) {
      const { data, error } = await sb
        .from("bmw_variant_configurations")
        .select("*")
        .in("variant_id", mergedVariantIds);
      if (error) {
        console.warn("[suspension] bmw_variant_configurations (variant_id):", error.message, error);
      } else {
        ingestRows(byKey, data as ConfigRow[]);
      }
    }

    const bvcRowIds = sanitizeBigintKeys(configIds);
    if (bvcRowIds.length) {
      const rId = await sb.from("bmw_variant_configurations").select("*").in("id", bvcRowIds);
      if (rId.error) {
        console.warn("[suspension] bmw_variant_configurations (id):", rId.error.message);
      } else {
        ingestRows(byKey, rId.data as ConfigRow[]);
      }
    }

    if (byKey.size === 0) {
      console.warn(
        "[suspension] Nicio linie din bmw_variant_configurations pentru variant_id (raw)=%o (variant_id filtrat numeric: %o), bmwConfigurationId=%o (id rând bvc dacă numeric). Verifică ID-uri în garaj sau date în DB.",
        variantIds,
        mergedVariantIds,
        configIds,
      );
      return cars;
    }

    return cars.map((c) => {
      if (garageOemSuspensionComplete(c)) return c;

      const cur = garageOemSuspensionFromCar(c);
      const row = pickConfigRow(c, byKey);
      if (!row) return c;
      const { front, rear } = suspensionFromRow(row);
      if (!front && !rear) return c;
      return {
        ...c,
        ...(front && !cur.front ? { front_suspension_type: front, bmwFrontSuspensionType: front } : {}),
        ...(rear && !cur.rear ? { rear_suspension_type: rear, bmwRearSuspensionType: rear } : {}),
      };
    });
  } catch (e) {
    console.warn("[suspension] enrichGarageCarsWithBmwVariantSuspension", e);
    return cars;
  }
}
