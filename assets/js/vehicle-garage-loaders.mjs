/**
 * Incarcare modele + motorizari din Supabase (tabele `models_display`, `engines`)
 * + acelasi fallback ca pe front. Folosit in index (garaj) si anvelope (cautare automobil).
 */
import { engineFallbackByModelSlug } from "./engine-fallback-by-model.mjs";
import { fetchModelsDisplayOrFallback } from "./models-display-fallback.mjs";

/**
 * @typedef {{ id: string|number, name: string, slug?: string, logo_url?: string, source: string }} VehicleBrandOption
 */

/**
 * Incarca mărcile auto disponibile (brands + fallback models).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<{ brands: VehicleBrandOption[], error: string|null }>}
 */
export async function loadBrandsForSelector(supabase) {
  const brandsRes = await supabase.from("brands").select("*").order("name", { ascending: true });
  const brands = brandsRes.data || [];
  const brandsError = brandsRes.error;

  const modelsTry = await fetchModelsDisplayOrFallback(supabase);
  const rModelsBrandIds = await supabase.from("models").select("brand_id").limit(8000);
  const modelTableBrandIds = new Set(
    (rModelsBrandIds.data || [])
      .map((r) => String(r?.brand_id ?? "").trim())
      .filter(Boolean)
  );
  const activeBrandIds = new Set(
    (modelsTry.data || []).map((r) => String(r?.brand_id || "").trim()).filter(Boolean)
  );
  const modelBrandLabelById = new Map();
  (modelsTry.data || []).forEach((r) => {
    const id = String(r?.brand_id || "").trim();
    if (!id) return;
    const label = String(
      r?.brand_name ?? r?.brand ?? r?.manufacturer ?? r?.make ?? ""
    ).trim();
    if (label && !modelBrandLabelById.has(id)) modelBrandLabelById.set(id, label);
  });

  const brandsById = new Map(
    brands.map((b) => [String(b?.id ?? "").trim(), String(b?.name ?? b?.display_name ?? "").trim()])
  );

  let finalBrands = brands
    .filter(
      (b) =>
        activeBrandIds.size === 0 ||
        activeBrandIds.has(String(b.id)) ||
        modelTableBrandIds.has(String(b.id))
    )
    .map((b) => ({
      id: b.id,
      name: String(b.name || "").trim() || modelBrandLabelById.get(String(b.id)) || "",
      slug: String(b.slug ?? "").trim(),
      logo_url: b.logo_url || "",
      source: "brands",
    }))
    .filter((b) => b.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!finalBrands.length && !modelsTry.error) {
    finalBrands = Array.from(activeBrandIds)
      .map((id) => ({
        id,
        name: modelBrandLabelById.get(id) || brandsById.get(id) || `Brand ${id}`,
        slug: "",
        logo_url: "",
        source: "models_display",
      }))
      .filter((b) => b.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (!finalBrands.length) {
    const modelsFallbackTry = await supabase.from("models").select("*").limit(4000);
    if (!modelsFallbackTry.error) {
      const names = Array.from(
        new Set(
          (modelsFallbackTry.data || [])
            .map((r) =>
              String(
                brandsById.get(String(r?.brand_id ?? "").trim()) ??
                  r?.brand_name ??
                  r?.brand ??
                  r?.make ??
                  r?.manufacturer ??
                  r?.marque ??
                  r?.marca ??
                  ""
              ).trim()
            )
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      finalBrands = names.map((name, idx) => ({
        id: `m-${idx + 1}`,
        name,
        slug: "",
        logo_url: "",
        source: "models",
      }));
    }
  }

  if (!finalBrands.length) {
    return {
      brands: [],
      error:
        brandsError?.message ||
        modelsTry.error?.message ||
        "fara rezultate in brands/models",
    };
  }

  return { brands: finalBrands, error: null };
}

export function setPlaceholder(selectEl, label) {
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.selected = true;
  option.disabled = true;
  option.textContent = label;
  selectEl.appendChild(option);
}

function extractPhaseFromModelLabel(label) {
  const text = (label || "").toLowerCase();
  if (text.includes("non-fl") || text.includes("nfl")) return "non-fl";
  if (text.includes("lci")) return "lci";
  if (text.includes("fl")) return "fl";
  return "";
}

function normalizePhase(value) {
  const text = (value || "").toLowerCase().trim();
  if (!text) return "";
  if (text.includes("non-fl") || text.includes("nfl")) return "non-fl";
  if (text.includes("lci")) return "lci";
  if (text.includes("fl")) return "fl";
  return "";
}

function getFallbackEngines(modelSlug, modelLabel) {
  const selectedModelPhase = extractPhaseFromModelLabel(modelLabel);
  return (engineFallbackByModelSlug[modelSlug] || []).filter((engineText) => {
    if (!selectedModelPhase) return true;
    const phaseFromText = normalizePhase(engineText);
    if (!phaseFromText) return true;
    return phaseFromText === selectedModelPhase;
  });
}

export function fillEngineSelectFromFallback(engineSelectEl, modelSlug, modelLabel) {
  const engines = getFallbackEngines(modelSlug, modelLabel);
  if (engines.length === 0) {
    setPlaceholder(engineSelectEl, "Nu exista motorizari pentru acest model");
    engineSelectEl.disabled = true;
    return;
  }
  setPlaceholder(engineSelectEl, "Selecteaza motorizare");
  engines.forEach((engineText, idx) => {
    const option = document.createElement("option");
    option.value = `fallback-${modelSlug}-${idx}`;
    option.textContent = engineText;
    engineSelectEl.appendChild(option);
  });
  engineSelectEl.disabled = false;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ modelId: string, modelLabel: string, modelSlug: string }} ctx
 * @param {HTMLSelectElement} engineSelectEl
 */
export async function loadEnginesForModel(supabase, { modelId, modelLabel, modelSlug }, engineSelectEl) {
  setPlaceholder(engineSelectEl, "Se incarca motorizari...");
  engineSelectEl.disabled = true;

  const { data, error } = await supabase
    .from("engines")
    .select("*")
    .eq("model_id", modelId)
    .eq("is_active", true)
    .order("power_hp", { ascending: true });

  if (error) {
    console.error("Eroare la incarcare motorizari:", error.message);
    fillEngineSelectFromFallback(engineSelectEl, modelSlug, modelLabel);
    return;
  }

  const selectedModelPhase = extractPhaseFromModelLabel(modelLabel);
  const enginesByPhase = (data || []).filter((engine) => {
    if (!selectedModelPhase) return true;
    const fromColumn = normalizePhase(engine.phase_name);
    const fromDisplay = normalizePhase(engine.display_name);
    const enginePhase = fromColumn || fromDisplay;
    if (!enginePhase) return true;
    return enginePhase === selectedModelPhase;
  });

  const mergedEngineLabels = new Set(
    enginesByPhase.map((engine) => {
      const fallbackLabel = [
        engine.engine_code || "Cod necunoscut",
        engine.displacement_cc
          ? `${(engine.displacement_cc / 1000).toFixed(1)}L ${engine.fuel_type || ""}`.trim()
          : engine.fuel_type || "",
        engine.power_hp ? `${engine.power_hp} CP` : "",
        engine.power_kw ? `${engine.power_kw} kW` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      return engine.display_name || fallbackLabel;
    })
  );
  getFallbackEngines(modelSlug, modelLabel).forEach((fallbackLabel) => {
    mergedEngineLabels.add(fallbackLabel);
  });

  setPlaceholder(engineSelectEl, "Selecteaza motorizare");
  Array.from(mergedEngineLabels).forEach((engineLabel, idx) => {
    const option = document.createElement("option");
    option.value = `engine-${idx}`;
    option.textContent = engineLabel;
    engineSelectEl.appendChild(option);
  });
  if (mergedEngineLabels.size === 0) {
    fillEngineSelectFromFallback(engineSelectEl, modelSlug, modelLabel);
    return;
  }
  engineSelectEl.disabled = false;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} brandId
 * @param {HTMLSelectElement} modelSelectEl
 * @param {HTMLSelectElement} engineSelectEl
 */
export async function loadModelsForBrand(supabase, brandId, modelSelectEl, engineSelectEl) {
  setPlaceholder(modelSelectEl, "Se incarca modele...");
  modelSelectEl.disabled = true;
  setPlaceholder(engineSelectEl, "Selecteaza mai intai model");
  engineSelectEl.disabled = true;

  const { data, error } = await supabase
    .from("models_display")
    .select("id,slug,display_name")
    .eq("brand_id", brandId)
    .order("display_name", { ascending: true });

  setPlaceholder(modelSelectEl, "Selecteaza model");

  if (error) {
    const fallback = await supabase.from("models").select("*").limit(4000);
    if (fallback.error) {
      console.error("Eroare la incarcare modele:", error.message, fallback.error.message);
      return;
    }
    const byId = (fallback.data || []).filter((m) => String(m?.brand_id ?? "") === String(brandId));
    const byBrandText = (fallback.data || []).filter((m) =>
      [m?.brand_name, m?.brand, m?.make, m?.manufacturer, m?.marque, m?.marca]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .includes(String(brandId))
    );
    const rows = byId.length ? byId : byBrandText;
    const seen = new Set();
    rows.forEach((model, idx) => {
      const label = String(
        model?.display_name ?? model?.name ?? model?.model_name ?? model?.slug ?? `Model ${idx + 1}`
      ).trim();
      const key = `${model?.id ?? ""}|${label}`;
      if (!label || seen.has(key)) return;
      seen.add(key);
      const option = document.createElement("option");
      option.value = String(model?.id ?? `model-${idx + 1}`);
      option.textContent = label;
      option.dataset.modelSlug = model?.slug || label;
      modelSelectEl.appendChild(option);
    });
    modelSelectEl.disabled = false;
    return;
  }

  (data || []).forEach((model) => {
    const option = document.createElement("option");
    option.value = String(model.id);
    option.textContent = model.display_name;
    option.dataset.modelSlug = model.slug || "";
    modelSelectEl.appendChild(option);
  });
  modelSelectEl.disabled = false;
}

const CURRENT_PRODUCTION_YEAR = new Date().getFullYear() + 1;

function toProductionYear(v) {
  if (v == null) return null;
  const n = typeof v === "string" && /^\d{4}/.test(v) ? parseInt(v.slice(0, 4), 10) : Number(v);
  if (!Number.isFinite(n) || n < 1980 || n > CURRENT_PRODUCTION_YEAR) return null;
  return n;
}

function addYearRangeToSet(years, a, b) {
  const from = toProductionYear(a);
  const to0 = b != null && b !== "" ? toProductionYear(b) : from;
  if (from == null) return;
  const to1 = to0 == null ? from : to0;
  const lo = Math.min(from, to1);
  const hi = Math.max(from, to1);
  for (let y = lo; y <= hi; y++) years.add(y);
}

function collectYearsFromEngineRow(row, years) {
  const pairs = [
    [row.year_from, row.year_to],
    [row.start_year, row.end_year],
    [row.valid_from_year, row.valid_to_year],
  ];
  for (const [x, y] of pairs) {
    if (x != null || y != null) addYearRangeToSet(years, x, y);
  }
  if (row.valid_from || row.valid_to) {
    const f = row.valid_from ? new Date(row.valid_from).getFullYear() : null;
    const t = row.valid_to ? new Date(row.valid_to).getFullYear() : f;
    if (Number.isFinite(f)) addYearRangeToSet(years, f, t);
  }
}

function collectYearsFromModelRow(row, years) {
  addYearRangeToSet(
    years,
    row.year_start ?? row.production_start_year ?? row.production_from ?? row.start_year,
    row.year_end ?? row.production_end_year ?? row.production_to ?? row.end_year
  );
}

/** Din etichete gen "Golf 8 (2019-2024)" */
function yearsFromModelLabelText(text, years) {
  if (!text) return;
  const rangeM = String(text).match(
    /(?:\(|[^\d]|\b)(19[89]\d|20\d{2})\s*[-—–~]\s*(19[89]\d|20\d{2})/
  );
  if (rangeM) {
    addYearRangeToSet(years, rangeM[1], rangeM[2]);
    return;
  }
  const nums = String(text).match(/\b(19[89]\d|20\d{2})\b/g);
  if (nums && nums.length >= 2) {
    const v = nums.map((s) => parseInt(s, 10)).sort((a, b) => a - b);
    addYearRangeToSet(years, v[0], v[v.length - 1]);
  } else if (nums && nums.length === 1) {
    const y = toProductionYear(nums[0]);
    if (y) years.add(y);
  }
}

/**
 * Propose anii in care modelul a fost (sau e) in productie, din datele din DB, nu o plaja generica.
 * Ordoneaza: 1) `model_production_years` 2) `engines` (intervale) 3) `models` / `models_display` 4) etichet.
 * @param {string} [modelLabel] — textul optiunii (ex. models_display.display_name) pentru euristica
 */
export async function loadYearsForModel(supabase, modelId, yearSelect, modelLabel) {
  setPlaceholder(yearSelect, "Se incarca ani...");
  yearSelect.disabled = true;

  const years = new Set();

  const rMy = await supabase
    .from("model_production_years")
    .select("year")
    .eq("model_id", modelId)
    .order("year", { ascending: false });
  if (!rMy.error && rMy.data?.length) {
    for (const row of rMy.data) {
      const y = toProductionYear(row.year);
      if (y != null) years.add(y);
    }
  }

  let rEng = await supabase
    .from("engines")
    .select("*")
    .eq("model_id", modelId)
    .eq("is_active", true);
  if (rEng.error) {
    rEng = await supabase.from("engines").select("*").eq("model_id", modelId);
  }
  if (!rEng.error && rEng.data?.length) {
    for (const row of rEng.data) collectYearsFromEngineRow(row, years);
  }

  for (const table of ["models", "models_display"]) {
    const rM = await supabase.from(table).select("*").eq("id", modelId).maybeSingle();
    if (rM.error) continue;
    if (rM.data) collectYearsFromModelRow(rM.data, years);
  }

  if (years.size === 0 && modelLabel) {
    yearsFromModelLabelText(modelLabel, years);
  }

  if (years.size > 0) {
    setPlaceholder(yearSelect, "Alege anul");
    const sorted = Array.from(years).sort((a, b) => b - a);
    for (const y of sorted) {
      const o = document.createElement("option");
      o.value = String(y);
      o.textContent = String(y);
      yearSelect.appendChild(o);
    }
    yearSelect.disabled = false;
    return;
  }

  if (rMy.error) {
    const msg = String(rMy.error?.message || rMy.error?.code || "");
    if (msg && !/does not exist|schema cache|PGRST205/i.test(msg)) {
      console.warn("model_production_years:", msg);
    }
  }

  setPlaceholder(
    yearSelect,
    "Nu s-au gasit ani de productie in catalog (vezi nota in consola)"
  );
  const o = document.createElement("option");
  o.value = "";
  o.textContent = "Nespecificat (mappa in DB: ani model / motoare)";
  yearSelect.appendChild(o);
  yearSelect.disabled = false;
  console.info(
    "[anvelope/vehicul] Fara plaja: completeaza model_production_years (model_id, year) " +
      "sau in engines: year_from/year_to (sau start_year/end_year, valid_from/valid_to), " +
      "sau in models: year_start/year_end sau production_*."
  );
}
