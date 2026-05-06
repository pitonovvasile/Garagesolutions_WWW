import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import { readSavedCars } from "./garage-saved-cars.mjs";

function parseCarIndex() {
  const raw = new URLSearchParams(window.location.search).get("car");
  if (raw === null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clampIndex(i, len) {
  if (len <= 0) return 0;
  return Math.min(Math.max(0, i), len - 1);
}

function esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function extractBrand(row) {
  return row.brand ?? row.producer ?? row.manufacturer ?? "";
}
function extractPrice(row) {
  const n = Number(row.price ?? row.price_ron ?? row.sale_price ?? null);
  return Number.isFinite(n) ? n : null;
}
function extractName(row) {
  return row.name ?? row.title ?? row.product_name ?? "Unnamed product";
}
function inferEngineType(engineLabel = "") {
  const t = String(engineLabel).toLowerCase();
  if (t.includes("diesel") || t.includes("tdi") || t.includes("d ")) return "diesel";
  return "petrol";
}
function inferChassis(modelLabel = "") {
  const m = String(modelLabel).toUpperCase().match(/\b[A-Z]\d{2}\b/);
  return m ? m[0] : "";
}
function inferEngineCode(car = null) {
  if (!car) return "";
  const source = `${car.model || ""} ${car.engine || ""}`.toUpperCase();
  const m =
    source.match(/\b([MSN]\d{2}[A-Z]\d{2})\b/) ||
    source.match(/\b([MSN]\d{2})\b/);
  return m ? m[1] : "";
}

export async function initTransmissionCategoryPage(config) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const {
    categoryKey,
    title,
    subtitle,
    description,
    items = [],
    icon = "../assets/transmission-icon.png",
  } = config;

  const titleEl = document.getElementById("tx-cat-title");
  const subtitleEl = document.getElementById("tx-cat-subtitle");
  const descEl = document.getElementById("tx-cat-description");
  const iconEl = document.getElementById("tx-cat-icon");
  const carEl = document.getElementById("tx-selected-car");
  const listEl = document.getElementById("tx-subcats");
  const resultsEl = document.getElementById("tx-results");
  const searchEl = document.getElementById("tx-search");
  const brandEl = document.getElementById("tx-brand");
  const engineCodeEl = document.getElementById("tx-engine-code");
  const priceEl = document.getElementById("tx-price");
  const backEl = document.getElementById("tx-back-garage");

  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  descEl.textContent = description;
  iconEl.src = icon;

  const cars = readSavedCars();
  const carIndex = clampIndex(parseCarIndex(), cars.length);
  const qs = `?car=${carIndex}`;
  backEl.setAttribute("href", `../garage.html${qs}`);
  const car = cars[carIndex];
  carEl.textContent = car
    ? `Selected car: ${car.brand} ${car.model ?? "—"} · ${car.engine ?? "—"}`
    : "Selected car: no car saved in garage";

  const subQ = new URLSearchParams(window.location.search).get("subcategory") || "";
  let activeSubcategory = subQ && items.includes(subQ) ? subQ : "";

  listEl.innerHTML = items
    .map((s) => {
      const active = s === activeSubcategory ? " tx-chip--active" : "";
      const href = `?car=${carIndex}&subcategory=${encodeURIComponent(s)}`;
      return `<a class="tx-chip${active}" href="${href}" data-sub="${esc(s)}">${esc(s)}</a>`;
    })
    .join("");

  let rows = [];
  let fitmentFilteredRows = [];
  const norm = (v) => String(v ?? "").trim().toLowerCase();
  const extractEngineCode = (row) => String(row?.fitment?.engine_code ?? row?.engine_code ?? "").trim();
  async function queryCategoryProducts() {
    const aliases = Array.from(new Set([categoryKey, title, norm(categoryKey), norm(title)].filter(Boolean)));
    let bucket = [];
    for (const alias of aliases) {
      const { data, error } = await supabase.from("products").select("*").eq("category", alias).limit(400);
      if (error) {
        throw new Error(`products/${alias}: ${error.message}`);
      }
      bucket = bucket.concat(data ?? []);
    }
    if (!bucket.length) {
      const categoryHints = Array.from(new Set([categoryKey, title].filter(Boolean)));
      for (const hint of categoryHints) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .ilike("category", `%${hint}%`)
          .limit(400);
        if (error) {
          throw new Error(`products ilike category ${hint}: ${error.message}`);
        }
        bucket = bucket.concat(data ?? []);
      }
    }
    if (!bucket.length && Array.isArray(items) && items.length) {
      for (const sub of items) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .ilike("subcategory", `%${sub}%`)
          .limit(400);
        if (error) {
          throw new Error(`products ilike subcategory ${sub}: ${error.message}`);
        }
        bucket = bucket.concat(data ?? []);
      }
    }
    const seen = new Set();
    const deduped = bucket.filter((row) => {
      const key = String(row?.id ?? `${row?.category}|${row?.subcategory}|${row?.brand}|${row?.name}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped;
  }

  function renderProducts() {
    const q = searchEl.value.trim().toLowerCase();
    const brand = brandEl.value.trim().toLowerCase();
    const engineCode = norm(engineCodeEl?.value ?? "");
    const priceBand = priceEl.value;
    const activeSub = norm(activeSubcategory);
    const hasAnySubMatch =
      !activeSub || rows.some((r) => norm(r.subcategory) === activeSub);

    const filtered = fitmentFilteredRows.filter((r) => {
      const name = extractName(r).toLowerCase();
      const rBrand = extractBrand(r).toLowerCase();
      const rEngineCode = norm(extractEngineCode(r));
      const sub = norm(r.subcategory);
      const p = extractPrice(r);
      if (activeSub && hasAnySubMatch && sub !== activeSub) return false;
      if (q && !name.includes(q) && !rBrand.includes(q)) return false;
      if (brand && rBrand !== brand) return false;
      if (engineCode && rEngineCode !== engineCode) return false;
      if (priceBand === "0-500" && !(p !== null && p <= 500)) return false;
      if (priceBand === "500-1000" && !(p !== null && p >= 500 && p <= 1000)) return false;
      if (priceBand === "1000+" && !(p !== null && p >= 1000)) return false;
      return true;
    });

    if (!filtered.length) {
      resultsEl.innerHTML = "<p class='tx-note'>No products found for current filters.</p>";
      return;
    }
    const subNote =
      activeSub && !hasAnySubMatch
        ? `<p class="tx-note">No exact DB match for "${esc(activeSubcategory)}"; showing all products from this category.</p>`
        : "";
    resultsEl.innerHTML = `${subNote}<ul class="tx-products">${filtered
      .map((r) => {
        const n = esc(extractName(r));
        const b = esc(extractBrand(r) || "n/a");
        const s = esc(String(r.subcategory ?? "n/a"));
        const p = extractPrice(r);
        return `<li><strong>${n}</strong><span>${b}</span><span>${s}</span><span>${p !== null ? `${p} RON` : "price n/a"}</span></li>`;
      })
      .join("")}</ul>`;
  }

  try {
    rows = await queryCategoryProducts();
    const selectedCarFitment = car
      ? {
          chassis: inferChassis(car.model),
          engineType: inferEngineType(car.engine),
          engineCode: inferEngineCode(car),
        }
      : null;
    const matchingFitmentRows = selectedCarFitment
      ? rows.filter((r) => {
          const rf = r?.fitment || {};
          if (!rf || typeof rf !== "object") return false;
          const chassisOk = !selectedCarFitment.chassis || !rf.chassis || String(rf.chassis).toUpperCase() === selectedCarFitment.chassis;
          const engineTypeOk =
            !selectedCarFitment.engineType ||
            !rf.engine_type ||
            String(rf.engine_type).toLowerCase() === selectedCarFitment.engineType;
          return chassisOk && engineTypeOk;
        })
      : [];
    fitmentFilteredRows = matchingFitmentRows.length ? matchingFitmentRows : rows;

    const brands = Array.from(
      new Set(fitmentFilteredRows.map((r) => String(extractBrand(r) || "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
    brandEl.innerHTML = `<option value="">All brands</option>${brands
      .map((b) => `<option value="${esc(b)}">${esc(b)}</option>`)
      .join("")}`;
    if (engineCodeEl) {
      const engineCodes = Array.from(
        new Set(fitmentFilteredRows.map((r) => extractEngineCode(r)).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b));
      engineCodeEl.innerHTML = `<option value="">All engine codes</option>${engineCodes
        .map((code) => `<option value="${esc(code)}">${esc(code)}</option>`)
        .join("")}`;
      const preselectCode = selectedCarFitment?.engineCode || "";
      if (preselectCode && engineCodes.some((c) => norm(c) === norm(preselectCode))) {
        engineCodeEl.value = preselectCode;
      }
    }
    renderProducts();
  } catch (e) {
    resultsEl.innerHTML = `<p class='tx-note'>Could not load products from DB: ${esc(String(e.message || e))}</p>`;
  }

  searchEl.addEventListener("input", renderProducts);
  brandEl.addEventListener("change", renderProducts);
  engineCodeEl?.addEventListener("change", renderProducts);
  priceEl.addEventListener("change", renderProducts);
}
