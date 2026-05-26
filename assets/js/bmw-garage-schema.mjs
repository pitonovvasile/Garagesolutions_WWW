/**
 * BMW — surse DB pentru garaj: brands, models, generations.
 * Caroseriile pentru generație: **`generation_body_styles` + `body_styles`** (catalog complet);
 * dacă lipsește catalogul pentru generație, fallback la **`bmw_configuration_lookup`** (doar config încărcate).
 *
 * Cutie / tracțiune / motor rămân filtrate din **`bmw_configuration_lookup`** în `bmw-dropdown-variants.mjs`.
 */

import { fetchBodyStylesForGeneration } from "./bmw-dropdown-variants.mjs";

/** @param {unknown} generationId */
function coerceGenerationIdEq(generationId) {
  const raw =
    generationId == null || generationId === ""
      ? ""
      : String(generationId).trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

/**
 * @param {Record<string, unknown>} v
 */
export function formatBmwVariantLabel(v) {
  if (!v || typeof v !== "object") return "";
  const name = String(v.variant_name ?? "").trim();
  const cc = Number(v.displacement_cc);
  const liters =
    Number.isFinite(cc) && cc > 0 ? `${(cc / 1000).toFixed(1)}L` : "";
  const code = bestEngineCode(v);
  const pow =
    v.power_value != null && String(v.power_value).trim() !== ""
      ? `${String(v.power_value).trim()}${v.power_unit ? ` ${v.power_unit}` : ""}`.trim()
      : "";
  const parts = [name, liters, code, pow].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  const et = String(v.engine_type ?? "").trim();
  if (et) return et;
  return "";
}

/** CP (PS metric) din kW: 1 PS = 0.73549875 kW (DIN). */
const KW_TO_PS = 1 / 0.73549875;

/**
 * Alege codul de motor cel mai informativ (de regulă varianta completă).
 * @param {Record<string, unknown>} v
 */
function bestEngineCode(v) {
  const candidates = [
    v.engine_code_full,
    v.engine_code_complete,
    v.engine_code_long,
    v.engine_code_extended,
    v.engine_code,
    v.engine,
  ]
    .map((x) => String(x ?? "").trim().toUpperCase())
    .filter(Boolean);
  if (!candidates.length) return "";
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

/**
 * @param {Record<string, unknown>} v
 */
function inferBmwFuelUpper(v) {
  const ft = String(v.fuel_type ?? v.engine_type ?? "").trim();
  if (ft) return ft.toUpperCase();
  const ec = String(bestEngineCode(v) || v.engine_code || "").toLowerCase();
  const vn = String(v.variant_name ?? "").toLowerCase();
  if (
    ec.endsWith("d") ||
    vn.endsWith("d") ||
    /\bdiesel\b|tdi|cdi/.test(ec + vn)
  ) {
    return "DIESEL";
  }
  if (
    ec.endsWith("ci") ||
    vn.endsWith("ci") ||
    ec.endsWith("i") ||
    vn.endsWith("i")
  ) {
    return "BENZINĂ";
  }
  return "";
}

/**
 * @param {Record<string, unknown>} v
 * @returns {{ kw: number; cp: number } | { other: string } | null}
 */
function powerKwCpFromVariant(v) {
  const kwDirect = Number(v.power_kw);
  const hpDirect = Number(v.power_hp ?? v.power_ps);
  if (Number.isFinite(kwDirect) && Number.isFinite(hpDirect)) {
    return { kw: Math.round(kwDirect), cp: Math.round(hpDirect) };
  }
  if (Number.isFinite(kwDirect)) {
    return {
      kw: Math.round(kwDirect),
      cp: Math.round(kwDirect * KW_TO_PS),
    };
  }
  if (Number.isFinite(hpDirect)) {
    return {
      cp: Math.round(hpDirect),
      kw: Math.round(hpDirect / KW_TO_PS),
    };
  }

  const pv = v.power_value;
  if (pv == null || String(pv).trim() === "") return null;
  const num = Number(pv);
  if (!Number.isFinite(num)) return null;
  const unit = String(v.power_unit ?? "").trim().toLowerCase();
  if (unit === "kw") {
    return { kw: Math.round(num), cp: Math.round(num * KW_TO_PS) };
  }
  if (
    unit === "hp" ||
    unit === "cp" ||
    unit === "ps" ||
    unit === "cp." ||
    unit === "bhp"
  ) {
    return { cp: Math.round(num), kw: Math.round(num / KW_TO_PS) };
  }
  return {
    other: `${String(pv).trim()}${v.power_unit ? ` ${v.power_unit}` : ""}`.trim(),
  };
}

/**
 * Cuplu din coloane uzuale pe `bmw_configuration_lookup` / `engines`.
 * @param {Record<string, unknown>} v
 */
function torqueSummaryFromVariant(v) {
  const pairs = [
    ["torque_nm", "Nm"],
    ["max_torque_nm", "Nm"],
    ["torque_max_nm", "Nm"],
    ["max_torque", "Nm"],
    ["torque", "Nm"],
  ];
  for (const [key, defaultU] of pairs) {
    const val = v[key];
    if (val != null && String(val).trim() !== "") {
      return `${String(val).trim()} ${defaultU}`.trim();
    }
  }
  const tv = v.torque_value;
  if (tv != null && String(tv).trim() !== "") {
    const u = String(v.torque_unit ?? "Nm").trim() || "Nm";
    return `${String(tv).trim()} ${u}`.trim();
  }
  return "";
}

/**
 * Diferențial din coloane uzuale (tip / cod / raport), dacă există în DB.
 * @param {Record<string, unknown>} v
 */
function differentialSummaryFromVariant(v) {
  const label = String(
    v.differential_label ??
      v.differential_type ??
      v.diff_type ??
      v.diff_label ??
      v.differential ??
      "",
  ).trim();
  const code = String(
    v.differential_code ??
      v.diff_code ??
      v.final_drive_code ??
      "",
  ).trim();
  const ratio = String(
    v.differential_ratio ??
      v.final_drive_ratio ??
      v.diff_ratio ??
      "",
  ).trim();

  const bits = [];
  if (label) bits.push(label);
  if (code && !bits.includes(code)) bits.push(code);
  if (ratio) bits.push(ratio.includes(":") ? ratio : `${ratio}:1`);
  if (!bits.length) return "";
  return `DIFERENȚIAL ${bits.join(" · ").toUpperCase()}`;
}

/**
 * Linie compactă pentru panoul din dreapta: cod, cilindree + combustibil, kW, CP, cuplu, diferențial.
 * @param {Record<string, unknown>} v
 */
export function formatBmwEngineSummaryLine(v) {
  if (!v || typeof v !== "object") return "";
  const code = bestEngineCode(v);
  const name = String(v.variant_name ?? "").trim();
  const head = code || name;
  const cc = Number(v.displacement_cc);
  const liters =
    Number.isFinite(cc) && cc > 0 ? `${(cc / 1000).toFixed(1)}L` : "";
  const fuel = inferBmwFuelUpper(v);
  const segments = [];
  if (head) segments.push(head);
  if (liters && fuel) segments.push(`${liters} ${fuel}`);
  else if (liters) segments.push(liters);
  else if (fuel) segments.push(fuel);

  const pow = powerKwCpFromVariant(v);
  if (pow && "other" in pow) {
    segments.push(pow.other);
  } else if (pow && "kw" in pow && "cp" in pow) {
    segments.push(`${pow.kw} kW`, `${pow.cp} CP`);
  }

  const tq = torqueSummaryFromVariant(v);
  if (tq) segments.push(tq);
  const diff = differentialSummaryFromVariant(v);
  if (diff) segments.push(diff);

  if (segments.length) return segments.join(" / ");
  return formatBmwVariantLabel(v);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number} brandId
 */
export async function fetchModelsForBrand(supabase, brandId) {
  const bid = String(brandId).trim();
  if (!bid) return { data: [], error: null };

  let res = await supabase
    .from("models")
    .select("id, name, slug")
    .eq("brand_id", bid)
    .order("name", { ascending: true });

  if (!(res.data || []).length && /^\d+$/.test(bid)) {
    const alt = await supabase
      .from("models")
      .select("id, name, slug")
      .eq("brand_id", Number(bid))
      .order("name", { ascending: true });
    if (!alt.error && (alt.data || []).length) res = alt;
  }

  return { data: res.data || [], error: res.error };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number} modelId
 */
export async function fetchGenerationsForModel(supabase, modelId) {
  const mid = String(modelId).trim();
  if (!mid) return { data: [], error: null };

  let res = await supabase
    .from("generations")
    .select("id, code, production_start_year, production_end_year, body_style")
    .eq("model_id", mid)
    .order("code", { ascending: true });

  if (!(res.data || []).length && /^\d+$/.test(mid)) {
    const alt = await supabase
      .from("generations")
      .select("id, code, production_start_year, production_end_year, body_style")
      .eq("model_id", Number(mid))
      .order("code", { ascending: true });
    if (!alt.error && (alt.data || []).length) res = alt;
  }

  return { data: res.data || [], error: res.error };
}

/**
 * Caroserii pentru generație — catalog (`generation_body_styles`), fallback lookup (`bmw_configuration_lookup`).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number} generationId
 */
export async function fetchGenerationBodyStylesJoined(supabase, generationId) {
  const genEq = coerceGenerationIdEq(generationId);
  if (genEq == null) return { data: [], error: null };

  let gbsRes = await supabase
    .from("generation_body_styles")
    .select("body_style_id")
    .eq("generation_id", genEq);

  if (!(gbsRes.data || []).length && typeof genEq === "number") {
    const alt = await supabase
      .from("generation_body_styles")
      .select("body_style_id")
      .eq("generation_id", String(generationId).trim());
    if (!alt.error && (alt.data || []).length) gbsRes = alt;
  }

  /** @type {(string | number)[]} */
  const ids = [];
  const seen = new Set();
  for (const r of gbsRes.data || []) {
    const bid = r?.body_style_id;
    if (bid == null || bid === "") continue;
    const k = String(bid);
    if (seen.has(k)) continue;
    seen.add(k);
    ids.push(bid);
  }

  /** @type {{ body_style_id: string | number; code: string | null; name: string | null; label: string }[]} */
  let out = [];

  if (ids.length) {
    const bsRes = await supabase
      .from("body_styles")
      .select("id,name,code")
      .in("id", ids);

    const bsById = new Map(
      (bsRes.data || []).map((b) => [String(b.id), b]),
    );

    out = ids.map((id) => {
      const bs = bsById.get(String(id));
      const name = bs?.name != null ? String(bs.name).trim() : "";
      const code = bs?.code != null ? String(bs.code).trim() : "";
      const label =
        name && code && name !== code && !name.includes(code)
          ? `${name} (${code})`
          : name || code || `Caroserie (${String(id)})`;
      return {
        body_style_id: id,
        code: code || null,
        name: name || null,
        label,
      };
    });
    out.sort((a, b) =>
      a.label.localeCompare(b.label, "ro", { sensitivity: "base" }),
    );

    const mergeErr = gbsRes.error || bsRes.error;
    if (mergeErr && out.length) {
      console.warn(
        "[BMW] Caroserii din catalog: date afișabile dar răspuns Supabase cu eroare parțială:",
        mergeErr,
      );
    }

    // Nu întoarce `error` dacă avem opțiuni — index.html tratează orice error ca eșec total.
    return { data: out, error: out.length ? null : mergeErr };
  }

  const lk = await fetchBodyStylesForGeneration(supabase, generationId);

  return lk;
}
