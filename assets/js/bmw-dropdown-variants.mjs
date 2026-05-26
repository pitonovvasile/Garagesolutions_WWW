/**
 * BMW catalog + configurare garaj.
 *
 * Sursă unică pentru filtre (caroserie / cutie / tracțiune / motor): **`public.bmw_technical_specs`**
 * (înlocuiește `bmw_configuration_lookup`; rândurile sunt normalizate pentru compatibilitate).
 *
 * Catalog dropdown model/generație: `bmw_dropdown_catalog`.
 */

import {
  BMW_TECHNICAL_SPECS,
  SPEC_DRVT_LAYOUT_COL,
  applyTransmissionGearToSpecsQuery,
  mapTechnicalSpecRows,
} from "./bmw-technical-specs.mjs";

/** @type {const} */
export const BMW_CONFIGURATION_LOOKUP = BMW_TECHNICAL_SPECS;
export const BMW_CONFIGURATION_DIFFERENTIAL_LOOKUP =
  "bmw_configuration_differential_lookup";

const BIGINT_MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const BIGINT_MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * @typedef {{
 *   brand_name?: string;
 *   model_id?: number;
 *   generation_id?: number | null;
 *   item_type: "model" | "generation";
 *   label: string;
 *   slug?: string;
 *   generation_code?: string | null;
 *   production_start_year?: number | null;
 *   production_end_year?: number | null;
 *   category?: string | null;
 * }} BmwDropdownItem
 */

/**
 * @typedef {{
 *   item_type: "model" | "generation";
 *   model_id: string | null;
 *   generation_id: string | null;
 * }} BmwDropdownSelection
 */

/** @param {unknown} generationId */
function coerceGenerationEq(generationId) {
  const raw =
    generationId == null || generationId === "" ? "" : String(generationId).trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

/**
 * Valoare pentru `.eq("body_style_id", …)`.
 * Număr doar dacă e întreg în interval sigur JS; altfel string (UUID sau bigint mare — evită coliziuni IEEE754).
 * @param {unknown} raw
 * @returns {string | number | null}
 */
export function coerceBodyStyleIdForQuery(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (!Number.isInteger(raw)) return String(raw);
    try {
      const bi = BigInt(raw);
      if (bi > BIGINT_MAX_SAFE || bi < BIGINT_MIN_SAFE) return String(raw);
    } catch {
      return String(raw);
    }
    return raw;
  }
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    try {
      const bi = BigInt(s);
      if (bi > BIGINT_MAX_SAFE || bi < BIGINT_MIN_SAFE) return s;
    } catch {
      return s;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  }
  return s;
}

/**
 * PostgREST poate întoarce join-uri ca obiect sau ca array cu un singur element.
 * @param {unknown} v
 * @returns {Record<string, unknown> | null}
 */
function unwrapJoinedRow(v) {
  if (v == null || typeof v !== "object") return null;
  if (Array.isArray(v)) {
    const first = v.find(
      (x) => x != null && typeof x === "object" && !Array.isArray(x),
    );
    return first ? /** @type {Record<string, unknown>} */ (first) : null;
  }
  return /** @type {Record<string, unknown>} */ (v);
}

/** @param {unknown} label */
function isPlaceholderBodyStyleLabel(label) {
  const s = String(label ?? "").trim();
  if (!s) return true;
  return /^caroserie\s*\(/i.test(s);
}

/** @param {unknown} cur @param {unknown} candidate */
function preferRicherBodyStyleLabel(cur, candidate) {
  const next = String(candidate ?? "").trim();
  if (!next) return String(cur ?? "").trim();
  const curS = String(cur ?? "").trim();
  if (!curS || isPlaceholderBodyStyleLabel(curS)) return next;
  if (isPlaceholderBodyStyleLabel(next)) return curS;
  return next.length > curS.length ? next : curS;
}

/** @param {{ label?: string; body_style_id?: unknown; code?: unknown; name?: unknown }[]} items */
function disambiguateBodyStyleDisplayLabels(items) {
  /** @type {Map<string, typeof items>} */
  const byLabel = new Map();
  for (const it of items) {
    const lb =
      String(it.label ?? "").trim() ||
      `Caroserie (${String(it.body_style_id ?? "")})`;
    if (!byLabel.has(lb)) byLabel.set(lb, []);
    byLabel.get(lb)?.push(it);
  }
  for (const group of byLabel.values()) {
    if (!group || group.length <= 1) continue;
    for (const it of group) {
      const base =
        String(it.label ?? "").trim() ||
        `Caroserie (${String(it.body_style_id ?? "")})`;
      const hint = pickFirstNonEmptyString(it.code, it.name);
      const shown = hint ? `${base} (${hint})` : base;
      it.label = `${shown} · ${String(it.body_style_id ?? "")}`;
    }
  }
}

/** @param {import("@supabase/supabase-js").SupabaseClient} supabase */
async function fetchLookupWhereGeneration(supabase, generationId, limit = 8000) {
  const genEq = coerceGenerationEq(generationId);
  if (genEq == null) return { data: [], error: null };

  let res = await supabase
    .from(BMW_CONFIGURATION_LOOKUP)
    .select("*")
    .eq("generation_id", genEq)
    .limit(limit);

  if (res.data) res.data = mapTechnicalSpecRows(/** @type {unknown[]} */ (res.data));

  if (!(res.data || []).length && typeof genEq === "number") {
    const alt = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("generation_id", String(generationId).trim())
      .limit(limit);
    if (!alt.error && (alt.data || []).length) res = alt;
  }

  if (res.data) res.data = mapTechnicalSpecRows(/** @type {unknown[]} */ (res.data));

  return res;
}

/** Coloane scalare — fără embed-uri JSON (evită „primul element din array”). */
function bodyStyleIdFromScalarColumnsOnly(r) {
  if (!r || typeof r !== "object") return null;
  const candidates = [
    r.body_style_id,
    r.bodyStyleId,
    r.body_styles_id,
    r.body_style_pk,
    r.bs_id,
    r.fk_body_style_id,
    r.variant_body_style_id,
  ];
  for (const raw of candidates) {
    const v = coerceBodyStyleIdForQuery(raw);
    if (v != null) return v;
  }
  return null;
}

/**
 * Toate ID-urile de caroserie dintr-un rând lookup.
 * Dacă există `body_style_id` scalar, îl folosim singur; altfel colectăm din array-uri `body_styles` / `body_style`.
 * @param {Record<string, unknown> | null | undefined} r
 * @returns {(string | number)[]}
 */
export function bodyStyleIdsFromConfigurationRow(r) {
  if (!r || typeof r !== "object") return [];
  const scalar = bodyStyleIdFromScalarColumnsOnly(r);
  if (scalar != null) return [scalar];

  /** @param {unknown} list */
  const idsFromArray = (list) => {
    if (!Array.isArray(list)) return [];
    /** @type {(string | number)[]} */
    const acc = [];
    for (const el of list) {
      if (el == null || typeof el !== "object") continue;
      const o = /** @type {Record<string, unknown>} */ (el);
      const id = coerceBodyStyleIdForQuery(o.id ?? o.body_style_id);
      if (id != null) acc.push(id);
    }
    return acc;
  };

  const merged = [
    ...idsFromArray(r.body_styles),
    ...idsFromArray(r.body_style),
  ];
  const seen = new Set();
  /** @type {(string | number)[]} */
  const uniq = [];
  for (const id of merged) {
    const k = String(id);
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(id);
  }
  return uniq;
}

/** Primul ID disponibil (compat cu cod vechi). */
export function bodyStyleIdFromConfigurationRow(r) {
  const ids = bodyStyleIdsFromConfigurationRow(r);
  return ids[0] ?? null;
}

/** @param {Record<string, unknown>} o */
function bodyStyleLabelFromEmbedObject(o) {
  const code = pickFirstNonEmptyString(
    o.code,
    o.slug,
    o.body_style_code,
  );
  const name = pickFirstNonEmptyString(o.name, o.label, o.body_style_name);
  if (
    name &&
    code &&
    name !== code &&
    !String(name).includes(String(code))
  ) {
    return `${name} (${code})`;
  }
  return pickFirstNonEmptyString(name, code, "");
}

/** Etichetă pentru un `eq` când rândul are array embed (nu doar primul element). */
function labelForBodyStyleIdFromRow(r, eq) {
  if (!r || typeof r !== "object") return "";
  if (bodyStyleIdFromScalarColumnsOnly(r) != null)
    return bodyStyleLabelFromConfigurationRow(r);

  /** @param {unknown} list */
  const matchFromArray = (list) => {
    if (!Array.isArray(list)) return "";
    for (const el of list) {
      if (el == null || typeof el !== "object") continue;
      const o = /** @type {Record<string, unknown>} */ (el);
      const id = coerceBodyStyleIdForQuery(o.id ?? o.body_style_id);
      if (id != null && String(id) === String(eq))
        return bodyStyleLabelFromEmbedObject(o);
    }
    return "";
  };

  return pickFirstNonEmptyString(
    matchFromArray(r.body_styles),
    matchFromArray(r.body_style),
    bodyStyleLabelFromConfigurationRow(r),
  );
}

/** @param {Record<string, unknown> | null | undefined} r */
function bodyStyleLabelFromConfigurationRow(r) {
  if (!r || typeof r !== "object") return "";
  const nested = unwrapJoinedRow(r.body_style);
  const nestedStyles = unwrapJoinedRow(r.body_styles);

  const code = pickFirstNonEmptyString(
    nested?.code,
    nestedStyles?.code,
    r.body_style_code,
    r.bs_code,
    r.body_style_slug,
  );
  const name = pickFirstNonEmptyString(
    nested?.name,
    nested?.label,
    nestedStyles?.name,
    nestedStyles?.label,
    r.body_style_name,
    r.bodyStyleName,
    r.body_style_label,
    typeof r.body_style === "string" ? r.body_style : null,
    r.bs_name,
    r.body_styles_name,
  );

  if (
    name &&
    code &&
    name !== code &&
    !String(name).includes(String(code))
  ) {
    return `${name} (${code})`;
  }
  if (name) return name;
  if (code) return code;

  const fallback = pickFirstNonEmptyString(r.category, "");
  return fallback;
}

/** @param {string | number | null | undefined} bid */
function alternateBodyStyleEqForRetry(bid) {
  if (bid == null) return null;
  if (typeof bid === "number") return String(bid);
  if (typeof bid === "string" && /^\d+$/.test(bid.trim())) {
    try {
      const bi = BigInt(bid.trim());
      if (bi > BIGINT_MAX_SAFE || bi < BIGINT_MIN_SAFE) return null;
    } catch {
      return null;
    }
    return Number(bid.trim());
  }
  return null;
}

function pickFirstNonEmptyString(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/** Etichetă din cilindree / putere când lipsește numele variantei. */
function syntheticBmwEngineLabel(r) {
  if (!r || typeof r !== "object") return "";
  const cc = r.displacement_cc;
  let disp = "";
  if (cc != null && cc !== "") {
    const n = Number(cc);
    if (Number.isFinite(n) && n > 0) {
      disp = `${(n / 1000).toFixed(1)}L`;
    }
  }
  const pv = r.power_value;
  let power = "";
  if (pv != null && String(pv).trim() !== "") {
    const pu = String(r.power_unit ?? "").trim();
    const rpm =
      r.power_rpm != null && String(r.power_rpm).trim() !== ""
        ? ` @ ${String(r.power_rpm).trim()} rpm`
        : "";
    power = `${String(pv).trim()}${pu ? ` ${pu}` : ""}${rpm}`;
  }
  const eng = pickFirstNonEmptyString(r.engine_type, r.fuel_type);
  const bits = [disp, power, eng].filter(Boolean);
  return bits.join(" · ");
}

/**
 * Etichetă motor UI: cilindree + Benzină/Diesel din `engine_code` / `variant_name` (doar afișare, nu filtre).
 * @param {Record<string, unknown>} v
 */
export function formatBmwMotorLabel(v) {
  if (!v || typeof v !== "object") return "?L (Necunoscut)";
  const cc = Number(v.displacement_cc);
  const liters =
    Number.isFinite(cc) && cc > 0 ? Number(cc / 1000).toFixed(1) : "?";
  const ec = String(v.engine_code ?? "").toLowerCase();
  const vn = String(v.variant_name ?? "").toLowerCase();
  let fuel = "Necunoscut";
  if (
    ec.endsWith("d") ||
    vn.endsWith("d") ||
    /\bdiesel\b|tdi|cdi/.test(ec + vn)
  ) {
    fuel = "Diesel";
  } else if (
    ec.endsWith("ci") ||
    vn.endsWith("ci") ||
    ec.endsWith("i") ||
    vn.endsWith("i")
  ) {
    fuel = "Benzină";
  }
  return `${liters}L (${fuel})`;
}

/** Compară gear_count incluzând null vs gol. */
export function gearCountsEqual(a, b) {
  const na = a == null || a === "" ? null : Number(a);
  const nb = b == null || b === "" ? null : Number(b);
  if (na == null && nb == null) return true;
  if (na != null && nb != null && Number.isFinite(na) && Number.isFinite(nb))
    return na === nb;
  return String(a ?? "") === String(b ?? "");
}

/**
 * Filtre SQL pe `bmw_technical_specs`: transmisie / trepte pe coloanele `configuration_*`.
 * `gear_count`: PostgREST poate cere tip diferit (int vs text) — variante încercate în `runLookupUntilRows`.
 */

/** @returns {({ mode: 'is_null' } | { mode: 'eq'; value: string | number })[]} */
function transmissionGearFilterVariants(transmission) {
  const gc = transmission?.gear_count;
  if (
    gc == null ||
    gc === "" ||
    (typeof gc === "number" && !Number.isFinite(gc))
  ) {
    return [{ mode: "is_null" }];
  }
  const n = Number(gc);
  /** @type {(string | number)[]} */
  const vals = [];
  if (Number.isFinite(n)) vals.push(n, String(n));
  const raw = String(gc).trim();
  if (raw && !vals.includes(raw)) vals.push(raw);
  return [...new Set(vals)].map((value) => ({ mode: "eq", value }));
}

/** Valori de încercat pentru .eq(drivetrain_layout) — majuscule/minuscule în DB. */
function drivetrainLayoutEqVariants(layout) {
  const p = String(layout ?? "").trim();
  if (!p) return [];
  const s = new Set([p, p.toLowerCase(), p.toUpperCase()]);
  return [...s].filter(Boolean);
}

/**
 * Filtru strict: `generation_id` + `body_style_id` + transmisie (+ opțional `drivetrain_layout`).
 * Nu folosi `model_id` sau omiterea caroseriei — ar amesteca generații în UI.
 */
async function runLookupUntilRows(
  supabase,
  generationId,
  bodyStyleTry,
  transmission,
  selectCols,
  drivetrainLayoutEq,
) {
  const gid = coerceGenerationEq(generationId);
  if (gid == null) return { data: [], error: null };

  const gearVars = transmissionGearFilterVariants(transmission);
  const layoutVars =
    drivetrainLayoutEq == null || String(drivetrainLayoutEq).trim() === ""
      ? [null]
      : drivetrainLayoutEqVariants(drivetrainLayoutEq);

  /** @type {unknown | null} */
  let lastErr = null;

  /** Nu folosi `async` aici: returnarea unui thenable din `async` îl împachetează în `Promise.resolve(q)` și `await once()` nu mai execută request-ul Supabase. */
  function once(genEq, bTry, gearVar, layoutEq) {
    let q = supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select(selectCols)
      .eq("generation_id", genEq)
      .eq("body_style_id", bTry)
      .limit(8000);
    if (layoutEq != null) {
      q = q.eq(SPEC_DRVT_LAYOUT_COL, layoutEq);
    }
    q = applyTransmissionGearToSpecsQuery(q, transmission, gearVar);
    return q;
  }

  for (const layoutEq of layoutVars) {
    for (const gearVar of gearVars) {
      let res = await once(gid, bodyStyleTry, gearVar, layoutEq);
      if (!(res.data || []).length && typeof gid === "number") {
        res = await once(String(generationId).trim(), bodyStyleTry, gearVar, layoutEq);
      }
      lastErr = res.error ?? lastErr;
      if ((res.data || []).length) {
        return {
          data: mapTechnicalSpecRows(/** @type {unknown[]} */ (res.data || [])),
          error: res.error ?? null,
        };
      }
    }
  }

  return { data: [], error: lastErr };
}

function transmissionKey(transmissionType, gearCount) {
  const tt = String(transmissionType ?? "").trim();
  const gc =
    gearCount == null || gearCount === ""
      ? ""
      : String(gearCount).trim();
  return `${tt}\u0000${gc}`;
}

function drivetrainKey(layout, label) {
  return `${String(layout ?? "").trim()}\u0000${String(label ?? "").trim()}`;
}

function differentialLabelPriority(label) {
  const s = String(label ?? "").trim().toLowerCase();
  if (!s) return 99;
  if (s === "factory lsd") return 0;
  if (s === "open differential") return 1;
  if (s === "optional factory lsd") return 2;
  if (s === "aftermarket / custom lsd") return 3;
  return 10;
}

/** @param {Record<string, unknown>} row */
function differentialDisplayLabelFromRow(row) {
  return String(
    row.differential_label ??
      row.diff_label ??
      row.differential_type ??
      row.diff_type ??
      row.label ??
      row.name ??
      row.differential ??
      "",
  ).trim();
}

/** @param {unknown} raw */
function coerceVariantEq(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  }
  return s;
}

/**
 * Diferențiale pentru configurația BMW selectată:
 * - preferă filtrare pe `configuration_id`;
 * - fallback pe combinația: generation_id + body_style_id + variant_id + transmission_type + gear_count + drivetrain_layout.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   configurationIds?: (string | number)[];
 *   generationId?: string | number | null;
 *   bodyStyleId?: string | number | null;
 *   variantId?: string | number | null;
 *   transmissionType?: string | null;
 *   gearCount?: string | number | null;
 *   drivetrainLayout?: string | null;
 * }} filters
 */
export async function fetchDifferentialsForConfigurationLookup(supabase, filters) {
  const cfgIds = [...new Set((filters.configurationIds || []).map((x) => String(x).trim()).filter(Boolean))];
  const gid = coerceGenerationEq(filters.generationId);
  const bid = coerceBodyStyleIdForQuery(filters.bodyStyleId);
  const vid = coerceVariantEq(filters.variantId);
  const tt = String(filters.transmissionType ?? "").trim();
  const dl = String(filters.drivetrainLayout ?? "").trim();
  const gcRaw = filters.gearCount;

  /** @type {unknown | null} */
  let lastErr = null;
  /** @type {Record<string, unknown>[]} */
  let rows = [];

  if (cfgIds.length) {
    const asNumbers = cfgIds
      .filter((x) => /^\d+$/.test(x))
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));
    const cfgAttempts = [cfgIds, asNumbers].filter((arr, idx, all) =>
      arr.length && all.findIndex((x) => JSON.stringify(x) === JSON.stringify(arr)) === idx,
    );
    for (const arr of cfgAttempts) {
      const res = await supabase
        .from(BMW_CONFIGURATION_DIFFERENTIAL_LOOKUP)
        .select("*")
        .in("configuration_id", arr)
        .limit(8000);
      lastErr = res.error ?? lastErr;
      if ((res.data || []).length) {
        rows = /** @type {Record<string, unknown>[]} */ (res.data || []);
        break;
      }
    }
  }

  if (!rows.length && gid != null && bid != null && vid != null && tt && dl) {
    /** @param {string | number} genEq */
    const runCombo = async (genEq) => {
      let q = supabase
        .from(BMW_CONFIGURATION_DIFFERENTIAL_LOOKUP)
        .select("*")
        .eq("generation_id", genEq)
        .eq("body_style_id", bid)
        .eq("variant_id", vid)
        .eq("transmission_type", tt)
        .eq("drivetrain_layout", dl)
        .limit(8000);
      if (gcRaw == null || gcRaw === "") {
        q = q.is("gear_count", null);
      } else {
        const gcN = Number(gcRaw);
        q = q.eq("gear_count", Number.isFinite(gcN) ? gcN : String(gcRaw).trim());
      }
      return q;
    };

    let res = await runCombo(gid);
    lastErr = res.error ?? lastErr;
    if (!(res.data || []).length && typeof gid === "number") {
      const alt = await runCombo(String(filters.generationId ?? "").trim());
      if (!alt.error && (alt.data || []).length) res = alt;
      lastErr = alt.error ?? lastErr;
    }
    rows = /** @type {Record<string, unknown>[]} */ (res.data || []);
  }

  if (lastErr && !rows.length) {
    return { data: [], error: lastErr };
  }

  const byLabel = new Map();
  for (const r of rows) {
    const label = differentialDisplayLabelFromRow(r);
    if (!label) continue;
    const k = label.toLowerCase();
    if (!byLabel.has(k)) byLabel.set(k, label);
  }
  const out = [...byLabel.values()]
    .sort((a, b) => {
      const pa = differentialLabelPriority(a);
      const pb = differentialLabelPriority(b);
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b, "ro", { sensitivity: "base" });
    })
    .map((label) => ({ label }));

  return { data: out, error: out.length ? null : lastErr };
}

/**
 * Pool lookup: generație + caroserie (încearcă body_style_id și forma alternativă numerică/string).
 * @param {string} selectCols - coloane PostgREST, ex. `"transmission_type, gear_count"`
 */
async function fetchBmwLookupGenerationBody(
  supabase,
  generationId,
  bodyStyleId,
  selectCols,
) {
  const gid = coerceGenerationEq(generationId);
  const bid = coerceBodyStyleIdForQuery(bodyStyleId);
  if (gid == null || bid == null) {
    return { data: [], error: null };
  }

  const attempts = [bid, alternateBodyStyleEqForRetry(bid)].filter(
    (x, i, a) => x != null && a.indexOf(x) === i,
  );

  /** @type {unknown | null} */
  let lastErr = null;
  for (const bTry of attempts) {
    let res = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select(selectCols)
      .eq("generation_id", gid)
      .eq("body_style_id", bTry)
      .limit(8000);

    if (!(res.data || []).length && typeof gid === "number") {
      const alt = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select(selectCols)
        .eq("generation_id", String(generationId).trim())
        .eq("body_style_id", bTry)
        .limit(8000);
      if (!alt.error && (alt.data || []).length) res = alt;
    }

    lastErr = res.error ?? lastErr;
    if ((res.data || []).length) {
      return {
        data: mapTechnicalSpecRows(/** @type {unknown[]} */ (res.data || [])),
        error: res.error ?? null,
      };
    }
  }

  return { data: [], error: lastErr };
}

/**
 * Token chassis BMW (E60, F10, G30) din începutul stringului — evită potriviri prefix greșite (F3 vs F30).
 * @param {unknown} code
 */
function extractBmwChassisToken(code) {
  const t = String(code ?? "").trim();
  const m = t.match(/^([A-Za-z]{1,3}\d{2})\b/);
  return m ? m[1].toUpperCase() : t.toUpperCase();
}

/**
 * Când în lookup există mai multe `generation_id` pentru același model + caroserie,
 * alege pe cel care în **`generations`** are același `code` ca generația aleasă în UI (ex. E60).
 * Rezolvă decalajul catalog `generations.id` ↔ `generation_id` din datele de configurare.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string[]} candidateIds
 * @param {string} generationCode cod din `generations.code` (dataset generație)
 */
async function pickLookupGenerationIdViaGenerationsTable(
  supabase,
  candidateIds,
  generationCode,
) {
  const raw = String(generationCode ?? "").trim();
  if (!raw || candidateIds.length < 2) return null;

  const ids = [...new Set(candidateIds.map((x) => String(x).trim()))].filter(
    Boolean,
  );
  if (ids.length < 2) return null;

  let res = await supabase
    .from("generations")
    .select("id, code")
    .in("id", ids);

  if (res.error || !(res.data || []).length) {
    const nums = ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    if (nums.length === ids.length) {
      const alt = await supabase
        .from("generations")
        .select("id, code")
        .in("id", nums);
      if (!alt.error && (alt.data || []).length) res = alt;
    }
  }

  if (res.error) {
    console.warn("[BMW] pickLookupGenerationIdViaGenerationsTable:", res.error);
    return null;
  }

  const rows = res.data || [];
  // #region agent log
  fetch("http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "b42d70",
    },
    body: JSON.stringify({
      sessionId: "b42d70",
      hypothesisId: "H7",
      location:
        "bmw-dropdown-variants.mjs:pickLookupGenerationIdViaGenerationsTable:candidates",
      message: "generations rows for lookup candidate ids",
      data: {
        wantCode: raw,
        rowCount: rows.length,
        pairs: rows.slice(0, 12).map((r) => ({
          id: String(r?.id ?? ""),
          code: String(r?.code ?? ""),
        })),
      },
      timestamp: Date.now(),
      runId: "catalog-code-fallback",
    }),
  }).catch(() => {});
  // #endregion
  const wantTok = extractBmwChassisToken(raw);
  if (!wantTok) return null;

  const byToken = rows.filter(
    (r) => extractBmwChassisToken(r.code) === wantTok,
  );
  /** Ordonare stabilă dacă există duplicate în DB (același cod pe mai multe rânduri). */
  byToken.sort((a, b) =>
    String(a?.id ?? "").localeCompare(String(b?.id ?? ""), undefined, {
      numeric: true,
    }),
  );
  const chosen =
    byToken.length >= 1 ? /** @type {{ id: unknown }} */ (byToken[0]) : null;
  if (byToken.length > 1) {
    console.warn("[BMW] Mai multe generations cu același chassis token în candidați:", {
      wantTok,
      ids: byToken.map((r) => r.id),
    });
  }
  if (chosen?.id != null && String(chosen.id).trim() !== "") {
    // #region agent log
    fetch("http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b42d70",
      },
      body: JSON.stringify({
        sessionId: "b42d70",
        hypothesisId: "H5",
        location:
          "bmw-dropdown-variants.mjs:pickLookupGenerationIdViaGenerationsTable",
        message: "matched generations.code to disambiguate lookup generation_id",
        data: {
          chosenId: String(chosen.id),
          generationCode: raw,
          chassisToken: wantTok,
          tieBreakCount: byToken.length,
          candidateCount: ids.length,
        },
        timestamp: Date.now(),
        runId: "post-fix-gen-table",
      }),
    }).catch(() => {});
    // #endregion
    return chosen.id;
  }

  return null;
}

/**
 * Dacă `generations.id` nu apare în lookup dar există rânduri pentru același model + cod generație (ex. E60)
 * + caroserie, întoarce `generation_id`-ul din lookup. Altfel întoarce id-ul din catalog.
 * Nu folosi doar `model_id` — mereu includem `generation_code` + `body_style_id`.
 * @param {{ modelId?: string | number | null; generationCode?: string | null }} [options]
 */
export async function resolveBmwLookupGenerationId(
  supabase,
  catalogGenerationId,
  bodyStyleId,
  options = {},
) {
  const modelId = options.modelId;
  const generationCodeRaw = options.generationCode;
  const generationCode =
    generationCodeRaw == null ? "" : String(generationCodeRaw).trim();

  const probe = await fetchBmwLookupGenerationBody(
    supabase,
    catalogGenerationId,
    bodyStyleId,
    "generation_id",
  );
  // #region agent log
  fetch("http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "b42d70",
    },
    body: JSON.stringify({
      sessionId: "b42d70",
      hypothesisId: "H1",
      location: "bmw-dropdown-variants.mjs:resolveBmwLookupGenerationId:probe",
      message: "strict catalog gen + body in lookup",
      data: {
        catalogGenerationId: String(catalogGenerationId),
        bodyStyleId: String(bodyStyleId),
        strictRowCount: (probe.data || []).length,
        probeError: probe.error
          ? String(
              probe.error.message ||
                /** @type {{ code?: string }} */ (probe.error).code ||
                probe.error,
            )
          : null,
      },
      timestamp: Date.now(),
      runId: "lookup-remap-v2",
    }),
  }).catch(() => {});
  // #endregion

  if ((probe.data || []).length) {
    return catalogGenerationId;
  }

  const mid = coerceGenerationEq(modelId);
  const bid = coerceBodyStyleIdForQuery(bodyStyleId);
  if (mid == null || bid == null) {
    return catalogGenerationId;
  }

  /** Cod chassis pentru remap — din `<option data-generation-code>` sau din `generations.code` (catalog). */
  let generationCodeForRemap = generationCode;
  if (!generationCodeForRemap && catalogGenerationId != null) {
    const gidEq = coerceGenerationEq(catalogGenerationId);
    if (gidEq != null) {
      let gr = await supabase
        .from("generations")
        .select("code")
        .eq("id", gidEq)
        .limit(1)
        .maybeSingle();
      if (!(gr.data?.code) && typeof gidEq === "number") {
        gr = await supabase
          .from("generations")
          .select("code")
          .eq("id", String(catalogGenerationId).trim())
          .limit(1)
          .maybeSingle();
      }
      const fetched = String(gr.data?.code ?? "").trim();
      if (fetched) generationCodeForRemap = fetched;
      // #region agent log
      fetch("http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "b42d70",
        },
        body: JSON.stringify({
          sessionId: "b42d70",
          hypothesisId: "H6",
          location:
            "bmw-dropdown-variants.mjs:resolveBmwLookupGenerationId:catalogCodeFallback",
          message: "generation code for remap (dataset vs generations table)",
          data: {
            hadDatasetCode: Boolean(generationCode),
            catalogGenerationId: String(catalogGenerationId),
            fetchedCode: fetched || null,
            genQueryError: gr.error
              ? String(
                  gr.error.message ||
                    /** @type {{ code?: string }} */ (gr.error).code ||
                    gr.error,
                )
              : null,
          },
          timestamp: Date.now(),
          runId: "catalog-code-fallback",
        }),
      }).catch(() => {});
      // #endregion
    }
  }

  const attempts = [bid, alternateBodyStyleEqForRetry(bid)].filter(
    (x, i, a) => x != null && a.indexOf(x) === i,
  );
  const codeVariants = generationCodeForRemap
    ? [
        ...new Set([
          generationCodeForRemap,
          generationCodeForRemap.toLowerCase(),
          generationCodeForRemap.toUpperCase(),
        ]),
      ].filter(Boolean)
    : [];

  /** @param {string} tier */
  const tryRemap = async (tier, queryFn) => {
    for (const bTry of attempts) {
      const got = await queryFn(bTry);
      if (got != null && String(got).trim() !== "") {
        // #region agent log
        fetch("http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "b42d70",
          },
          body: JSON.stringify({
            sessionId: "b42d70",
            hypothesisId: "H2",
            location: "bmw-dropdown-variants.mjs:resolveBmwLookupGenerationId:remap",
            message: "remap hit",
            data: {
              tier,
              catalogGenerationId: String(catalogGenerationId),
              lookup_generation_id: got,
            },
            timestamp: Date.now(),
            runId: "lookup-remap-v2",
          }),
        }).catch(() => {});
        // #endregion
        console.log("[BMW] lookup generation_id remap", {
          tier,
          catalog_generation_id: catalogGenerationId,
          lookup_generation_id: got,
        });
        return got;
      }
    }
    return null;
  };

  if (codeVariants.length) {
    const exact = await tryRemap("exact_code", async (bTry) => {
      for (const codeEq of codeVariants) {
        let res = await supabase
          .from(BMW_CONFIGURATION_LOOKUP)
          .select("generation_id")
          .eq("model_id", mid)
          .eq("generation_code", codeEq)
          .eq("body_style_id", bTry)
          .limit(1);

        if (res.error) {
          console.warn("[BMW] resolveBmwLookupGenerationId (exact):", res.error);
          continue;
        }

        if (!(res.data || []).length && typeof mid === "number") {
          const alt = await supabase
            .from(BMW_CONFIGURATION_LOOKUP)
            .select("generation_id")
            .eq("model_id", String(modelId).trim())
            .eq("generation_code", codeEq)
            .eq("body_style_id", bTry)
            .limit(1);
          if (!alt.error && (alt.data || []).length) res = alt;
        }

        const got = res.data?.[0]?.generation_id;
        if (got != null && String(got).trim() !== "") return got;
      }
      return null;
    });
    if (exact != null) return exact;

    const ilike = await tryRemap("ilike_code", async (bTry) => {
      let res = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("generation_id")
        .eq("model_id", mid)
        .eq("body_style_id", bTry)
        .ilike("generation_code", `%${generationCodeForRemap}%`)
        .limit(1);
      if (res.error) {
        console.warn("[BMW] resolveBmwLookupGenerationId (ilike):", res.error);
        return null;
      }
      if (!(res.data || []).length && typeof mid === "number") {
        const alt = await supabase
          .from(BMW_CONFIGURATION_LOOKUP)
          .select("generation_id")
          .eq("model_id", String(modelId).trim())
          .eq("body_style_id", bTry)
          .ilike("generation_code", `%${generationCodeForRemap}%`)
          .limit(1);
        if (!alt.error && (alt.data || []).length) res = alt;
      }
      return res.data?.[0]?.generation_id ?? null;
    });
    if (ilike != null) return ilike;
  }

  /** Mai multe generation_id în lookup pentru același model+caroserie — potrivește `generations.code` (E60 etc.). */
  if (String(generationCodeForRemap ?? "").trim()) {
    const viaGenTable = await tryRemap(
      "generations_code_match",
      async (bTry) => {
        let res = await supabase
          .from(BMW_CONFIGURATION_LOOKUP)
          .select("generation_id")
          .eq("model_id", mid)
          .eq("body_style_id", bTry)
          .limit(800);
        if (res.error) return null;
        if (!(res.data || []).length && typeof mid === "number") {
          const alt = await supabase
            .from(BMW_CONFIGURATION_LOOKUP)
            .select("generation_id")
            .eq("model_id", String(modelId).trim())
            .eq("body_style_id", bTry)
            .limit(800);
          if (!alt.error && (alt.data || []).length) res = alt;
        }
        const candIds = [
          ...new Set(
            (res.data || [])
              .map((r) => r?.generation_id)
              .filter((x) => x != null && String(x).trim() !== ""),
          ),
        ].map((x) => String(x));
        if (candIds.length < 2) return null;
        return pickLookupGenerationIdViaGenerationsTable(
          supabase,
          candIds,
          generationCodeForRemap,
        );
      },
    );
    if (viaGenTable != null) return viaGenTable;
  }

  const uniqueGen = await tryRemap("unique_model_body", async (bTry) => {
    let res = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("generation_id")
      .eq("model_id", mid)
      .eq("body_style_id", bTry)
      .limit(800);
    if (res.error) {
      console.warn("[BMW] resolveBmwLookupGenerationId (unique):", res.error);
      return null;
    }
    if (!(res.data || []).length && typeof mid === "number") {
      const alt = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("generation_id")
        .eq("model_id", String(modelId).trim())
        .eq("body_style_id", bTry)
        .limit(800);
      if (!alt.error && (alt.data || []).length) res = alt;
    }
    const ids = [
      ...new Set(
        (res.data || [])
          .map((r) => r?.generation_id)
          .filter((x) => x != null && String(x).trim() !== ""),
      ),
    ].map((x) => String(x));
    // #region agent log
    fetch("http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b42d70",
      },
      body: JSON.stringify({
        sessionId: "b42d70",
        hypothesisId: "H3",
        location: "bmw-dropdown-variants.mjs:resolveBmwLookupGenerationId:unique",
        message: "distinct generation_ids for model+body",
        data: {
          bodyTry: String(bTry),
          distinctCount: ids.length,
          distinctIds: ids.slice(0, 12),
        },
        timestamp: Date.now(),
        runId: "lookup-remap-v2",
      }),
    }).catch(() => {});
    // #endregion
    if (ids.length === 1) return ids[0];
    return null;
  });
  if (uniqueGen != null) return uniqueGen;

  return catalogGenerationId;
}

/**
 * Caroserii distincte pentru generație — doar din `bmw_configuration_lookup`.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number | null | undefined} generationId
 */
export async function fetchBodyStylesForGeneration(supabase, generationId) {
  const id =
    generationId == null || generationId === ""
      ? null
      : String(generationId).trim();
  if (!id) return { data: [], error: null };

  const pack = await fetchLookupWhereGeneration(supabase, id);
  if (pack.error) {
    console.error("[BMW] bmw_configuration_lookup (caroserii):", pack.error);
    return { data: [], error: pack.error };
  }

  /** @type {Map<string, { eq: string | number; label: string; code: string | null; name: string | null }>} */
  const labelByKey = new Map();
  for (const r of pack.data || []) {
    const row = /** @type {Record<string, unknown>} */ (r);
    const ids = bodyStyleIdsFromConfigurationRow(row);
    for (const eq of ids) {
      const key = String(eq);
      const lbl = labelForBodyStyleIdFromRow(row, eq);
      if (!labelByKey.has(key)) {
        labelByKey.set(key, {
          eq,
          label: lbl || `Caroserie (${key})`,
          code: null,
          name: null,
        });
      } else {
        const entry = labelByKey.get(key);
        if (entry)
          entry.label = preferRicherBodyStyleLabel(entry.label, lbl || "");
      }
    }
  }

  if ((pack.data || []).length && labelByKey.size === 0) {
    const sample = /** @type {Record<string, unknown>} */ (pack.data[0]);
    console.warn(
      "[BMW] configuration_lookup: există rânduri dar niciun body_style_id parsabil — sample keys:",
      sample ? Object.keys(sample).slice(0, 48) : [],
    );
  }

  const decimalIdKeys = [...labelByKey.keys()].filter((k) => /^\d+$/.test(k));
  if (decimalIdKeys.length) {
    const { data: bsRows, error: bsErr } = await supabase
      .from("body_styles")
      .select("id,name,code")
      .in("id", decimalIdKeys);
    if (!bsErr && (bsRows || []).length) {
      for (const bs of bsRows || []) {
        const key = String(bs.id);
        const row = labelByKey.get(key);
        if (!row) continue;
        const nm = pickFirstNonEmptyString(bs.name);
        const cd = pickFirstNonEmptyString(bs.code);
        row.name = nm || row.name;
        row.code = cd || row.code;
        const canonical = pickFirstNonEmptyString(bs.name, bs.code);
        if (canonical)
          row.label = preferRicherBodyStyleLabel(row.label, canonical);
      }
    }
  }

  const out = [...labelByKey.values()].map(({ eq, label, code, name }) => ({
    body_style_id: eq,
    code,
    name,
    label:
      pickFirstNonEmptyString(label) ||
      pickFirstNonEmptyString(name, code) ||
      `Caroserie (${String(eq)})`,
  }));
  disambiguateBodyStyleDisplayLabels(out);
  out.sort((a, b) =>
    a.label.localeCompare(b.label, "ro", { sensitivity: "base" }),
  );

  console.log("[BMW] fetchBodyStylesForGeneration (configuration_lookup)", {
    generation_id: coerceGenerationEq(id),
    rowCount: out.length,
  });

  return { data: out, error: null };
}

/**
 * Cutii distincte — strict `generation_id` + `body_style_id` în `bmw_configuration_lookup`.
 * Fără fallback pe model sau generație întreagă (evită amestecarea generațiilor în UI).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function fetchTransmissionsForGenerationBodyStyle(
  supabase,
  generationId,
  bodyStyleId,
) {
  const gid = coerceGenerationEq(generationId);
  const bid = coerceBodyStyleIdForQuery(bodyStyleId);
  if (gid == null || bid == null) {
    return { data: [], error: null };
  }

  const res = await fetchBmwLookupGenerationBody(
    supabase,
    generationId,
    bodyStyleId,
    "transmission_type, gear_count",
  );

  if (res.error && !(res.data || []).length) {
    console.error("[BMW] transmissions lookup:", res.error);
    return { data: [], error: res.error };
  }

  const seen = new Set();
  /** @type {{ transmission_type: string; gear_count: unknown }[]} */
  const out = [];
  for (const r of res.data || []) {
    const tt = String(r?.transmission_type ?? "").trim();
    const gc = r?.gear_count;
    if (!tt && (gc == null || String(gc).trim() === "")) continue;
    const k = transmissionKey(tt, gc);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ transmission_type: tt, gear_count: gc });
  }

  out.sort((a, b) =>
    transmissionKey(a.transmission_type, a.gear_count).localeCompare(
      transmissionKey(b.transmission_type, b.gear_count),
      "ro",
      { sensitivity: "base" },
    ),
  );

  // #region agent log
  fetch("http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "b42d70",
    },
    body: JSON.stringify({
      sessionId: "b42d70",
      hypothesisId: "H4",
      location:
        "bmw-dropdown-variants.mjs:fetchTransmissionsForGenerationBodyStyle",
      message: "transmissions after lookup",
      data: {
        generationId: String(generationId),
        bodyStyleId: String(bodyStyleId),
        rawLookupRows: (res.data || []).length,
        distinctTransmissions: out.length,
      },
      timestamp: Date.now(),
      runId: "lookup-remap-v2",
    }),
  }).catch(() => {});
  // #endregion

  return {
    data: out,
    error: out.length ? null : res.error ?? null,
  };
}

/**
 * Tracțiuni distincte — strict generație + caroserie + combinație cutie (tip + gear_count).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ transmission_type: string; gear_count?: unknown }} transmission
 */
export async function fetchDrivetrainsForGenerationBodyTransmission(
  supabase,
  generationId,
  bodyStyleId,
  transmission,
) {
  const gid = coerceGenerationEq(generationId);
  const bid = coerceBodyStyleIdForQuery(bodyStyleId);
  const tt = String(transmission?.transmission_type ?? "").trim();
  if (gid == null || bid == null || !tt) {
    return { data: [], error: null };
  }

  const attempts = [bid, alternateBodyStyleEqForRetry(bid)].filter(
    (x, i, a) => x != null && a.indexOf(x) === i,
  );

  /** @type {unknown | null} */
  let lastErr = null;
  /** @type {Record<string, unknown>[]} */
  let pool = [];

  for (const bTry of attempts) {
    const pack = await runLookupUntilRows(
      supabase,
      generationId,
      bTry,
      transmission,
      "drivetrain_layout, drivetrain_label",
      null,
    );
    lastErr = pack.error ?? lastErr;
    if ((pack.data || []).length) {
      pool = pack.data;
      break;
    }
  }

  if (lastErr && !pool.length) {
    console.error("[BMW] drivetrains lookup:", lastErr);
    return { data: [], error: lastErr };
  }

  const seen = new Set();
  /** @type {{ drivetrain_layout: string; drivetrain_label: string }[]} */
  const out = [];
  for (const r of pool) {
    const dl = String(r?.drivetrain_layout ?? "").trim();
    const lbl = String(r?.drivetrain_label ?? "").trim();
    const k = drivetrainKey(dl, lbl);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ drivetrain_layout: dl, drivetrain_label: lbl });
  }
  out.sort((a, b) => {
    const la = a.drivetrain_label || a.drivetrain_layout;
    const lb = b.drivetrain_label || b.drivetrain_layout;
    return la.localeCompare(lb, "ro", { sensitivity: "base" });
  });

  return { data: out, error: out.length ? null : lastErr };
}

/**
 * Variante motor — strict generație + caroserie + cutie + tracțiune (`drivetrain_layout`).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function fetchEnginesFromConfigurationLookup(
  supabase,
  generationId,
  bodyStyleId,
  transmission,
  drivetrainLayout,
) {
  const gid = coerceGenerationEq(generationId);
  const bid = coerceBodyStyleIdForQuery(bodyStyleId);
  const tt = String(transmission?.transmission_type ?? "").trim();
  const dl = String(drivetrainLayout ?? "").trim();
  if (gid == null || bid == null || !tt || !dl) {
    return { data: [], error: null };
  }

  const attempts = [bid, alternateBodyStyleEqForRetry(bid)].filter(
    (x, i, a) => x != null && a.indexOf(x) === i,
  );

  /** @type {unknown | null} */
  let lastErr = null;
  /** @type {Record<string, unknown>[]} */
  let rows = [];

  for (const bTry of attempts) {
    const pack = await runLookupUntilRows(
      supabase,
      generationId,
      bTry,
      transmission,
      "*",
      dl,
    );
    lastErr = pack.error ?? lastErr;
    if ((pack.data || []).length) {
      rows = pack.data;
      break;
    }
  }

  if (lastErr && !rows.length) {
    console.error("[BMW] engines lookup:", lastErr);
    return { data: [], error: lastErr };
  }

  if (!rows.length) {
    console.warn("[BMW] engines: zero rows after variants", {
      generation_id: generationId,
      body_style_id: bodyStyleId,
      transmission_type: tt,
      gear_count: transmission?.gear_count,
      drivetrain_layout: dl,
    });
  }

  rows = dedupeEnginesBySpecGroup(rows);

  rows.sort((a, b) => {
    const da = Number(a?.displacement_cc);
    const db = Number(b?.displacement_cc);
    if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return da - db;
    const pa = Number(a?.power_value);
    const pb = Number(b?.power_value);
    if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
    return String(a?.variant_name ?? "").localeCompare(
      String(b?.variant_name ?? ""),
      "ro",
      { sensitivity: "base" },
    );
  });

  return { data: rows, error: null };
}

function dedupeBmwVariantKey(id) {
  if (id == null || id === "") return null;
  const s = String(id).trim();
  if (/^\d+$/.test(s)) return `n:${Number(s)}`;
  return `s:${s}`;
}

/** Litri pentru etichete motor (ex. 2.8L). */
export function formatLiters(displacement_cc) {
  if (displacement_cc == null || displacement_cc === "") return "?L";
  const n = Number(displacement_cc);
  if (!Number.isFinite(n) || n <= 0) return "?L";
  return `${(n / 1000).toFixed(1)}L`;
}

/**
 * Cheie de grupare motor/spec — fără variantă, caroserie, transmisie etc.
 * [generation_id|engine_code_full|displacement_cc|power_value|power_unit|torque_nm]
 */
export function engineSpecGroupKey(row) {
  const r = row && typeof row === "object" ? /** @type {Record<string, unknown>} */ (row) : {};
  const gid = String(r.generation_id ?? "").trim();
  const ecf = String(r.engine_code_full ?? "").trim();
  const dcRaw = r.displacement_cc;
  const dc =
    dcRaw == null || dcRaw === ""
      ? ""
      : Number.isFinite(Number(dcRaw))
        ? String(Number(dcRaw))
        : String(dcRaw).trim();
  const pvRaw = r.power_value;
  const pv =
    pvRaw == null || pvRaw === ""
      ? ""
      : Number.isFinite(Number(pvRaw))
        ? String(Number(pvRaw))
        : String(pvRaw).trim();
  const pu = String(r.power_unit ?? "").trim().toLowerCase();
  const tnRaw = r.torque_nm;
  const tn =
    tnRaw == null || tnRaw === ""
      ? ""
      : Number.isFinite(Number(tnRaw))
        ? String(Number(tnRaw))
        : String(tnRaw).trim();
  return [gid, ecf, dc, pv, pu, tn].join("|");
}

/** O intrare per grup motor/spec (nu per variant_slug / variant_id). */
export function dedupeEnginesBySpecGroup(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    const r = /** @type {Record<string, unknown>} */ (row);
    const ecf = String(r.engine_code_full ?? "").trim();
    if (!ecf) continue;
    const k = engineSpecGroupKey(r);
    if (!k || k.startsWith("|")) continue;
    if (!byKey.has(k)) byKey.set(k, r);
  }
  return [...byKey.values()];
}

/**
 * Benzină vs diesel din datele DB (engine_type, cod motor, nume variantă).
 * @returns {"petrol" | "diesel"}
 */
export function getFuelType(row) {
  const r = row && typeof row === "object" ? /** @type {Record<string, unknown>} */ (row) : {};
  const engineType = String(r.engine_type ?? "").toLowerCase();
  const engineCode = String(r.engine_code_full ?? r.engine_code ?? "").toUpperCase();
  const variantName = String(r.variant_name ?? r.name ?? "").toLowerCase();

  if (engineType.includes("diesel")) return "diesel";

  const dieselEnginePrefixes = [
    "M21",
    "M41",
    "M47",
    "M51",
    "M57",
    "N47",
    "N57",
    "B47",
    "B57",
  ];
  if (dieselEnginePrefixes.some((prefix) => engineCode.startsWith(prefix))) {
    return "diesel";
  }
  if (dieselEnginePrefixes.some((prefix) => engineCode.includes(prefix))) {
    return "diesel";
  }

  const dieselNamePatterns = [
    "td",
    "tds",
    "16d",
    "18d",
    "20d",
    "23d",
    "25d",
    "30d",
    "35d",
    "40d",
    "50d",
    "sdrive16d",
    "sdrive18d",
    "sdrive20d",
    "xdrive18d",
    "xdrive20d",
    "xdrive25d",
    "xdrive30d",
    "xdrive35d",
    "xdrive40d",
    "m50d",
  ];
  if (dieselNamePatterns.some((pattern) => variantName.includes(pattern))) {
    return "diesel";
  }

  if (variantName.includes(" d ") || variantName.startsWith("d ") || / d$/.test(variantName)) {
    return "diesel";
  }

  if (/\b\d{2,3}d\b/.test(variantName)) return "diesel";

  return "petrol";
}

/** Sortare listă motorizări: cilindree → putere → cod motor. */
export function sortEngineRowsForMotorDropdown(rows) {
  return [...(rows || [])].sort((a, b) => {
    const ra = /** @type {Record<string, unknown>} */ (a);
    const rb = /** @type {Record<string, unknown>} */ (b);
    const da = Number(ra.displacement_cc);
    const db = Number(rb.displacement_cc);
    if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return da - db;
    if (Number.isFinite(da) && !Number.isFinite(db)) return -1;
    if (!Number.isFinite(da) && Number.isFinite(db)) return 1;
    const pa = Number(ra.power_value);
    const pb = Number(rb.power_value);
    if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
    if (Number.isFinite(pa) && !Number.isFinite(pb)) return -1;
    if (!Number.isFinite(pa) && Number.isFinite(pb)) return 1;
    const ca = String(ra.engine_code_full ?? "").toUpperCase();
    const cb = String(rb.engine_code_full ?? "").toUpperCase();
    return ca.localeCompare(cb, "ro", { sensitivity: "base" });
  });
}

/** Etichetă generică listă motorizări: 2.8L · M52B28TU · 193 hp */
export function formatBmwEngineSpecOptionLabel(row) {
  const r = row && typeof row === "object" ? /** @type {Record<string, unknown>} */ (row) : {};
  const liters = formatLiters(r.displacement_cc);
  const code = String(r.engine_code_full ?? "").trim() || "—";
  const pvRaw = r.power_value;
  const pv =
    pvRaw == null || String(pvRaw).trim() === ""
      ? ""
      : Number.isFinite(Number(pvRaw))
        ? String(Number(pvRaw))
        : String(pvRaw).trim();
  const pu = String(r.power_unit ?? "").trim();
  const pow = pv ? `${pv}${pu ? ` ${pu}` : ""}`.trim() : "";
  return [liters, code, pow].filter(Boolean).join(" · ");
}

/**
 * Toate rândurile din `bmw_technical_specs` pentru aceeași generație + spec motor
 * (reuniune peste variant_slug), pentru caroserii / cutie / tracțiune.
 */
export async function fetchLookupRowsForBmwEngineSpec(supabase, { modelId, generationId, engineSpec }) {
  const mid = coerceGenerationEq(modelId);
  const gid0 = coerceGenerationEq(generationId);
  const ecf = String(engineSpec?.engine_code_full ?? "").trim();
  if (mid == null || gid0 == null || !ecf) {
    return { data: [], error: null };
  }

  const dc = engineSpec?.displacement_cc;
  const pv = engineSpec?.power_value;
  const pu = String(engineSpec?.power_unit ?? "").trim();
  const tn = engineSpec?.torque_nm;

  async function runOnce(gEq, mEq) {
    let q = supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("model_id", mEq)
      .eq("generation_id", gEq)
      .eq("engine_code_full", ecf);

    if (dc != null && String(dc).trim() !== "") {
      const dN = Number(dc);
      q = Number.isFinite(dN) ? q.eq("displacement_cc", dN) : q.eq("displacement_cc", String(dc).trim());
    }
    if (pv != null && String(pv).trim() !== "") {
      const pN = Number(pv);
      q = Number.isFinite(pN) ? q.eq("power_value", pN) : q.eq("power_value", String(pv).trim());
    }
    if (pu) {
      q = q.eq("power_unit", pu);
    }
    if (tn != null && String(tn).trim() !== "") {
      const tN = Number(tn);
      if (Number.isFinite(tN)) q = q.eq("torque_nm", tN);
    }
    return q.limit(8000);
  }

  /** @type {unknown | null} */
  let lastErr = null;

  for (const gid of [gid0, String(generationId ?? "").trim()].filter(
    (x, i, a) => x != null && String(x) !== "" && a.indexOf(x) === i,
  )) {
    let res = await runOnce(gid, mid);
    lastErr = res.error ?? lastErr;
    if ((res.data || []).length) {
      return { data: mapTechnicalSpecRows(/** @type {unknown[]} */ (res.data || [])), error: res.error ?? null };
    }
    if (typeof mid === "number") {
      const alt = await runOnce(gid, String(modelId ?? "").trim());
      lastErr = alt.error ?? lastErr;
      if ((alt.data || []).length) {
        return { data: mapTechnicalSpecRows(/** @type {unknown[]} */ (alt.data || [])), error: alt.error ?? null };
      }
    }
  }

  return { data: [], error: lastErr };
}

function dedupeConfigurationVariantRows(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    const r = /** @type {Record<string, unknown>} */ (row);
    const key =
      r.configuration_id != null && String(r.configuration_id).trim() !== ""
        ? `c:${String(r.configuration_id)}`
        : `v:${String(r.variant_id ?? r.id ?? "").trim()}`;
    if (key === "v:") continue;
    if (!byId.has(key)) byId.set(key, row);
  }
  return [...byId.values()];
}

/**
 * Aliniază câmpuri pentru UI.
 * @param {Record<string, unknown>} r
 */
function normalizeLookupVariantRow(r) {
  const vid = r.variant_id ?? r.id;
  let label = pickFirstNonEmptyString(
    r.variant_name,
    r.name,
    r.display_name,
    r.title,
    r.label,
    r.engine_name,
    r.variant_label,
    r.catalog_name,
    r.short_name,
    r.description,
  );
  if (!label) label = syntheticBmwEngineLabel(r);
  if (!label && vid != null && vid !== "") label = `Motor #${vid}`;

  return {
    ...r,
    id: vid,
    variant_id: vid,
    variant_name: r.variant_name ?? label,
    name: r.name ?? label,
    slug: r.variant_slug ?? r.slug ?? "",
  };
}

/**
 * Motoare distincte din `bmw_configuration_lookup` pentru o generație, **fără** filtre obligatorii
 * pe cutie/tracțiune — pentru selectarea motorului imediat după generație.
 * Opțional restrânge la `body_style_id` după ce utilizatorul a ales caroseria.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number | null | undefined} catalogGenerationId — `generations.id` din catalog
 * @param {{ modelId?: string | number | null; generationCode?: string | null; bodyStyleId?: string | number | null }} opts
 */
export async function fetchEnginesAggregatedForBmwGeneration(
  supabase,
  catalogGenerationId,
  opts,
) {
  const mid = coerceGenerationEq(opts.modelId);
  const gidCatalog = coerceGenerationEq(catalogGenerationId);
  const generationCode = opts.generationCode;
  const bid = coerceBodyStyleIdForQuery(opts.bodyStyleId);

  if (mid == null || gidCatalog == null) {
    return { data: [], error: null };
  }

  /** @type {unknown | null} */
  let lastErr = null;
  /** @type {Record<string, unknown>[]} */
  let raw = [];

  let res = await supabase
    .from(BMW_CONFIGURATION_LOOKUP)
    .select("*")
    .eq("model_id", mid)
    .eq("generation_id", gidCatalog)
    .limit(8000);

  lastErr = res.error ?? lastErr;
  raw = res.data || [];

  if (!raw.length && typeof mid === "number") {
    const alt = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("model_id", String(opts.modelId ?? "").trim())
      .eq("generation_id", gidCatalog)
      .limit(8000);
    lastErr = alt.error ?? lastErr;
    if ((alt.data || []).length) raw = alt.data || [];
  }

  if (!raw.length && generationCode != null && String(generationCode).trim()) {
    const variants = [
      ...new Set([
        String(generationCode).trim(),
        String(generationCode).trim().toLowerCase(),
        String(generationCode).trim().toUpperCase(),
      ]),
    ].filter(Boolean);

    for (const cv of variants) {
      let r2 = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("*")
        .eq("model_id", mid)
        .eq("generation_code", cv)
        .limit(8000);
      lastErr = r2.error ?? lastErr;
      raw = r2.data || [];
      if (!raw.length && typeof mid === "number") {
        const alt2 = await supabase
          .from(BMW_CONFIGURATION_LOOKUP)
          .select("*")
          .eq("model_id", String(opts.modelId ?? "").trim())
          .eq("generation_code", cv)
          .limit(8000);
        lastErr = alt2.error ?? lastErr;
        if ((alt2.data || []).length) raw = alt2.data || [];
      }
      if (raw.length) break;
    }
  }

  if (!raw.length && generationCode != null && String(generationCode).trim()) {
    const gc = String(generationCode).trim();
    let r3 = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("model_id", mid)
      .ilike("generation_code", `%${gc}%`)
      .limit(8000);
    lastErr = r3.error ?? lastErr;
    raw = r3.data || [];
    if (!raw.length && typeof mid === "number") {
      const alt3 = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("*")
        .eq("model_id", String(opts.modelId ?? "").trim())
        .ilike("generation_code", `%${gc}%`)
        .limit(8000);
      lastErr = alt3.error ?? lastErr;
      if ((alt3.data || []).length) raw = alt3.data || [];
    }
  }

  if (bid != null && raw.length) {
    const altBody = alternateBodyStyleEqForRetry(bid);
    const bids = [bid, altBody].filter((x, i, a) => x != null && a.indexOf(x) === i);
    raw = raw.filter((row) => {
      const rb = /** @type {Record<string, unknown>} */ (row)?.body_style_id;
      if (rb == null || rb === "") return true;
      const rs = String(rb).trim();
      return bids.some(
        (b) => String(b) === rs || Number(rs) === Number(b),
      );
    });
  }

  const deduped = dedupeEnginesBySpecGroup(raw);
  deduped.sort((a, b) => {
    const da = Number(a?.displacement_cc);
    const db = Number(b?.displacement_cc);
    if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return da - db;
    const pa = Number(a?.power_value);
    const pb = Number(b?.power_value);
    if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
    return String(a?.variant_name ?? "").localeCompare(
      String(b?.variant_name ?? ""),
      "ro",
      { sensitivity: "base" },
    );
  });

  const normalized = deduped.map((r) =>
    normalizeLookupVariantRow(/** @type {Record<string, unknown>} */ (r)),
  );

  return { data: normalized, error: lastErr };
}

/**
 * Rânduri `bmw_technical_specs` pentru o motorizare (`variant_id`) + model.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function fetchLookupRowsForBmwVariant(supabase, modelId, variantId) {
  const mid = coerceGenerationEq(modelId);
  const vRaw = variantId == null ? "" : String(variantId).trim();
  if (mid == null || !vRaw) return { data: [], error: null };

  /** @type {(string | number)[]} */
  const vidAttempts = [vRaw];
  if (/^\d+$/.test(vRaw)) {
    const n = Number(vRaw);
    if (Number.isFinite(n)) vidAttempts.push(n);
  }

  /** @type {unknown | null} */
  let lastErr = null;

  for (const vEq of vidAttempts) {
    let res = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("model_id", mid)
      .eq("variant_id", vEq)
      .limit(8000);
    lastErr = res.error ?? lastErr;
    if ((res.data || []).length)
      return { data: mapTechnicalSpecRows(/** @type {unknown[]} */ (res.data || [])), error: res.error ?? null };

    if (typeof mid === "number") {
      const alt = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("*")
        .eq("model_id", String(modelId).trim())
        .eq("variant_id", vEq)
        .limit(8000);
      lastErr = alt.error ?? lastErr;
      if ((alt.data || []).length)
        return { data: mapTechnicalSpecRows(/** @type {unknown[]} */ (alt.data || [])), error: alt.error ?? null };
    }
  }

  for (const vEq of vidAttempts) {
    let res = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("model_id", mid)
      .eq("configuration_id", vEq)
      .limit(8000);
    lastErr = res.error ?? lastErr;
    if ((res.data || []).length)
      return { data: mapTechnicalSpecRows(/** @type {unknown[]} */ (res.data || [])), error: res.error ?? null };
    if (typeof mid === "number") {
      const alt = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("*")
        .eq("model_id", String(modelId).trim())
        .eq("configuration_id", vEq)
        .limit(8000);
      lastErr = alt.error ?? lastErr;
      if ((alt.data || []).length)
        return { data: mapTechnicalSpecRows(/** @type {unknown[]} */ (alt.data || [])), error: alt.error ?? null };
    }
  }

  return { data: [], error: lastErr };
}

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {{ body_style_id: string | number; label: string }[]}
 */
export function distinctBodyStylesFromLookupRows(rows) {
  /** @type {Map<string, { body_style_id: string | number; label: string }>} */
  const byKey = new Map();
  for (const r of rows || []) {
    const row = /** @type {Record<string, unknown>} */ (r);
    for (const eq of bodyStyleIdsFromConfigurationRow(row)) {
      const k = String(eq);
      if (!byKey.has(k)) {
        const lbl =
          labelForBodyStyleIdFromRow(row, eq) ||
          pickFirstNonEmptyString(row.body_style_label, row.body_style_name) ||
          `Caroserie (${k})`;
        byKey.set(k, { body_style_id: eq, label: String(lbl).trim() || `Caroserie (${k})` });
      }
    }
  }
  const out = [...byKey.values()];
  out.sort((a, b) =>
    a.label.localeCompare(b.label, "ro", { sensitivity: "base" }),
  );
  return out;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string | number | null | undefined} bodyStyleId
 */
export function filterLookupRowsByBodyStyleId(rows, bodyStyleId) {
  const bid = coerceBodyStyleIdForQuery(bodyStyleId);
  if (bid == null) return rows || [];
  const alts = [bid, alternateBodyStyleEqForRetry(bid)].filter(
    (x, i, a) => x != null && a.indexOf(x) === i,
  );
  return (rows || []).filter((r) => {
    const row = /** @type {Record<string, unknown>} */ (r);
    const ids = bodyStyleIdsFromConfigurationRow(row);
    return ids.some((id) =>
      alts.some(
        (b) =>
          String(b) === String(id) ||
          (Number.isFinite(Number(b)) &&
            Number.isFinite(Number(id)) &&
            Number(b) === Number(id)),
      ),
    );
  });
}

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {{ transmission_type: string; gear_count: unknown }[]}
 */
export function distinctTransmissionsForLookupRows(rows) {
  const seen = new Set();
  /** @type {{ transmission_type: string; gear_count: unknown }[]} */
  const out = [];
  for (const r of rows || []) {
    const row = /** @type {Record<string, unknown>} */ (r);
    const tt = String(row.transmission_type ?? "").trim();
    const gc = row.gear_count;
    if (!tt && (gc == null || String(gc).trim() === "")) continue;
    const k = transmissionKey(tt, gc);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ transmission_type: tt, gear_count: gc });
  }
  out.sort((a, b) =>
    transmissionKey(a.transmission_type, a.gear_count).localeCompare(
      transmissionKey(b.transmission_type, b.gear_count),
      "ro",
      { sensitivity: "base" },
    ),
  );
  return out;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {{ transmission_type: string; gear_count?: unknown }} transmission
 */
export function filterLookupRowsByTransmission(rows, transmission) {
  const tt = String(transmission?.transmission_type ?? "").trim();
  const gc = transmission?.gear_count;
  return (rows || []).filter((r) => {
    const row = /** @type {Record<string, unknown>} */ (r);
    const rtt = String(row.transmission_type ?? "").trim();
    const rgc = row.gear_count;
    if (rtt !== tt) return false;
    const g1 = gc == null || gc === "" ? null : String(gc).trim();
    const g2 = rgc == null || rgc === "" ? null : String(rgc).trim();
    return g1 === g2;
  });
}

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {{ drivetrain_layout: string; drivetrain_label: string }[]}
 */
export function distinctDrivetrainsForLookupRows(rows) {
  const seen = new Set();
  /** @type {{ drivetrain_layout: string; drivetrain_label: string }[]} */
  const out = [];
  for (const r of rows || []) {
    const row = /** @type {Record<string, unknown>} */ (r);
    const dl = String(row.drivetrain_layout ?? "").trim();
    const lbl = String(row.drivetrain_label ?? "").trim();
    const k = drivetrainKey(dl, lbl);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ drivetrain_layout: dl, drivetrain_label: lbl });
  }
  out.sort((a, b) => {
    const la = a.drivetrain_label || a.drivetrain_layout;
    const lb = b.drivetrain_label || b.drivetrain_layout;
    return la.localeCompare(lb, "ro", { sensitivity: "base" });
  });
  return out;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {{ drivetrain_layout?: string; drivetrain_label?: string }} d
 */
export function filterLookupRowsByDrivetrain(rows, d) {
  const wantL = String(d?.drivetrain_layout ?? "").trim();
  const wantLbl = String(d?.drivetrain_label ?? "").trim();
  return (rows || []).filter((r) => {
    const row = /** @type {Record<string, unknown>} */ (r);
    const dl = String(row.drivetrain_layout ?? "").trim();
    const lbl = String(row.drivetrain_label ?? "").trim();
    if (wantL && dl !== wantL) return false;
    if (wantLbl && lbl !== wantLbl) return false;
    return true;
  });
}

function catalogLabel(row) {
  const raw =
    row.label ??
    row.display_label ??
    row.display_name ??
    row.name ??
    row.title ??
    row.catalog_label ??
    "";
  const itemType = String(row.item_type ?? "").trim();

  const rawTrimmed = String(raw).trim();
  if (rawTrimmed) return rawTrimmed;

  const startYear = row.production_start_year ?? row.generation_start_year ?? null;
  const endYear = row.production_end_year ?? row.generation_end_year ?? null;
  const years =
    startYear != null || endYear != null
      ? `${startYear ?? ""}${endYear != null ? `-${endYear}` : ""}`.trim()
      : "";

  if (itemType === "generation") {
    const genCode =
      row.generation_code ??
      row.generation_name ??
      (row.generation_id != null ? String(row.generation_id) : "");
    const label = [genCode, years].filter(Boolean).join(" | ");
    return String(label).trim();
  }

  if (itemType === "model") {
    const modelName =
      row.model_name ??
      row.model_code ??
      (row.model_id != null ? String(row.model_id) : "");
    return String([modelName, years].filter(Boolean).join(" | ")).trim();
  }

  return "";
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadBmwDropdownCatalog(supabase, options = {}) {
  const { brandName } = options;
  const { data, error } = await supabase
    .from("bmw_dropdown_catalog")
    .select("*")
    .order("model_id")
    .order("item_type")
    .order("production_start_year", { ascending: true, nullsFirst: true })
    .order("label");
  if (error) return { data, error };

  if (!brandName) return { data, error: null };
  const wanted = String(brandName).trim().toLowerCase();
  const filtered = (data || []).filter(
    (row) =>
      String(row?.brand_name ?? "").trim().toLowerCase() === wanted,
  );
  return { data: filtered, error: null };
}

/**
 * Variante pentru catalog demo — **`bmw_technical_specs`**.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {BmwDropdownSelection} selected
 */
export async function fetchBmwVariantLookup(supabase, selected) {
  if (!selected?.item_type) {
    return { data: [], error: null };
  }

  /** @type {{ data?: Record<string, unknown>[]; error?: unknown }} */
  let result = { data: [], error: null };

  if (selected.item_type === "generation" && selected.generation_id) {
    const raw = selected.generation_id;
    const idNum = Number(raw);
    const eqVal = Number.isFinite(idNum) ? idNum : raw;

    result = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("generation_id", eqVal)
      .order("generation_code", { ascending: true, nullsFirst: true })
      .order("variant_name", { ascending: true, nullsFirst: true });

    if (
      !result.error &&
      !(result.data || []).length &&
      Number.isFinite(idNum)
    ) {
      const alt = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("*")
        .eq("generation_id", String(raw).trim())
        .order("generation_code", { ascending: true, nullsFirst: true })
        .order("variant_name", { ascending: true, nullsFirst: true });
      if (!alt.error && (alt.data || []).length) result = alt;
    }
  } else if (selected.item_type === "model") {
    if (selected.model_id == null || selected.model_id === "") {
      return { data: [], error: null };
    }
    const raw = selected.model_id;
    const idNum = Number(raw);
    const eqVal = Number.isFinite(idNum) ? idNum : raw;

    result = await supabase
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("*")
      .eq("model_id", eqVal)
      .order("generation_code", { ascending: true, nullsFirst: true })
      .order("variant_name", { ascending: true, nullsFirst: true });

    if (
      !result.error &&
      !(result.data || []).length &&
      Number.isFinite(idNum)
    ) {
      const alt = await supabase
        .from(BMW_CONFIGURATION_LOOKUP)
        .select("*")
        .eq("model_id", String(raw).trim())
        .order("generation_code", { ascending: true, nullsFirst: true })
        .order("variant_name", { ascending: true, nullsFirst: true });
      if (!alt.error && (alt.data || []).length) result = alt;
    }
  } else {
    return { data: [], error: null };
  }

  if (result.error) return result;

  const mapped = mapTechnicalSpecRows(result.data || []);
  const deduped = dedupeConfigurationVariantRows(mapped);
  return {
    data: deduped.map((row) => normalizeLookupVariantRow(row)),
    error: null,
  };
}

/** @deprecated Folosiți `fetchBmwVariantLookup` sau filtrele pe `bmw_configuration_lookup`. */
export const fetchBmwVariants = fetchBmwVariantLookup;

/**
 * @param {HTMLSelectElement} selectEl
 * @param {Record<string, unknown>[]} rows
 */
export function fillBmwCatalogSelect(selectEl, rows) {
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "Selectează BMW / generație";
  selectEl.appendChild(placeholder);

  const sorted = [...rows].sort((a, b) => {
    const modelA = a?.model_id;
    const modelB = b?.model_id;
    const nModelA = modelA == null || modelA === "" ? null : Number(modelA);
    const nModelB = modelB == null || modelB === "" ? null : Number(modelB);

    if (nModelA == null && nModelB != null) return -1;
    if (nModelA != null && nModelB == null) return 1;
    if (nModelA != null && nModelB != null && nModelA !== nModelB)
      return nModelA - nModelB;

    const startA = a?.production_start_year ?? a?.generation_start_year ?? null;
    const startB = b?.production_start_year ?? b?.generation_start_year ?? null;
    const nStartA = startA == null || startA === "" ? null : Number(startA);
    const nStartB = startB == null || startB === "" ? null : Number(startB);
    if (nStartA == null && nStartB != null) return -1;
    if (nStartA != null && nStartB == null) return 1;
    if (nStartA != null && nStartB != null && nStartA !== nStartB)
      return nStartA - nStartB;

    const itemTypeA = String(a?.item_type ?? "").trim();
    const itemTypeB = String(b?.item_type ?? "").trim();
    if (itemTypeA !== itemTypeB) return itemTypeA.localeCompare(itemTypeB);

    const labelA = catalogLabel(a);
    const labelB = catalogLabel(b);
    return labelA.localeCompare(labelB, "ro", { sensitivity: "base" });
  });

  for (const row of sorted) {
    const itemType = String(row.item_type ?? "").trim();
    if (itemType !== "model" && itemType !== "generation") continue;

    const modelId = row.model_id != null ? String(row.model_id) : "";
    const generationId =
      row.generation_id != null && row.generation_id !== ""
        ? String(row.generation_id)
        : "";
    const label = catalogLabel(row);
    if (!label) continue;

    const opt = document.createElement("option");
    opt.value = `${itemType}:${modelId}:${generationId}`;
    opt.textContent = label;
    opt.dataset.itemType = itemType;
    opt.dataset.modelId = modelId;
    opt.dataset.generationId = generationId;
    selectEl.appendChild(opt);
  }
}

/**
 * @param {HTMLOptionElement | null | undefined} opt
 * @returns {BmwDropdownSelection | null}
 */
export function parseBmwCatalogOption(opt) {
  if (!opt || !opt.value) return null;
  const t = String(opt.dataset.itemType || "").trim();
  if (t !== "model" && t !== "generation") return null;
  const gen = opt.dataset.generationId || "";
  return {
    item_type: t,
    model_id: opt.dataset.modelId || null,
    generation_id: gen || null,
  };
}
