/**
 * Romanian counties + localities (by county) for delivery address UI.
 * Data: https://github.com/romania/localitati (json/orase-dupa-judet.min.json)
 */

const GEO_URL = new URL("../data/ro-orase-dupa-judet.min.json", import.meta.url);

/** JSON county key → label shown in datalist / saved value */
export const RO_COUNTY_DISPLAY = {
  Alba: "Alba",
  Arad: "Arad",
  Arges: "Argeș",
  Bacau: "Bacău",
  Bihor: "Bihor",
  "Bistrita-Nasaud": "Bistrița-Năsăud",
  Botosani: "Botoșani",
  Braila: "Brăila",
  Brasov: "Brașov",
  Bucuresti: "București",
  Buzau: "Buzău",
  Calarasi: "Călărași",
  "Caras-Severin": "Caraș-Severin",
  Cluj: "Cluj",
  Constanta: "Constanța",
  Covasna: "Covasna",
  Dambovita: "Dâmbovița",
  Dolj: "Dolj",
  Galati: "Galați",
  Giurgiu: "Giurgiu",
  Gorj: "Gorj",
  Harghita: "Harghita",
  Hunedoara: "Hunedoara",
  Ialomita: "Ialomița",
  Iasi: "Iași",
  Ilfov: "Ilfov",
  Maramures: "Maramureș",
  Mehedinti: "Mehedinți",
  Mures: "Mureș",
  Neamt: "Neamț",
  Olt: "Olt",
  Prahova: "Prahova",
  Salaj: "Sălaj",
  "Satu Mare": "Satu Mare",
  Sibiu: "Sibiu",
  Suceava: "Suceava",
  Teleorman: "Teleorman",
  Timis: "Timiș",
  Tulcea: "Tulcea",
  Valcea: "Vâlcea",
  Vaslui: "Vaslui",
  Vrancea: "Vrancea",
};

const DATALIST_ID = "ro-county-sector-datalist";

/** Sectoarele sunt în câmpul „Județ / sector”, nu în „Localitate”. */
const RE_BUCHAREST_SECTOR = /^sector(ul)?\s*([1-6])$/i;

let geoCache = null;
let geoPromise = null;

export function foldAscii(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export async function ensureRoGeoData() {
  if (geoCache) return geoCache;
  if (!geoPromise) {
    geoPromise = (async () => {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 15000);
      try {
        const r = await fetch(GEO_URL.href, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`Geografie RO: HTTP ${r.status}`);
        return await r.json();
      } finally {
        clearTimeout(tid);
      }
    })();
  }
  try {
    const data = await geoPromise;
    geoCache = data;
    return geoCache;
  } catch (e) {
    geoPromise = null;
    const msg = e?.name === "AbortError" ? "Fișierul cu localități nu s-a încărcat la timp (timeout)." : e?.message || String(e);
    throw new Error(msg);
  }
}

/**
 * Map user-facing county / sector string to JSON top-level key (e.g. "Argeș" → "Arges", "Sectorul 2" → "Bucuresti").
 */
export function resolveGeoCountyKey(raw, data) {
  const t = String(raw || "").trim();
  if (!t || !data) return "";
  if (RE_BUCHAREST_SECTOR.test(t)) return "Bucuresti";
  const foldT = foldAscii(t);
  for (const key of Object.keys(data)) {
    const label = RO_COUNTY_DISPLAY[key] || key;
    if (foldAscii(label) === foldT) return key;
    if (foldAscii(key) === foldT) return key;
  }
  if (/^bucuresti/.test(foldT)) return "Bucuresti";
  return "";
}

export function injectCountyDatalistOnce() {
  let dl = document.getElementById(DATALIST_ID);
  if (!dl) {
    dl = document.createElement("datalist");
    dl.id = DATALIST_ID;
    document.body.appendChild(dl);
  }
  dl.replaceChildren();
  const values = new Set();
  for (const key of Object.keys(RO_COUNTY_DISPLAY)) {
    if (key === "Bucuresti") continue;
    values.add(RO_COUNTY_DISPLAY[key]);
  }
  for (let n = 1; n <= 6; n += 1) {
    values.add(`Sectorul ${n}`);
  }
  /* „București” nu e județ în sensul formularului: localitatea e București, sectorul e separat. */
  const sorted = [...values].sort((a, b) => a.localeCompare(b, "ro"));
  for (const v of sorted) {
    const opt = document.createElement("option");
    opt.value = v;
    dl.appendChild(opt);
  }
}

function formatSectorCounty(m) {
  const n = m[2];
  return `Sectorul ${n}`;
}

/** Localități afișate la „Localitate” (fără sectoarele bucureștene — acelea sunt la „Județ / sector”). */
function cityNamesForKey(data, key) {
  if (!key || !data[key]) return [];
  let names = data[key].map((o) => String(o.nume || "").trim()).filter(Boolean);
  if (key === "Bucuresti") {
    names = names.filter((n) => !RE_BUCHAREST_SECTOR.test(n));
    names = names.filter((n) => !/^municipiul\s*bucuresti$/i.test(n));
    const rest = [...new Set(names)].sort((a, b) => a.localeCompare(b, "ro"));
    return ["București", ...rest];
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "ro"));
}

/**
 * Dacă utilizatorul a pus „București” la județ și „Sectorul N” la localitate, le corectează.
 */
export function normalizeBucharestCountyCity(countyInput, cityInput) {
  if (!countyInput || !cityInput) return;
  const cRaw = String(countyInput.value || "").trim();
  const tRaw = String(cityInput.value || "").trim();
  const countyFold = foldAscii(cRaw);
  const countyLooksBucharest =
    /^bucuresti$/i.test(countyFold) || foldAscii(RO_COUNTY_DISPLAY.Bucuresti) === countyFold;
  const citySector = tRaw.match(RE_BUCHAREST_SECTOR);
  if (countyLooksBucharest && citySector) {
    countyInput.value = formatSectorCounty(citySector);
    cityInput.value = "București";
    return;
  }
  /* Județ = sector, localitate goală sau greșită ca sector → localitate București */
  const countySector = cRaw.match(RE_BUCHAREST_SECTOR);
  if (countySector) {
    countyInput.value = formatSectorCounty(countySector);
    if (!tRaw || RE_BUCHAREST_SECTOR.test(tRaw)) {
      cityInput.value = "București";
    }
  } else if (countyLooksBucharest && !RE_BUCHAREST_SECTOR.test(cRaw) && !tRaw) {
    cityInput.value = "București";
  }
}

function renderCitySuggestions(ul, names, query) {
  ul.innerHTML = "";
  const q = foldAscii(query);
  let list = names;
  if (q) {
    list = names.filter((n) => foldAscii(n).includes(q));
  }
  const cap = 80;
  for (const name of list.slice(0, cap)) {
    const li = document.createElement("li");
    li.className = "cont-addr-city-sug__item";
    li.setAttribute("role", "option");
    li.textContent = name;
    ul.appendChild(li);
  }
  return list.length;
}

function hideCitySug(ul, input) {
  ul.hidden = true;
  ul.innerHTML = "";
  if (input) input.setAttribute("aria-expanded", "false");
}

export function wireAddressCardGeo(card) {
  if (!card || card.dataset.roGeoWired === "1") return;
  card.dataset.roGeoWired = "1";

  const countyInput = card.querySelector(".cont-addr__county");
  const cityInput = card.querySelector(".cont-addr__city");
  const sug = card.querySelector(".cont-addr-city-sug");
  if (!countyInput || !cityInput || !sug) return;

  const refreshPool = async () => {
    try {
      const data = await ensureRoGeoData();
      const key = resolveGeoCountyKey(countyInput.value, data);
      card._roCityNames = key ? cityNamesForKey(data, key) : [];
    } catch {
      card._roCityNames = [];
    }
  };

  const openSugIfNeeded = () => {
    const names = card._roCityNames || [];
    if (!names.length) {
      hideCitySug(sug, cityInput);
      return;
    }
    const n = renderCitySuggestions(sug, names, cityInput.value);
    if (n === 0) {
      hideCitySug(sug, cityInput);
      return;
    }
    sug.hidden = false;
    cityInput.setAttribute("aria-expanded", "true");
  };

  const onCountyChange = () => {
    normalizeBucharestCountyCity(countyInput, cityInput);
    void refreshPool().then(() => {
      openSugIfNeeded();
    });
  };

  countyInput.addEventListener("change", onCountyChange);
  countyInput.addEventListener("blur", () => {
    normalizeBucharestCountyCity(countyInput, cityInput);
    void refreshPool();
  });

  cityInput.addEventListener("focus", () => {
    void refreshPool().then(() => openSugIfNeeded());
  });

  cityInput.addEventListener("input", () => {
    const names = card._roCityNames || [];
    if (!names.length) return;
    renderCitySuggestions(sug, names, cityInput.value);
    sug.hidden = sug.childElementCount === 0;
    cityInput.setAttribute("aria-expanded", sug.hidden ? "false" : "true");
  });

  sug.addEventListener("mousedown", (ev) => {
    const li = ev.target.closest(".cont-addr-city-sug__item");
    if (!li || !sug.contains(li)) return;
    ev.preventDefault();
    cityInput.value = li.textContent || "";
    hideCitySug(sug, cityInput);
    cityInput.dispatchEvent(new Event("change", { bubbles: true }));
  });

  cityInput.addEventListener("blur", () => {
    normalizeBucharestCountyCity(countyInput, cityInput);
    window.setTimeout(() => {
      if (!card.contains(document.activeElement)) hideCitySug(sug, cityInput);
    }, 180);
  });

  normalizeBucharestCountyCity(countyInput, cityInput);
  void refreshPool().then(() => {
    if (document.activeElement === cityInput) openSugIfNeeded();
  });
}
