import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";

const JANTE_CATEGORY_ALIASES = ["jante-auto", "jante", "Jante auto"];

function formatProductCountLabel(count) {
  if (count === 1) return " produs disponibil";
  return " produse disponibile";
}

async function loadCategoryProductCount() {
  const valueEl = document.getElementById("whl-category-product-count-value");
  const labelEl = document.getElementById("whl-category-product-count-label");
  if (!valueEl) return;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let count = 0;

    for (const alias of JANTE_CATEGORY_ALIASES) {
      const { count: exactCount, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category", alias);
      if (error) throw new Error(error.message);
      if (typeof exactCount === "number" && exactCount > count) count = exactCount;
    }

    if (count === 0) {
      const { count: fuzzyCount, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .ilike("category", "%jante%");
      if (error) throw new Error(error.message);
      if (typeof fuzzyCount === "number") count = fuzzyCount;
    }

    valueEl.textContent = String(count);
    if (labelEl) labelEl.textContent = formatProductCountLabel(count);
  } catch (error) {
    console.warn("[jante] category product count", error);
    valueEl.textContent = "0";
    if (labelEl) labelEl.textContent = formatProductCountLabel(0);
  }
}

/**
 * Panou filtrare jante — stare UI, filtre active, integrare carusel mărci.
 */
export function initJanteFilter(root) {
  if (!root) return;

  const activeBar = document.getElementById("whl-active-filters");
  const resultsEl = document.getElementById("whl-results-count");
  const resultsHint = document.getElementById("whl-results-hint");

  function labelForInput(input) {
    if (input.dataset.whlLabel) return input.dataset.whlLabel;
    const chip = root.querySelector(
      `.whl-filter-chip[data-whl-for="${input.name}"][data-whl-value="${input.value}"]`
    );
    if (chip) return chip.textContent.trim();
    if (input.tagName === "SELECT") {
      const opt = input.options[input.selectedIndex];
      if (opt && opt.value) return opt.textContent.trim();
    }
    return input.value;
  }

  function collectFilters() {
    const items = [];

    root.querySelectorAll('input[type="checkbox"][data-whl-filter]:checked').forEach((input) => {
      items.push({
        key: `${input.name}:${input.value}`,
        group: input.dataset.whlGroup || input.name,
        label: labelForInput(input),
        input,
      });
    });

    root.querySelectorAll("select[data-whl-filter]").forEach((select) => {
      if (!select.value) return;
      items.push({
        key: `${select.name}:${select.value}`,
        group: select.dataset.whlGroup || select.name,
        label: labelForInput(select),
        input: select,
      });
    });

    const brandChip = document.querySelector(
      ".anv-brand-marquee__chip[data-wheel-brand].is-selected"
    );
    if (brandChip) {
      items.unshift({
        key: `brand:${brandChip.dataset.wheelBrand}`,
        group: "Marca",
        label: brandChip.textContent.trim(),
        brandId: brandChip.dataset.wheelBrand,
      });
    }

    return items;
  }

  function renderActiveFilters() {
    if (!activeBar) return;
    const filters = collectFilters();
    activeBar.querySelectorAll(".whl-active-filters__pill").forEach((el) => el.remove());

    filters.forEach((f) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "whl-active-filters__pill";
      pill.dataset.whlRemove = f.key;
      pill.innerHTML = `<span class="whl-active-filters__pill-group">${f.group}</span> ${f.label}<span class="whl-active-filters__pill-x" aria-hidden="true">×</span>`;
      pill.setAttribute("aria-label", `Elimină filtrul ${f.label}`);
      activeBar.appendChild(pill);
    });

    if (activeBar) activeBar.hidden = filters.length === 0;
  }

  function updateResultsPreview() {
    const n = collectFilters().length;
    if (resultsEl) {
      resultsEl.textContent = n === 0 ? "—" : String(Math.max(12, 840 - n * 47 + (n % 3) * 11));
    }
    if (resultsHint) {
      resultsHint.textContent =
        n === 0
          ? "Alege criterii din panoul de filtrare sau o marcă din carusel."
          : `${n} ${n === 1 ? "filtru activ" : "filtre active"} — rezultate demo până la conectarea stocului.`;
    }
  }

  function initSpecsVisualToggles() {
    const rootEl = document.getElementById("whl-specs-visual");
    if (!rootEl) return;

    rootEl.querySelectorAll(".whl-specs-visual__section-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const section = btn.dataset.whlSection;
        if (!section) return;
        const attr = section === "backspace" ? "data-whl-backspace-open" : "data-whl-offset-open";
        const expanded = rootEl.getAttribute(attr) !== "true";
        rootEl.setAttribute(attr, expanded ? "true" : "false");
        btn.classList.toggle("is-expanded", expanded);
        btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      });
    });
  }

  function syncChip(input) {
    const chip = root.querySelector(
      `.whl-filter-chip[data-whl-for="${input.name}"][data-whl-value="${input.value}"]`
    );
    if (chip) chip.classList.toggle("is-on", input.checked);
  }

  function clearFilter(key) {
    if (key.startsWith("brand:")) {
      document.querySelectorAll(".anv-brand-marquee__chip[data-wheel-brand]").forEach((c) => {
        c.classList.remove("is-selected");
      });
      return;
    }
    const [name, value] = key.split(":");
    const input = root.querySelector(
      `input[type="checkbox"][name="${name}"][value="${value}"], select[name="${name}"]`
    );
    if (!input) return;
    if (input.type === "checkbox") {
      input.checked = false;
      syncChip(input);
    } else {
      input.value = "";
    }
  }

  root.querySelectorAll('input[type="checkbox"][data-whl-filter]').forEach((input) => {
    syncChip(input);
    input.addEventListener("change", () => {
      syncChip(input);
      renderActiveFilters();
      updateResultsPreview();
    });
  });

  root.querySelectorAll(".whl-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const name = chip.dataset.whlFor;
      const value = chip.dataset.whlValue;
      const input = root.querySelector(
        `input[type="checkbox"][name="${name}"][value="${value}"]`
      );
      if (!input) return;
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  root.querySelectorAll("select[data-whl-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      renderActiveFilters();
      updateResultsPreview();
    });
  });

  activeBar?.addEventListener("click", (e) => {
    const pill = e.target.closest(".whl-active-filters__pill");
    if (!pill) return;
    clearFilter(pill.dataset.whlRemove);
    renderActiveFilters();
    updateResultsPreview();
  });

  document.getElementById("whl-btn-reset")?.addEventListener("click", () => {
    root.querySelectorAll('input[type="checkbox"][data-whl-filter]').forEach((input) => {
      input.checked = false;
      syncChip(input);
    });
    root.querySelectorAll("select[data-whl-filter]").forEach((select) => {
      select.value = "";
    });
    document.querySelectorAll(".anv-brand-marquee__chip[data-wheel-brand]").forEach((c) => {
      c.classList.remove("is-selected");
    });
    renderActiveFilters();
    updateResultsPreview();
  });

  document.getElementById("whl-btn-search")?.addEventListener("click", () => {
    const filters = collectFilters();
    const summary = filters.map((f) => `${f.group}: ${f.label}`).join(" | ");
    console.info("[jante] Cauta jante:", summary || "(fara filtre)");
    updateResultsPreview();
  });

  document.querySelectorAll(".anv-brand-marquee__chip[data-wheel-brand]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const brandId = chip.dataset.wheelBrand;
      if (!brandId) return;
      document.querySelectorAll(".anv-brand-marquee__chip[data-wheel-brand]").forEach((c) => {
        c.classList.toggle("is-selected", c.dataset.wheelBrand === brandId);
      });
      renderActiveFilters();
      updateResultsPreview();
    });
  });

  renderActiveFilters();
  updateResultsPreview();
  initSpecsVisualToggles();
  loadCategoryProductCount();
}
