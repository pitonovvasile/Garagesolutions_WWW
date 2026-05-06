/**
 * Modele adaugate local pentru garaj / demo (langa catalogul Supabase).
 * Valoarea option.value este sintetica; motorizarile vin din engine-fallback-by-model.mjs (slug).
 */

export const GARAGE_CATALOG_EXTRAS_BMW = [
  {
    id: "local-bmw-e46-fl-sedan",
    label: "Seria 3 E46 | 09/2001-02/2005 | FL | Sedan",
    slug: "seria-3",
  },
  {
    id: "local-bmw-e46-compact",
    label: "Seria 3 Compact E46 | Compact",
    slug: "bmw-e46-compact",
  },
  {
    id: "local-bmw-e46-cabrio-nfl-csl",
    label: "Seria 3 NFL CSL Cabrio E46 | Cabrio",
    slug: "seria-3-e46-cabrio-nfl-csl",
  },
  {
    id: "local-bmw-m2-f87",
    label: "M2 F87 | 2016-2021 | Coupe",
    slug: "bmw-m2-f87",
  },
  {
    id: "local-bmw-m2-g87",
    label: "M2 G87 | 2022-prezent | Coupe",
    slug: "bmw-m2-g87",
  },
  {
    id: "local-bmw-z4-e89",
    label: "Z4 E89 | 2009-2016 | Roadster",
    slug: "bmw-z4-e89",
  },
];

/**
 * @param {HTMLSelectElement} modelSelectEl
 */
export function appendBmwGarageCatalogExtras(modelSelectEl) {
  for (const row of GARAGE_CATALOG_EXTRAS_BMW) {
    if ([...modelSelectEl.options].some((o) => o.value === row.id)) continue;
    if ([...modelSelectEl.options].some((o) => (o.textContent || "").trim() === row.label.trim())) continue;
    const option = document.createElement("option");
    option.value = row.id;
    option.textContent = row.label;
    option.dataset.modelSlug = row.slug;
    option.dataset.localGarageExtra = "1";
    modelSelectEl.appendChild(option);
  }
}

/**
 * @param {HTMLOptionElement | undefined} brandOption
 */
export function brandOptionIsBmw(brandOption) {
  if (!brandOption) return false;
  const t = (brandOption.textContent || "").trim().toUpperCase();
  return t === "BMW" || brandOption.value?.toLowerCase() === "bmw";
}
