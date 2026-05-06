import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import {
  setPlaceholder,
  loadModelsForBrand,
  loadEnginesForModel,
  loadYearsForModel,
} from "./vehicle-garage-loaders.mjs";
import { fetchModelsDisplayOrFallback } from "./models-display-fallback.mjs";

function setHint(hintEl, state) {
  if (!hintEl) return;
  if (state === "need-brand")
    hintEl.textContent = "— se activeaza dupa alegerea marcii";
  if (state === "pick-model") hintEl.textContent = "— alege modelul (din baza de date)";
  if (state === "pick-year-motor") hintEl.textContent = "";
}

function init() {
  const brandSel = document.getElementById("anv-a-marca");
  const modelSel = document.getElementById("anv-a-model");
  const yearSel = document.getElementById("anv-a-an");
  const engineSel = document.getElementById("anv-a-motor");
  const hint = document.getElementById("anv-a-model-hint");

  if (!brandSel || !modelSel || !yearSel || !engineSel) return;

  if (
    SUPABASE_URL.includes("YOUR-PROJECT") ||
    SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY")
  ) {
    console.warn(
      "[anvelope] Seteaza SUPABASE_URL si cheia in assets/js/supabase-config.mjs pentru date vehicul."
    );
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function resetChainFromBrand() {
    setPlaceholder(modelSel, "Se incarca modele...");
    modelSel.disabled = true;
    setHint(hint, "need-brand");
    setPlaceholder(yearSel, "Alege intai modelul");
    yearSel.disabled = true;
    setPlaceholder(engineSel, "Alege intai modelul");
    engineSel.disabled = true;
  }

  async function initBrands() {
    setPlaceholder(brandSel, "Se incarca marci...");
    brandSel.disabled = true;
    setPlaceholder(modelSel, "Selecteaza mai intai marca");
    setPlaceholder(yearSel, "Alege intai modelul");
    setPlaceholder(engineSel, "Alege intai modelul");
    modelSel.disabled = true;
    yearSel.disabled = true;
    engineSel.disabled = true;
    setHint(hint, "need-brand");

    let data = [];
    let error = null;
    const firstTry = await supabase
      .from("brands")
      .select("id,name,logo_url")
      .eq("is_active", true)
      .order("name", { ascending: true });
    data = firstTry.data || [];
    error = firstTry.error;

    if (error) {
      const secondTry = await supabase
        .from("brands")
        .select("id,name,logo_url")
        .order("name", { ascending: true });
      data = secondTry.data || [];
      error = secondTry.error;
    }

    const modelsTry = await fetchModelsDisplayOrFallback(supabase);
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

    let finalBrands = (data || [])
      .filter((b) => activeBrandIds.size === 0 || activeBrandIds.has(String(b.id)))
      .map((b) => ({
        id: b.id,
        name: String(b.name || "").trim() || modelBrandLabelById.get(String(b.id)) || "",
        logo_url: b.logo_url || "",
        source: "brands",
      }))
      .filter((b) => b.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!finalBrands.length && !modelsTry.error) {
      finalBrands = Array.from(activeBrandIds)
        .map((id) => ({
          id,
          name: modelBrandLabelById.get(id) || `Brand ${id}`,
          logo_url: "",
          source: "models_display",
        }))
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
          logo_url: "",
          source: "models",
        }));
      }
    }

    if (!finalBrands.length) {
      console.error(
        "Eroare anvelope / marci:",
        error?.message ||
          modelsTry.error?.message ||
          "fara rezultate in brands/models_display/models"
      );
      setPlaceholder(brandSel, "Eroare la incarcare marci");
      return;
    }

    setPlaceholder(brandSel, "Selecteaza marca");
    finalBrands.forEach((b) => {
      const o = document.createElement("option");
      o.value = String(b.id);
      o.textContent = b.name;
      o.dataset.logoUrl = b.logo_url || "";
      o.dataset.source = b.source;
      brandSel.appendChild(o);
    });
    brandSel.disabled = false;
    document.dispatchEvent(
      new CustomEvent("anv-vehicle-form-ready", { bubbles: true, detail: { ok: true } })
    );
  }

  brandSel.addEventListener("change", async () => {
    if (!brandSel.value) {
      await resetChainFromBrand();
      return;
    }
    const selectedOption = brandSel.options[brandSel.selectedIndex];
    if (selectedOption?.dataset?.source === "models") {
      setPlaceholder(modelSel, "Se incarca modele...");
      modelSel.disabled = true;
      setPlaceholder(yearSel, "Alege intai modelul");
      yearSel.disabled = true;
      setPlaceholder(engineSel, "Alege intai modelul");
      engineSel.disabled = true;
      const selectedBrandName = String(selectedOption?.textContent || "").trim().toLowerCase();
      const { data: allModels, error: modelsError } = await supabase
        .from("models")
        .select("*")
        .limit(4000);
      if (modelsError) {
        setPlaceholder(modelSel, "Eroare incarcare modele");
        modelSel.disabled = true;
        return;
      }
      const matched = (allModels || []).filter((r) => {
        const labels = [
          r?.brand_name,
          r?.brand,
          r?.make,
          r?.manufacturer,
          r?.marque,
          r?.marca,
        ]
          .map((v) => String(v || "").trim().toLowerCase())
          .filter(Boolean);
        return labels.includes(selectedBrandName);
      });
      if (!matched.length) {
        setPlaceholder(modelSel, "Nu exista modele pentru marca selectata");
        modelSel.disabled = true;
        return;
      }
      setPlaceholder(modelSel, "Selecteaza model");
      const seen = new Set();
      matched.forEach((m, idx) => {
        const label = String(
          m?.display_name ?? m?.name ?? m?.model_name ?? m?.slug ?? `Model ${idx + 1}`
        ).trim();
        const key = `${m?.id ?? ""}|${label}`;
        if (!label || seen.has(key)) return;
        seen.add(key);
        const opt = document.createElement("option");
        opt.value = String(m?.id ?? `model-${idx + 1}`);
        opt.textContent = label;
        opt.dataset.modelSlug = String(m?.slug ?? label).trim();
        modelSel.appendChild(opt);
      });
      modelSel.disabled = false;
      return;
    }
    setHint(hint, "pick-model");
    setPlaceholder(yearSel, "Alege intai modelul");
    yearSel.disabled = true;
    setPlaceholder(engineSel, "Alege intai modelul");
    engineSel.disabled = true;
    await loadModelsForBrand(supabase, brandSel.value, modelSel, engineSel);
  });

  modelSel.addEventListener("change", async () => {
    const opt = modelSel.options[modelSel.selectedIndex];
    const modelId = modelSel.value;
    const modelLabel = opt?.textContent || "";
    const modelSlug = opt?.dataset?.modelSlug || "";

    if (!modelId) {
      setPlaceholder(yearSel, "Alege intai modelul");
      yearSel.disabled = true;
      setPlaceholder(engineSel, "Alege intai modelul");
      engineSel.disabled = true;
      setHint(hint, "pick-model");
      return;
    }
    setHint(hint, "pick-year-motor");
    await loadYearsForModel(supabase, modelId, yearSel, modelLabel);
    await loadEnginesForModel(
      supabase,
      { modelId, modelLabel, modelSlug },
      engineSel
    );
  });

  initBrands();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
