import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import {
  loadModelsForBrand,
  loadEnginesForModel,
  loadYearsForModel,
} from "./vehicle-garage-loaders.mjs";
import { readSavedCars, onGarageCarsUpdated } from "./garage-saved-cars.mjs";
import { getBrandLogoUrl } from "./brand-logo-fallbacks.mjs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Sesiune: folosește / nu aplica date din garaj când e „ON”/„OFF” pe buton. */
const ANV_GARAGE_SOURCE_KEY = "anvGarageSourceOn";

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim();
}

function findOptionByLabel(select, label) {
  if (!select || !label) return null;
  const n = norm(label);
  for (let i = 0; i < select.options.length; i++) {
    const o = select.options[i];
    if (o.disabled || !o.value) continue;
    const t = norm(o.textContent);
    if (t === n) return o;
  }
  for (let i = 0; i < select.options.length; i++) {
    const o = select.options[i];
    if (o.disabled || !o.value) continue;
    const t = norm(o.textContent);
    if (t.includes(n) || n.includes(t)) return o;
  }
  for (let i = 0; i < select.options.length; i++) {
    const o = select.options[i];
    if (o.disabled || !o.value) continue;
    if (n.split(" ").filter((w) => w.length > 2).some((w) => norm(o.textContent).includes(w)))
      return o;
  }
  return null;
}

function findEngineOption(select, fullEngine) {
  if (!select || !fullEngine) return null;
  const n = (fullEngine || "").trim();
  for (let i = 0; i < select.options.length; i++) {
    const o = select.options[i];
    if (o.disabled || o.value === "") continue;
    const t = o.textContent || "";
    if (t === n) return o;
  }
  for (let i = 0; i < select.options.length; i++) {
    const o = select.options[i];
    if (o.disabled || o.value === "") continue;
    const t = o.textContent || "";
    if (n.length > 6 && t.includes(n.slice(0, Math.min(24, n.length)))) return o;
    if (t.length > 6 && n.includes(t.slice(0, Math.min(24, t.length)))) return o;
  }
  for (let i = 0; i < select.options.length; i++) {
    const o = select.options[i];
    if (o.disabled || o.value === "") continue;
    if (n.split("|")[0] && o.textContent.includes(n.split("|")[0].trim())) return o;
  }
  return null;
}

function resolveCarBrandLogoUrl(car) {
  if (!car) return "";
  const explicit = typeof car.brandLogoUrl === "string" ? car.brandLogoUrl.trim() : "";
  if (explicit) return explicit;
  const brandSel = document.getElementById("anv-a-marca");
  if (brandSel && car.brand) {
    const opt = findOptionByLabel(brandSel, car.brand);
    const fromSelect = opt?.dataset?.logoUrl?.trim();
    if (fromSelect) return fromSelect;
  }
  return getBrandLogoUrl(car.brand) || "";
}

function updateCarBrandLogo(car) {
  const wrap = document.getElementById("anv-car-brand-logo-wrap");
  const img = document.getElementById("anv-car-brand-logo");
  if (!wrap || !img) return;
  const url = car ? resolveCarBrandLogoUrl(car) : "";
  if (url) {
    img.src = url;
    img.alt = car?.brand ? `${car.brand} logo` : "";
    img.hidden = false;
    wrap.classList.add("anv-selector__car-ico--has-logo");
  } else {
    img.removeAttribute("src");
    img.alt = "";
    img.hidden = true;
    wrap.classList.remove("anv-selector__car-ico--has-logo");
  }
}

let formReady = false;

/**
 * Aplica pe selectoarele din "Cautare dupa automobil" pornind de la obiectul salva pe Acasa
 * ({ brand, model, engine } text).
 */
export async function applySavedCarToAnvelopeForm(car) {
  const brandSel = document.getElementById("anv-a-marca");
  const modelSel = document.getElementById("anv-a-model");
  const yearSel = document.getElementById("anv-a-an");
  const engineSel = document.getElementById("anv-a-motor");
  if (!car || !brandSel || !modelSel || !yearSel || !engineSel) return;
  if (brandSel.disabled) return;
  if (!car.brand || !car.model || !car.engine) return;

  const bOpt = findOptionByLabel(brandSel, car.brand);
  if (!bOpt) {
    console.warn("[anvelope] Marca negasita in listă:", car.brand);
    return;
  }
  brandSel.value = bOpt.value;
  await loadModelsForBrand(supabase, brandSel.value, modelSel, engineSel);

  const mOpt = findOptionByLabel(modelSel, car.model);
  if (!mOpt) {
    console.warn("[anvelope] Model negasit in listă:", car.model);
    return;
  }
  modelSel.value = mOpt.value;
  const modelLabel = mOpt.textContent?.trim() || car.model;
  const modelSlug = mOpt.dataset?.modelSlug || "";
  const modelId = modelSel.value;

  await loadYearsForModel(supabase, modelId, yearSel, modelLabel);
  await loadEnginesForModel(
    supabase,
    { modelId, modelLabel, modelSlug },
    engineSel
  );

  const eOpt = findEngineOption(engineSel, car.engine);
  if (eOpt) {
    engineSel.value = eOpt.value;
  } else {
    console.warn("[anvelope] Motorizare aproximativa — alege manual daca e nevoie.");
  }
  updateCarBrandLogo(car);
}

function init() {
  const up = document.getElementById("anv-garage-up");
  const down = document.getElementById("anv-garage-down");
  const view = document.getElementById("anv-garage-view");
  const meta = document.getElementById("anv-garage-meta");
  const garageRoot = document.getElementById("anv-garage");
  const sourceToggle = document.getElementById("anv-garage-title");
  if (!up || !down || !view) return;

  let sourceOn = sessionStorage.getItem(ANV_GARAGE_SOURCE_KEY) !== "0";

  function applySourceToDom() {
    if (sourceToggle) {
      sourceToggle.setAttribute("aria-pressed", sourceOn ? "true" : "false");
    }
    if (garageRoot) {
      garageRoot.classList.toggle("anv-garage--source-off", !sourceOn);
    }
  }

  if (
    SUPABASE_URL.includes("YOUR-PROJECT") ||
    SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY")
  ) {
    view.textContent = "Configurează baza (supabase) pentru a aplica o mașină pe formular.";
    if (sourceToggle) {
      sourceToggle.disabled = true;
      sourceToggle.setAttribute("aria-pressed", "false");
    }
    if (garageRoot) {
      garageRoot.classList.add("anv-garage--source-off");
    }
    return;
  }

  if (sourceToggle) {
    sourceToggle.addEventListener("click", function () {
      sourceOn = !sourceOn;
      try {
        sessionStorage.setItem(ANV_GARAGE_SOURCE_KEY, sourceOn ? "1" : "0");
      } catch (e) {
        /* private mode */
      }
      applySourceToDom();
      index = 0;
      updateUi();
      if (formReady && sourceOn && cars.length > 0) {
        applySavedCarToAnvelopeForm(cars[index]).catch(function () {});
      }
    });
  }
  applySourceToDom();

  let cars = [];
  let index = 0;

  function refreshCars() {
    cars = readSavedCars();
    if (index >= cars.length) index = 0;
  }

  function updateUi() {
    refreshCars();
    if (!sourceOn) {
      view.textContent =
        "Sursa garaj oprită. Apasă butonul de sus ca să o pornești (LED aprins).";
      meta.textContent = "";
      up.disabled = true;
      down.disabled = true;
      updateCarBrandLogo(null);
      return;
    }
    if (cars.length === 0) {
      view.textContent = "Nicio mașină în garaj. Pe Acasă, „Salvează” o selecție.";
      meta.textContent = "";
      up.disabled = true;
      down.disabled = true;
      updateCarBrandLogo(null);
      return;
    }
    if (index < 0) index = cars.length - 1;
    if (index >= cars.length) index = 0;
    const c = cars[index];
    view.innerHTML = "";
    const line = document.createElement("span");
    line.className = "anv-garage__line";
    line.appendChild(
      document.createTextNode(
        (c.brand || "") + " · " + (c.model || "") + (c.engine ? "\n" + c.engine : "")
      )
    );
    view.appendChild(line);
    meta.textContent = `${index + 1} / ${cars.length}`;
    up.disabled = false;
    down.disabled = false;
    updateCarBrandLogo(c);
  }

  async function step(delta) {
    refreshCars();
    if (!sourceOn) {
      updateUi();
      return;
    }
    if (cars.length === 0) {
      updateUi();
      return;
    }
    index = (index + delta + cars.length) % cars.length;
    updateUi();
    if (formReady && sourceOn && cars[index]) {
      try {
        await applySavedCarToAnvelopeForm(cars[index]);
      } catch (e) {
        console.error("[anvelope] Eroare la aplicare garaj:", e);
      }
    }
  }

  up.addEventListener("click", function () {
    step(-1);
  });
  down.addEventListener("click", function () {
    step(1);
  });

  view.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      step(-1);
    }
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      step(1);
    }
  });

  function onGarageChanged() {
    index = 0;
    updateUi();
  }
  void onGarageCarsUpdated(onGarageChanged);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      refreshCars();
      updateUi();
    }
  });

  const autoTab = document.getElementById("anv-tab-auto");
  if (autoTab) {
    autoTab.addEventListener("click", function () {
      setTimeout(function () {
        refreshCars();
        updateUi();
        if (formReady && sourceOn && cars.length > 0) {
          applySavedCarToAnvelopeForm(cars[index]).catch(function () {});
        }
      }, 0);
    });
  }

  void import("./garage-cloud-sync.mjs")
    .then((m) => m.syncGarageFromCloudAndLocal())
    .catch((e) => console.warn("[anvelope] garaj sync", e))
    .finally(() => {
      updateUi();
    });

  document.addEventListener("anv-vehicle-form-ready", function onVehReady() {
    document.removeEventListener("anv-vehicle-form-ready", onVehReady);
    formReady = true;
    refreshCars();
    index = 0;
    updateUi();
    if (sourceOn && cars.length > 0) {
      applySavedCarToAnvelopeForm(cars[0]).catch(function () {});
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
