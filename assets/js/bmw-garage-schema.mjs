/**
 * BMW — surse DB pentru garaj: brands, models, generations, generation_body_styles,
 * body_styles, bmw_variants (fără engines, fără opțiuni inventate).
 */

/**
 * @param {Record<string, unknown>} v
 */
export function formatBmwVariantLabel(v) {
  if (!v || typeof v !== "object") return "";
  const name = String(v.variant_name ?? "").trim();
  const cc = Number(v.displacement_cc);
  const liters =
    Number.isFinite(cc) && cc > 0 ? `${(cc / 1000).toFixed(1)}L` : "";
  const ec = String(v.engine_code ?? "").trim();
  const ecf = String(v.engine_code_full ?? "").trim();
  const pow =
    v.power_value != null && String(v.power_value).trim() !== ""
      ? `${String(v.power_value).trim()}${v.power_unit ? ` ${v.power_unit}` : ""}`.trim()
      : "";
  const parts = [name, liters, ec || ecf, pow].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  const et = String(v.engine_type ?? "").trim();
  if (et) return et;
  return "";
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
 * SELECT DISTINCT bs.id, bs.name, bs.code … prin generation_body_styles → body_styles.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number} generationId
 */
export async function fetchGenerationBodyStylesJoined(supabase, generationId) {
  const gid = Number(generationId);
  const genEq = Number.isFinite(gid) ? gid : generationId;
  let gbs = await supabase
    .from("generation_body_styles")
    .select("body_style_id")
    .eq("generation_id", genEq);

  if (!(gbs.data || []).length && Number.isFinite(Number(genEq))) {
    const alt = await supabase
      .from("generation_body_styles")
      .select("body_style_id")
      .eq("generation_id", String(generationId));
    if (!alt.error && (alt.data || []).length) gbs = alt;
  }

  // #region agent log
  fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B8',location:'bmw-garage-schema.mjs:fetchGenerationBodyStylesJoined',message:'gbs ids fetched',data:{generationId:String(generationId),rowCount:(gbs.data||[]).length,errorMsg:gbs.error?String(gbs.error.message||gbs.error):null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (gbs.error) return { data: [], error: gbs.error };

  const ids = [
    ...new Set(
      (gbs.data || [])
        .map((r) => r?.body_style_id)
        .filter((v) => v != null && v !== ""),
    ),
  ];
  if (!ids.length) return { data: [], error: null };

  const bs = await supabase
    .from("body_styles")
    .select("id, name, code")
    .in("id", ids);

  // #region agent log
  fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B9',location:'bmw-garage-schema.mjs:fetchGenerationBodyStylesJoined',message:'body_styles fetched by ids',data:{idsCount:ids.length,rowCount:(bs.data||[]).length,errorMsg:bs.error?String(bs.error.message||bs.error):null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (bs.error) return { data: [], error: bs.error };

  const list = (bs.data || [])
    .map((row) => {
      const id = row?.id;
      if (id == null || id === "") return null;
      const name = row?.name != null ? String(row.name).trim() : "";
      const code = row?.code != null ? String(row.code).trim() : "";
      return {
        body_style_id: id,
        name: name || null,
        code: code || null,
        label: name || code || String(id),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, "ro", { sensitivity: "base" }));

  return { data: list, error: null };
}

/**
 * Perechi distincte din rânduri `bmw_variants` (pentru UI cutie / tracțiune).
 * @param {Record<string, unknown>[]} rows
 * @returns {{ transmission_type: string; gear_count: unknown }[]}
 */
export function distinctGearboxPairs(rows) {
  const seen = new Set();
  /** @type {{ transmission_type: string; gear_count: unknown }[]} */
  const out = [];
  for (const v of rows || []) {
    const tt = String(v?.transmission_type ?? "").trim();
    const gc = v?.gear_count;
    // Păstrează rândurile care au măcar una dintre valori.
    if (!tt && (gc == null || String(gc).trim() === "")) continue;
    const key = `${tt}\u0000${String(gc ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ transmission_type: tt, gear_count: gc });
  }
  out.sort((a, b) =>
    `${a.transmission_type}|${a.gear_count}`.localeCompare(
      `${b.transmission_type}|${b.gear_count}`,
      "ro",
      { sensitivity: "base" },
    ),
  );
  return out;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {{ drivetrain_layout: string; drivetrain_label: string }[]}
 */
export function distinctDrivetrainPairs(rows) {
  const seen = new Set();
  /** @type {{ drivetrain_layout: string; drivetrain_label: string }[]} */
  const out = [];
  for (const v of rows || []) {
    const dl = String(v?.drivetrain_layout ?? "").trim();
    const lbl = String(v?.drivetrain_label ?? "").trim();
    const key = `${dl}\u0000${lbl}`;
    if (seen.has(key)) continue;
    seen.add(key);
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
 * @param {Record<string, unknown>} v
 * @param {{ transmission_type: string; gear_count: unknown }} sel
 */
export function variantMatchesGearbox(v, sel) {
  const tt = String(v?.transmission_type ?? "").trim();
  const gc = v?.gear_count;
  return tt === sel.transmission_type && String(gc ?? "") === String(sel.gear_count ?? "");
}

/**
 * @param {Record<string, unknown>} v
 * @param {{ drivetrain_layout: string; drivetrain_label: string }} sel
 */
export function variantMatchesDrivetrain(v, sel) {
  const dl = String(v?.drivetrain_layout ?? "").trim();
  const lbl = String(v?.drivetrain_label ?? "").trim();
  return dl === sel.drivetrain_layout && lbl === sel.drivetrain_label;
}
