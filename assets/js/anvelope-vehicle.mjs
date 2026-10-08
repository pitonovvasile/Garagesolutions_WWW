import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import {
  setPlaceholder,
  loadModelsForBrand,
  loadEnginesForModel,
  loadYearsForModel,
  loadBrandsForSelector,
} from "./vehicle-garage-loaders.mjs";

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

    const { brands: finalBrands, error } = await loadBrandsForSelector(supabase);

    if (!finalBrands.length) {
      console.error("Eroare anvelope / marci:", error || "fara rezultate");
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
      if (b.slug) o.dataset.brandSlug = b.slug;
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
