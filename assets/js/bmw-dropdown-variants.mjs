/**
 * BMW catalog dropdown + motorizări.
 * Catalog model/generație: `bmw_dropdown_catalog`.
 * Caroserii: `generation_body_styles` + `body_styles` (după `generation_id`).
 * Motorizări (pagina principală): doar **`bmw_variants`** din Supabase — `generation_id` obligatoriu; cu caroserie: potrivire strictă prin `variant_body_styles` (fără încărcare „implicită” a întregii generații).
 * Etichetă UI: `formatBmwMotorLabel` (cilindree + Benzină/Diesel din `engine_code` / `variant_name`).
 * `bmw_variant_lookup` poate fi folosit în alte pagini (ex. garage/bmw-catalog.html).
 */

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
 *   brand_name?: string;
 *   model_id?: number;
 *   model_name?: string;
 *   model_slug?: string;
 *   generation_id?: number;
 *   generation_code?: string;
 *   production_start_year?: number | null;
 *   production_end_year?: number | null;
 *   variant_id?: number;
 *   variant_name?: string;
 *   variant_slug?: string;
 *   production_start?: string | number | null;
 *   production_end?: string | number | null;
 *   displacement_cc?: number | null;
 *   power_value?: number | null;
 *   power_unit?: string | null;
 *   power_rpm?: number | null;
 *   engine_type?: string | null;
 *   top_speed_kmh?: number | null;
 *   top_speed_mph?: number | null;
 *   transmission_type?: string | null;
 *   gear_count?: number | null;
 *   drivetrain_layout?: string | null;
 * }} BmwVariantLookupRow
 */

/**
 * Distinct `body_style_id` din `variant_body_styles` pentru variantele generației (doar ID-uri).
 * Folosit când `generation_body_styles` e gol dar există deja mapări variantă ↔ caroserie.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number} genEq
 */
async function fetchBodyStyleIdsFromVariantLinks(supabase, genEq) {
  let varsRes = await supabase
    .from("bmw_variants")
    .select("id")
    .eq("generation_id", genEq);
  if (varsRes.error) return { ids: [], error: varsRes.error };
  if (!(varsRes.data || []).length && Number.isFinite(Number(genEq))) {
    const alt = await supabase
      .from("bmw_variants")
      .select("id")
      .eq("generation_id", String(genEq));
    if (!alt.error && (alt.data || []).length) varsRes = alt;
  }
  const vars = varsRes.data;
  const vids = (vars || [])
    .map((r) => (r?.id == null ? null : Number(r.id)))
    .filter((n) => Number.isFinite(n));
  if (!vids.length) return { ids: [], error: null };

  const { data: links, error: e2 } = await supabase
    .from("variant_body_styles")
    .select("body_style_id")
    .in("variant_id", vids);
  if (e2) return { ids: [], error: e2 };

  const ids = [
    ...new Set(
      (links || [])
        .map((r) =>
          r?.body_style_id == null ? null : Number(r.body_style_id)
        )
        .filter((n) => Number.isFinite(n))
    ),
  ];
  if (!ids.length && vids.length) {
    console.log("[BMW] variant_body_styles: nicio legătură body_style pentru variantele generației", {
      generation_id: genEq,
      variantCount: vids.length,
    });
  }
  return { ids, error: null };
}

/**
 * Extrage ID caroserie dintr-un rând `bmw_variant_lookup` (fără parse pe variant_name).
 * @param {Record<string, unknown> | null | undefined} r
 * @returns {number | null}
 */
function bodyStyleIdFromLookupRow(r) {
  if (!r || typeof r !== "object") return null;
  const raw =
    r.body_style_id ??
    r.bodyStyleId ??
    r.body_style_pk ??
    r.bs_id;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Nume afișabil caroserie din rând `bmw_variant_lookup` (fără parse pe variant_name).
 * @param {Record<string, unknown> | null | undefined} r
 * @returns {string}
 */
function bodyStyleDisplayNameFromLookupRow(r) {
  if (!r || typeof r !== "object") return "";
  const candidates = [
    r.body_style_name,
    r.bodyStyleName,
    r.body_style_label,
    r.body_style_code,
    r.body_style,
    r.category,
    r.body_category,
    r.segment,
    r.shape,
    r.body_type,
    r.bodyType,
  ];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }
  return "";
}

/**
 * Map body_style_id → etichetă când `body_styles` e ilisibil; citește coloane din `bmw_variant_lookup`.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number} genEq
 * @param {number[]} idsNeeded
 * @returns {Promise<Map<number, string>>}
 */
async function fetchLookupLabelsForBodyStyleIds(supabase, genEq, idsNeeded) {
  /** @type {Map<number, string>} */
  const labelById = new Map();
  const want = new Set(
    (idsNeeded || [])
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n))
  );
  if (!want.size) return labelById;

  const gNum = Number.isFinite(Number(genEq)) ? Number(genEq) : null;
  const gStr = String(genEq);
  let pack = await supabase
    .from("bmw_variant_lookup")
    .select("*")
    .eq("generation_id", gNum ?? gStr)
    .limit(2000);
  if (!(pack.data || []).length && gNum != null) {
    const alt = await supabase
      .from("bmw_variant_lookup")
      .select("*")
      .eq("generation_id", gStr)
      .limit(2000);
    if (!alt.error && (alt.data || []).length) pack = alt;
  }
  if (pack.error) {
    console.warn("[BMW] bmw_variant_lookup (etichete caroserie):", pack.error);
    return labelById;
  }
  for (const r of pack.data || []) {
    const bid = bodyStyleIdFromLookupRow(r);
    if (bid == null || !want.has(bid) || labelById.has(bid)) continue;
    const txt = bodyStyleDisplayNameFromLookupRow(r);
    if (txt) labelById.set(bid, txt);
  }
  return labelById;
}

/**
 * Distinct body_style_id din `bmw_variant_lookup` (același `generation_id` ca în catalog).
 * Folosit când tabelele de bază nu sunt citibile cu cheia anon.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number | string} genEq
 */
async function fetchBodyStyleIdsFromBmwVariantLookupView(supabase, genEq) {
  const gNum = Number.isFinite(Number(genEq)) ? Number(genEq) : null;
  const gStr = String(genEq);

  let pack = await supabase
    .from("bmw_variant_lookup")
    .select("*")
    .eq("generation_id", gNum ?? gStr)
    .limit(1000);

  if (!(pack.data || []).length && gNum != null) {
    const alt = await supabase
      .from("bmw_variant_lookup")
      .select("*")
      .eq("generation_id", gStr)
      .limit(1000);
    if (!alt.error && (alt.data || []).length) pack = alt;
  }

  if (pack.error) {
    console.error("[BMW] bmw_variant_lookup (caroserii):", pack.error);
    return { ids: [], error: pack.error };
  }

  const idSet = new Set();
  for (const r of pack.data || []) {
    const bid = bodyStyleIdFromLookupRow(r);
    if (bid != null) idSet.add(bid);
  }
  const ids = [...idSet];

  if (!ids.length && (pack.data || []).length) {
    console.warn(
      "[BMW] bmw_variant_lookup are rânduri dar niciun body_style_id recunoscut. Chei eșantion:",
      Object.keys(pack.data[0] || {})
    );
  }

  return { ids, error: null };
}

function pickFirstNonEmptyString(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/** Etichetă din cilindree / putere când lipsește numele variantei în view. */
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

/** Coloane `bmw_variants` pentru garaj (fără `engines`). Aliniat cu schema DB publică. */
export const BMW_VARIANT_MOTOR_SELECT =
  "id, generation_id, variant_name, slug, displacement_cc, power_value, power_unit, engine_type, engine_code, engine_code_full, transmission_type, gear_count, drivetrain_layout, drivetrain_label";

/**
 * Etichetă motor: `X.XL (Benzină|Diesel|Necunoscut)` — cilindree din displacement_cc;
 * combustibil din engine_code / variant_name (d → Diesel; i / ci → Benzină), ca în CASE SQL.
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

function dedupeBmwVariantKey(id) {
  if (id == null || id === "") return null;
  const s = String(id).trim();
  if (/^\d+$/.test(s)) return `n:${Number(s)}`;
  return `s:${s}`;
}

function dedupeBmwVariantRows(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    const { variant_body_styles: _vbs, ...rest } = row;
    const id = rest?.id;
    const k = dedupeBmwVariantKey(id);
    if (k == null) continue;
    if (!byId.has(k)) byId.set(k, rest);
  }
  return [...byId.values()];
}

/** Rânduri `bmw_variants` din răspunsul `select(bmw_variants!inner(...))` pe `variant_body_styles`. */
function bmwVariantsFromJunctionRows(data) {
  const out = [];
  for (const row of data || []) {
    const v = row?.bmw_variants;
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x === "object") out.push(x);
      }
    } else if (typeof v === "object") {
      out.push(v);
    }
  }
  return out;
}

/**
 * Aliniază câmpuri pentru UI; view-ul poate folosi `display_name`, fără `variant_name`.
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
    r.description
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
 * Caroserii pentru generație: `generation_body_styles` → `body_styles`.
 * Dacă tabelul de legătură e gol (sau RLS), se folosesc `body_style_id` distincte din `variant_body_styles`
 * pentru variantele acelei generații — tot pe ID-uri, fără potriviri pe nume variantă.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number | null | undefined} generationId
 */
export async function fetchBodyStylesForGeneration(supabase, generationId) {
  const id =
    generationId == null || generationId === ""
      ? null
      : String(generationId).trim();
  if (!id) return { data: [], error: null };

  const genEq = Number.isFinite(Number(id)) ? Number(id) : id;

  let rel = await supabase
    .from("generation_body_styles")
    .select("body_style_id")
    .eq("generation_id", genEq);

  if (rel.error) {
    console.error("[BMW] generation_body_styles:", rel.error);
    return { data: [], error: rel.error };
  }

  if (!(rel.data || []).length && Number.isFinite(Number(genEq))) {
    const relAlt = await supabase
      .from("generation_body_styles")
      .select("body_style_id")
      .eq("generation_id", String(genEq));
    if (!relAlt.error && (relAlt.data || []).length) rel = relAlt;
  }

  let ids = [
    ...new Set(
      (rel.data || [])
        .map((r) =>
          r?.body_style_id == null ? null : Number(r.body_style_id)
        )
        .filter((n) => Number.isFinite(n))
    ),
  ];

  /** @type {"generation_body_styles" | "variant_body_styles" | "bmw_variant_lookup"} */
  let source = "generation_body_styles";

  if (!ids.length) {
    const fb = await fetchBodyStyleIdsFromVariantLinks(supabase, genEq);
    if (fb.error) {
      console.warn(
        "[BMW] variant_body_styles / bmw_variants indisponibil pentru anon:",
        fb.error.message
      );
    } else {
      ids = fb.ids;
      if (ids.length) {
        source = "variant_body_styles";
        console.warn(
          "[BMW] generation_body_styles gol — caroserii din variant_body_styles (ideal: completează generation_body_styles).",
          { generation_id: genEq }
        );
      }
    }
  }

  if (!ids.length) {
    const lv = await fetchBodyStyleIdsFromBmwVariantLookupView(supabase, genEq);
    if (lv.error) {
      console.error("[BMW] fallback bmw_variant_lookup:", lv.error);
    } else {
      ids = lv.ids;
      if (ids.length) {
        source = "bmw_variant_lookup";
        console.warn(
          "[BMW] caroserii din bmw_variant_lookup (RLS pe tabele de bază?).",
          { generation_id: genEq, idCount: ids.length }
        );
      }
    }
  }

  if (!ids.length) {
    let probe = await supabase
      .from("bmw_variant_lookup")
      .select("*")
      .eq(
        "generation_id",
        Number.isFinite(Number(genEq)) ? Number(genEq) : genEq
      )
      .limit(1);
    if (!(probe.data || []).length && Number.isFinite(Number(genEq))) {
      probe = await supabase
        .from("bmw_variant_lookup")
        .select("*")
        .eq("generation_id", String(genEq))
        .limit(1);
    }
    if (!probe.error && (probe.data || []).length) {
      console.warn(
        "[BMW] Nicio caroserie cu ID — folosesc toate variantele din bmw_variant_lookup pentru generație (completează generation_body_styles / variant_body_styles în DB).",
        { generation_id: genEq }
      );
      return {
        data: [
          {
            body_style_id: "__ALL__",
            code: null,
            name: null,
            label:
              "Toate motorizările (mapare caroserie indisponibilă în DB)",
          },
        ],
        error: null,
      };
    }
    console.log("[BMW] fetchBodyStylesForGeneration", {
      generation_id: genEq,
      rowCount: 0,
      source: "none",
    });
    return { data: [], error: null };
  }

  const styles = await supabase.from("body_styles").select("*").in("id", ids);
  if (styles.error) {
    console.error("[BMW] body_styles:", styles.error);
    return { data: [], error: styles.error };
  }

  const styleById = new Map(
    (styles.data || []).map((row) => [Number(row?.id), row])
  );

  const missingFromStyles = ids.filter((id) => !styleById.has(Number(id)));
  const lookupLabels =
    missingFromStyles.length > 0
      ? await fetchLookupLabelsForBodyStyleIds(
          supabase,
          genEq,
          missingFromStyles
        )
      : new Map();

  if (missingFromStyles.length) {
    console.warn(
      "[BMW] Caroserii fără rând în body_styles (RLS sau date). Completare etichete din bmw_variant_lookup când există coloane (body_style_name, category, …).",
      {
        generation_id: genEq,
        missing_ids: missingFromStyles,
        filled_from_lookup: lookupLabels.size,
        source,
      }
    );
  }

  /** @type {{ body_style_id: number; code: string | null; name: string | null; label: string }[]} */
  const out = [];
  for (const bsId of ids) {
    const bs = styleById.get(bsId);
    if (bs && typeof bs === "object") {
      const label =
        String(bs.name ?? bs.code ?? "").trim() || `Body style ${bsId}`;
      out.push({
        body_style_id: bsId,
        code: bs.code != null ? String(bs.code) : null,
        name: bs.name != null ? String(bs.name) : null,
        label,
      });
      continue;
    }
    const fromLookup = lookupLabels.get(Number(bsId));
    const label =
      fromLookup && String(fromLookup).trim()
        ? String(fromLookup).trim()
        : `Caroserie #${bsId}`;
    out.push({
      body_style_id: bsId,
      code: null,
      name: fromLookup ? String(fromLookup).trim() : null,
      label,
    });
  }

  out.sort((a, b) =>
    a.label.localeCompare(b.label, "ro", { sensitivity: "base" })
  );

  console.log("[BMW] fetchBodyStylesForGeneration", {
    generation_id: genEq,
    bodyStyleIdCount: ids.length,
    bodyStylesTableRows: (styles.data || []).length,
    rowCount: out.length,
    source,
  });

  return { data: out, error: null };
}

/**
 * Motorizări din **bmw_variants** (nu din `engines`).
 * Filtru obligatoriu: `generation_id`. Opțional: `body_style_id` (omit / null / `__ALL__` = doar `bmw_variants` pentru generație).
 * Cu caroserie selectată: rezultatul trebuie să treacă prin `variant_body_styles` (join sau intersecție cu `variant_id` pentru acea caroserie) — fără completări din afara acestor rânduri.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | number | null | undefined} generationId
 * @param {string | number | null | undefined} bodyStyleId
 */
export async function fetchBmwVariantsForGenerationAndBodyStyle(
  supabase,
  generationId,
  bodyStyleId
) {
  const gid = Number(generationId);
  if (!Number.isFinite(gid)) return { data: [], error: null };
  // #region agent log
  fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B11',location:'bmw-dropdown-variants.mjs:fetchBmwVariantsForGenerationAndBodyStyle',message:'entry',data:{generationId:String(generationId),generationIdNum:gid,bodyStyleId:String(bodyStyleId??'')},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const rawBs =
    bodyStyleId == null || bodyStyleId === ""
      ? ""
      : String(bodyStyleId).trim();
  const skipBodyFilter =
    rawBs === "" ||
    rawBs === "__ALL__" ||
    String(rawBs).toUpperCase() === "ALL";

  async function queryByGenerationOnly() {
    let res = await supabase
      .from("bmw_variants")
      .select(BMW_VARIANT_MOTOR_SELECT)
      .eq("generation_id", gid)
      .order("displacement_cc", { ascending: true, nullsFirst: true })
      .order("power_value", { ascending: true, nullsFirst: true });
    if (!(res.data || []).length) {
      const alt = await supabase
        .from("bmw_variants")
        .select(BMW_VARIANT_MOTOR_SELECT)
        .eq("generation_id", String(generationId))
        .order("displacement_cc", { ascending: true, nullsFirst: true })
        .order("power_value", { ascending: true, nullsFirst: true });
      if (!alt.error && (alt.data || []).length) res = alt;
    }
    // #region agent log
    fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B12',location:'bmw-dropdown-variants.mjs:queryByGenerationOnly',message:'query result',data:{generationId:String(generationId),rowCount:(res.data||[]).length,errorMsg:res.error?String(res.error.message||res.error):null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return res;
  }

  if (skipBodyFilter) {
    const res = await queryByGenerationOnly();
    // #region agent log
    fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B15',location:'bmw-dropdown-variants.mjs:skipBodyFilter',message:'raw query payload',data:{generationId:String(generationId),bodyStyleId:null,rowCount:(res.data||[]).length,sampleIds:(res.data||[]).slice(0,3).map((r)=>r?.id??null),errorMsg:res.error?String(res.error.message||res.error):null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (res.error) return { data: [], error: res.error };
    const rows = dedupeBmwVariantRows(res.data || []);
    rows.sort((a, b) => {
      const da = Number(a?.displacement_cc);
      const db = Number(b?.displacement_cc);
      if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return da - db;
      const pa = Number(a?.power_value);
      const pb = Number(b?.power_value);
      if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
      return String(a?.variant_name ?? "").localeCompare(String(b?.variant_name ?? ""), "ro", {
        sensitivity: "base",
      });
    });
    return { data: rows, error: null };
  }

  const bid = Number(bodyStyleId);
  if (!Number.isFinite(bid)) return { data: [], error: null };

  // Validare body_style selectat pentru generație (EXISTS-style),
  // dar lista de variante rămâne filtrată după generation_id.
  let gbs = await supabase
    .from("generation_body_styles")
    .select("body_style_id")
    .eq("generation_id", gid)
    .eq("body_style_id", bid)
    .limit(1);
  if (!(gbs.data || []).length) {
    const gbsAlt = await supabase
      .from("generation_body_styles")
      .select("body_style_id")
      .eq("generation_id", String(generationId))
      .eq("body_style_id", bid)
      .limit(1);
    if (!gbsAlt.error && (gbsAlt.data || []).length) gbs = gbsAlt;
  }

  // #region agent log
  fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B20',location:'bmw-dropdown-variants.mjs:bodyStyleExistsCheck',message:'generation-body relation',data:{generationId:String(generationId),bodyStyleId:String(bodyStyleId),exists:(gbs.data||[]).length>0,errorMsg:gbs.error?String(gbs.error.message||gbs.error):null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (gbs.error) return { data: [], error: gbs.error };
  if (!(gbs.data || []).length) return { data: [], error: null };

  const res = await queryByGenerationOnly();

  if (res.error) {
    console.warn("[BMW] bmw_variants:", res.error.message);
    return { data: [], error: res.error };
  }
  // #region agent log
  fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B16',location:'bmw-dropdown-variants.mjs:withBodyFilter',message:'raw query payload',data:{generationId:String(generationId),bodyStyleId:String(bodyStyleId??''),rowCount:(res.data||[]).length,sampleIds:(res.data||[]).slice(0,3).map((r)=>r?.id??null)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (!(res.data || []).length) {
    const probe = await supabase
      .from("bmw_variants")
      .select("id,generation_id")
      .limit(1);
    // #region agent log
    fetch('http://127.0.0.1:7320/ingest/103125a5-450c-4de9-889c-5502761e68ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cedca9'},body:JSON.stringify({sessionId:'cedca9',runId:'debug',hypothesisId:'B13',location:'bmw-dropdown-variants.mjs:globalProbe',message:'bmw_variants probe',data:{rowCount:(probe.data||[]).length,errorMsg:probe.error?String(probe.error.message||probe.error):null,firstGenerationId:probe.data?.[0]?.generation_id??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  const deduped = dedupeBmwVariantRows(res.data || []);
  deduped.sort((a, b) => {
    const da = Number(a?.displacement_cc);
    const db = Number(b?.displacement_cc);
    if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return da - db;
    if (Number.isFinite(da) && !Number.isFinite(db)) return -1;
    if (!Number.isFinite(da) && Number.isFinite(db)) return 1;
    const pa = Number(a?.power_value);
    const pb = Number(b?.power_value);
    if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
    return String(a?.variant_name ?? "").localeCompare(String(b?.variant_name ?? ""), "ro", {
      sensitivity: "base",
    });
  });
  return { data: deduped, error: null };
}

/**
 * @param {Record<string, unknown>} row
 */
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
      row.generation_code ?? row.generation_name ?? (row.generation_id != null ? String(row.generation_id) : "");
    const label = [genCode, years].filter(Boolean).join(" | ");
    return String(label).trim();
  }

  if (itemType === "model") {
    const modelName = row.model_name ?? row.model_code ?? (row.model_id != null ? String(row.model_id) : "");
    return String([modelName, years].filter(Boolean).join(" | ")).trim();
  }

  return "";
}

/**
 * Încarcă catalogul cu același ordering ca în React (BmwSelector).
 * Nu citește public.models pentru acest dropdown.
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
  const filtered = (data || []).filter((row) =>
    String(row?.brand_name ?? "").trim().toLowerCase() === wanted
  );
  return { data: filtered, error: null };
}

/**
 * @typedef {{ item_type: "model" | "generation"; model_id: string | null; generation_id: string | null }} BmwDropdownSelection
 */

/**
 * View-ul `bmw_variant_lookup` poate să nu expună tracțiunea/cutia; le luăm din `bmw_variants`.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Record<string, unknown>[] | null | undefined} rows
 */
export async function enrichBmwVariantLookupRows(supabase, rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return list;

  const ids = [
    ...new Set(
      list
        .map((r) => {
          const v = r?.variant_id ?? r?.id;
          if (v == null || v === "") return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        })
        .filter((n) => n != null)
    ),
  ];
  if (!ids.length) return list;

  const { data: rawVariants, error } = await supabase
    .from("bmw_variants")
    .select(
      "id, variant_name, slug, drivetrain_layout, transmission_type, gear_count, displacement_cc, fuel_type, engine_type"
    )
    .in("id", ids);

  if (error || !(rawVariants || []).length) return list;

  const byId = new Map((rawVariants || []).map((row) => [Number(row?.id), row]));

  return list.map((r) => {
    const vid = r?.variant_id ?? r?.id;
    const n = vid == null || vid === "" ? NaN : Number(vid);
    const extra = Number.isFinite(n) ? byId.get(n) : null;
    if (!extra) return r;
    const out = { ...r };
    if (!String(out.variant_name ?? "").trim() && String(extra.variant_name ?? "").trim()) {
      out.variant_name = extra.variant_name;
    }
    if (!String(out.variant_slug ?? out.slug ?? "").trim() && String(extra.slug ?? "").trim()) {
      out.variant_slug = extra.slug;
    }
    if (
      (out.displacement_cc == null || out.displacement_cc === "") &&
      extra.displacement_cc != null &&
      extra.displacement_cc !== ""
    ) {
      out.displacement_cc = extra.displacement_cc;
    }
    if (!pickFirstNonEmptyString(out.fuel_type, out.fuel) && String(extra.fuel_type ?? "").trim()) {
      out.fuel_type = extra.fuel_type;
    }
    if (!String(out.engine_type ?? "").trim() && String(extra.engine_type ?? "").trim()) {
      out.engine_type = extra.engine_type;
    }
    if (out.drivetrain_layout == null || String(out.drivetrain_layout).trim() === "") {
      out.drivetrain_layout = extra.drivetrain_layout;
    }
    if (out.transmission_type == null || String(out.transmission_type).trim() === "") {
      out.transmission_type = extra.transmission_type;
    }
    if (out.gear_count == null && extra.gear_count != null) {
      out.gear_count = extra.gear_count;
    }
    return out;
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ data?: Record<string, unknown>[]; error?: unknown } | null} pack
 */
async function finalizeBmwVariantPack(supabase, pack) {
  if (!pack || pack.error || !(pack.data || []).length) return pack;
  const enriched = await enrichBmwVariantLookupRows(supabase, pack.data);
  return {
    data: (enriched || []).map((row) => normalizeLookupVariantRow(row)),
    error: pack.error,
  };
}

/**
 * Adaugă variante din `bmw_variants` care lipsesc din `bmw_variant_lookup` (aceeași generație).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Record<string, unknown>[]} lookupRows
 * @param {string | number | null | undefined} generationId
 */
export async function mergeLookupWithBmwVariantsForGeneration(supabase, lookupRows, generationId) {
  const gid =
    generationId == null || generationId === "" ? null : String(generationId).trim();
  const list = Array.isArray(lookupRows) ? lookupRows : [];
  if (!gid || !list.length) return list;

  const { data: raw, error } = await supabase
    .from("bmw_variants")
    .select(
      "id, variant_name, slug, transmission_type, drivetrain_layout, displacement_cc, power_value, power_unit, power_rpm, engine_type, top_speed_kmh, top_speed_mph"
    )
    .eq("generation_id", gid);

  if (error || !(raw || []).length) return list;

  const base = list[0];
  /** @type {Map<number, Record<string, unknown>>} */
  const byVid = new Map();
  for (const r of list) {
    const vid = Number(r.variant_id);
    if (!Number.isFinite(vid)) continue;
    byVid.set(vid, { ...r });
  }

  for (const bv of raw) {
    const vid = Number(bv.id);
    if (!Number.isFinite(vid)) continue;
    const existing = byVid.get(vid);
    if (existing) {
      if (bv.variant_name) existing.variant_name = bv.variant_name;
      if (bv.slug) existing.variant_slug = bv.slug;
      if (bv.drivetrain_layout != null && String(bv.drivetrain_layout).trim() !== "") {
        existing.drivetrain_layout = bv.drivetrain_layout;
      }
      if (bv.transmission_type != null && String(bv.transmission_type).trim() !== "") {
        existing.transmission_type = bv.transmission_type;
      }
      if (bv.displacement_cc != null) existing.displacement_cc = bv.displacement_cc;
      if (bv.power_value != null) existing.power_value = bv.power_value;
      if (bv.power_unit != null) existing.power_unit = bv.power_unit;
      if (bv.power_rpm != null) existing.power_rpm = bv.power_rpm;
      if (bv.engine_type != null) existing.engine_type = bv.engine_type;
      if (bv.top_speed_kmh != null) existing.top_speed_kmh = bv.top_speed_kmh;
      if (bv.top_speed_mph != null) existing.top_speed_mph = bv.top_speed_mph;
      continue;
    }
    byVid.set(vid, {
      ...base,
      variant_id: vid,
      variant_name: bv.variant_name,
      variant_slug: bv.slug ?? "",
      drivetrain_layout: bv.drivetrain_layout ?? null,
      transmission_type: bv.transmission_type ?? null,
      displacement_cc: bv.displacement_cc ?? null,
      power_value: bv.power_value ?? null,
      power_unit: bv.power_unit ?? null,
      power_rpm: bv.power_rpm ?? null,
      engine_type: bv.engine_type ?? null,
      top_speed_kmh: bv.top_speed_kmh ?? null,
      top_speed_mph: bv.top_speed_mph ?? null,
    });
  }

  const orderedIds = list
    .map((r) => Number(r.variant_id))
    .filter((n) => Number.isFinite(n));
  const ordered = orderedIds.map((id) => byVid.get(id)).filter(Boolean);
  const seen = new Set(orderedIds);
  const extra = [...byVid.entries()]
    .filter(([id]) => !seen.has(id))
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row);
  return [...ordered, ...extra];
}

/**
 * Motorizări din bmw_variant_lookup (filtrare obligatorie: generation_id sau model_id).
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
      .from("bmw_variant_lookup")
      .select("*")
      .eq("generation_id", eqVal)
      .order("generation_code")
      .order("variant_name");

    if (
      !result.error &&
      !(result.data || []).length &&
      Number.isFinite(idNum)
    ) {
      const alt = await supabase
        .from("bmw_variant_lookup")
        .select("*")
        .eq("generation_id", String(raw).trim())
        .order("generation_code")
        .order("variant_name");
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
      .from("bmw_variant_lookup")
      .select("*")
      .eq("model_id", eqVal)
      .order("generation_code")
      .order("variant_name");

    if (
      !result.error &&
      !(result.data || []).length &&
      Number.isFinite(idNum)
    ) {
      const alt = await supabase
        .from("bmw_variant_lookup")
        .select("*")
        .eq("model_id", String(raw).trim())
        .order("generation_code")
        .order("variant_name");
      if (!alt.error && (alt.data || []).length) result = alt;
    }
  } else {
    return { data: [], error: null };
  }

  if (
    selected.item_type === "generation" &&
    (!result.error) &&
    (result.data || []).length === 0 &&
    selected.model_id != null &&
    selected.model_id !== ""
  ) {
    const raw = selected.model_id;
    const idNum = Number(raw);
    let byModel = await supabase
      .from("bmw_variant_lookup")
      .select("*")
      .eq("model_id", Number.isFinite(idNum) ? idNum : raw)
      .order("generation_code")
      .order("variant_name");

    if (
      !byModel.error &&
      !(byModel.data || []).length &&
      Number.isFinite(idNum)
    ) {
      const alt = await supabase
        .from("bmw_variant_lookup")
        .select("*")
        .eq("model_id", String(raw).trim())
        .order("generation_code")
        .order("variant_name");
      if (!alt.error && (alt.data || []).length) byModel = alt;
    }

    return finalizeBmwVariantPack(supabase, byModel);
  }

  // generation_id may be missing/mismatched in lookup; try generation_code from selected label
  if (
    selected.item_type === "generation" &&
    (!result.error) &&
    (result.data || []).length === 0 &&
    selected.label
  ) {
    const label = String(selected.label);
    const codeMatch = label.match(/\b(E\d{2}|F\d{2}|G\d{2}|E10)\b/i);
    const generationCode = codeMatch ? codeMatch[1].toUpperCase() : "";
    if (generationCode) {
      const byGenerationCode = await supabase
        .from("bmw_variant_lookup")
        .select("*")
        .eq("generation_code", generationCode)
        .order("variant_name");
      if (!byGenerationCode.error && (byGenerationCode.data || []).length > 0) {
        return finalizeBmwVariantPack(supabase, byGenerationCode);
      }
    }
  }

  return finalizeBmwVariantPack(supabase, result);
}

/** @deprecated Folosește fetchBmwVariantLookup; păstrat pentru importuri vechi. */
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

    // nullsFirst
    if (nModelA == null && nModelB != null) return -1;
    if (nModelA != null && nModelB == null) return 1;
    if (nModelA != null && nModelB != null && nModelA !== nModelB) return nModelA - nModelB;

    const startA = a?.production_start_year ?? a?.generation_start_year ?? null;
    const startB = b?.production_start_year ?? b?.generation_start_year ?? null;
    const nStartA = startA == null || startA === "" ? null : Number(startA);
    const nStartB = startB == null || startB === "" ? null : Number(startB);
    // nullsFirst
    if (nStartA == null && nStartB != null) return -1;
    if (nStartA != null && nStartB == null) return 1;
    if (nStartA != null && nStartB != null && nStartA !== nStartB) return nStartA - nStartB;

    const itemTypeA = String(a?.item_type ?? "").trim();
    const itemTypeB = String(b?.item_type ?? "").trim();
    if (itemTypeA !== itemTypeB) return itemTypeA.localeCompare(itemTypeB);

    const labelA = catalogLabel(a);
    const labelB = catalogLabel(b);
    return labelA.localeCompare(labelB);
  });

  for (const row of sorted) {
    const itemType = String(row.item_type ?? "").trim();
    if (itemType !== "model" && itemType !== "generation") continue;

    const modelId = row.model_id != null ? String(row.model_id) : "";
    const generationId = row.generation_id != null && row.generation_id !== "" ? String(row.generation_id) : "";
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
