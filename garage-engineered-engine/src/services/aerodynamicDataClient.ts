import type { AeroBodyComponentRow } from "../data/aeroBodyComponents";
import type { BaseAeroProfile, AeroComponentEffect } from "../lib/aerodynamicImpact";
import { buildAftermarketAeroEffect } from "../lib/aftermarketAeroEstimation";
import { recordFromCar, isSafeCatalogBigintKey } from "../lib/performanceSpecRow";
import type { SavedGarageCar } from "../lib/garageStorage";
import { getSiteSupabaseClient } from "../lib/supabaseSiteClient";

type AeroProfileRow = BaseAeroProfile & {
  id: string;
  generation_body_style_id: number | string | null;
  aero_package_id: string | null;
  name: string;
  is_default?: boolean | null;
  source_name?: string | null;
  notes?: string | null;
};

type AeroPackageRow = {
  id: string;
  generation_id: number | string | null;
  name: string;
  manufacturer?: string | null;
  package_type?: string | null;
};

type GenerationBodyStyleRow = {
  id: number | string;
  body_style_id: number | string;
};

type BodyStyleRow = {
  id: number | string;
  code: string | null;
  name: string | null;
};

type AeroComponentRow = {
  id: string;
  name: string;
  component_type: string;
  position: string;
  manufacturer?: string | null;
};

type AeroComponentEffectRow = AeroComponentEffect & {
  id: string;
  aero_component_id: string;
  generation_body_style_id: number | string | null;
};

type ComponentEffectMatch = AeroComponentEffect & {
  id?: string;
  generation_body_style_id?: number | string | null;
  aeroComponentName?: string;
  aeroComponentType?: string;
};

function isComponentEffect(effect: AeroComponentEffect | null): effect is ComponentEffectMatch {
  return Boolean(effect);
}

export type VehicleAerodynamicData = {
  baseAeroProfile: AeroProfileRow | null;
  componentEffects: ComponentEffectMatch[];
  bodyStyleLabel: string | null;
  bodyStyleCode: string | null;
  generationBodyStyleId: number | string | null;
  packageLabel: string | null;
  packageProfileMatched: boolean;
  error: string | null;
};

const BODY_STYLE_CODE_ALIASES: Record<string, string[]> = {
  cabrio: ["convertible", "cabriolet", "cabrio"],
  cabriolet: ["convertible", "cabriolet", "cabrio"],
  break: ["touring", "wagon", "estate", "break"],
  wagon: ["touring", "wagon", "estate", "break"],
  sedan: ["sedan", "saloon", "berlina"],
  berlina: ["sedan", "saloon", "berlina"],
  coupe: ["coupe"],
  compact: ["compact", "hatchback-3dr", "hatchback"],
  sav: ["sav", "suv"],
  suv: ["suv", "sav"],
  roadster: ["roadster", "convertible", "cabriolet"],
};

const COMPONENT_MATCHERS: Record<string, { types: string[]; names: string[] }> = {
  "front-splitter": {
    types: ["front_splitter"],
    names: ["front splitter"],
  },
  "rear-diffuser": {
    types: ["diffuser"],
    names: ["rear diffuser"],
  },
  spoiler: {
    types: ["rear_wing", "rear_spoiler"],
    names: ["rear wing", "rear lip spoiler", "spoiler"],
  },
  "side-skirts": {
    types: ["side_skirt"],
    names: ["side skirts", "side skirt"],
  },
  undertray: {
    types: ["flat_floor", "underbody_panel"],
    names: ["flat floor", "undertray", "underbody panel"],
  },
};

function idEq(raw: string): number | string {
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : raw;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalized(value: unknown): string {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[_/]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function carKey(car: SavedGarageCar | null, ...keys: string[]): string {
  const o = recordFromCar(car);
  for (const key of keys) {
    const value = text(o[key]);
    if (value) return value;
  }
  return "";
}

function vehicleHaystack(car: SavedGarageCar | null): string {
  const o = recordFromCar(car);
  return normalized(
    [
      o.brand,
      o.model,
      o.engine,
      o.bodyType,
      o.catalogVariantName,
      o.catalogGenerationCode,
      o.trim,
      o.edition,
      o.package,
      o.aeroPackage,
      o.aeroPackageName,
      o.bodyKit,
      o.body_kit,
    ].join(" "),
  );
}

function inferBodyTypeCode(car: SavedGarageCar | null): string {
  const explicit = normalized(carKey(car, "bodyType", "body_type", "garage_body_type", "body"));
  if (explicit) return explicit;
  const hay = vehicleHaystack(car);
  if (/\bcompact\b/.test(hay)) return "compact";
  if (/\b(cabrio|cabriolet|convertible|decapotabil)\b/.test(hay)) return "cabrio";
  if (/\b(touring|break|wagon|estate)\b/.test(hay)) return "break";
  if (/\b(roadster|z4)\b/.test(hay)) return "roadster";
  if (/\b(sav|suv|x5|x3|x1)\b/.test(hay)) return "sav";
  if (/\bcoupe\b/.test(hay)) return "coupe";
  return "sedan";
}

function bodyStyleCandidates(car: SavedGarageCar | null): string[] {
  const code = inferBodyTypeCode(car);
  const aliases = BODY_STYLE_CODE_ALIASES[code] ?? [code];
  return [...new Set([code, ...aliases].map(normalized).filter(Boolean))];
}

function packageNameCandidates(car: SavedGarageCar | null): string[] {
  const o = recordFromCar(car);
  const direct = [
    o.aeroPackageName,
    o.aero_package_name,
    o.aeroPackage,
    o.aero_package,
    o.bodyKit,
    o.body_kit,
    o.package,
    o.trim,
    o.edition,
  ]
    .map(normalized)
    .filter(Boolean);
  const hay = vehicleHaystack(car);
  const inferred: string[] = [];
  if (/\bcsl\b/.test(hay)) inferred.push("m3 csl");
  if (/\bm3\b/.test(hay)) inferred.push("m3");
  if (/\bm\s*tech\s*ii\b|\bm\s*technic\s*ii\b|\bm\s*paket\s*ii\b|\bm\s*pack\s*ii\b/.test(hay)) {
    inferred.push("m tech ii", "m-tech ii");
  }
  if (/\bm\s*tech\b|\bm\s*technic\b|\bm\s*paket\b|\bm\s*pack\b|\bm\s*sport\b/.test(hay)) {
    inferred.push("m tech i", "m-tech i");
  }
  return [...new Set([...direct, ...inferred])];
}

function packageIdCandidate(car: SavedGarageCar | null): string {
  return carKey(car, "aeroPackageId", "aero_package_id");
}

function numericCarValue(car: SavedGarageCar | null, ...keys: string[]): number | null {
  const o = recordFromCar(car);
  for (const key of keys) {
    const value = o[key];
    if (value == null || value === "") continue;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function round(value: number, digits = 3): number {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

function fallbackBodyStyleLabel(code: string): string {
  switch (code) {
    case "sav":
      return "SAV / SUV";
    case "suv":
      return "SUV";
    case "cabrio":
    case "cabriolet":
      return "Convertible";
    case "break":
      return "Touring / Wagon";
    default:
      return code ? code.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Estimated body style";
  }
}

function fallbackAeroNumbers(car: SavedGarageCar | null): { cd: number; area: number; note: string } {
  const hay = vehicleHaystack(car);
  const bodyCode = inferBodyTypeCode(car);
  const knownArea = numericCarValue(car, "frontalAreaM2", "frontal_area_m2", "catalogFrontalAreaM2");
  const knownCd = numericCarValue(car, "dragCoefficientCd", "drag_coefficient_cd", "catalogCd");

  if (knownCd != null && knownArea != null) {
    return { cd: knownCd, area: knownArea, note: "Garage vehicle supplied Cd/frontal area." };
  }

  if (/\bx5\b/.test(hay) && /\be53\b/.test(hay)) {
    return { cd: knownCd ?? 0.35, area: knownArea ?? 2.7, note: "Local fallback for BMW X5 E53 body profile." };
  }
  if (/\be46\b|\b3 series\b/.test(hay)) {
    if (bodyCode === "cabrio" || bodyCode === "cabriolet") {
      return { cd: knownCd ?? 0.35, area: knownArea ?? 1.98, note: "Local fallback for BMW E46 convertible profile." };
    }
    if (bodyCode === "coupe") {
      return { cd: knownCd ?? 0.3, area: knownArea ?? 1.98, note: "Local fallback for BMW E46 coupe profile." };
    }
    if (bodyCode === "break" || bodyCode === "wagon") {
      return { cd: knownCd ?? 0.32, area: knownArea ?? 2.06, note: "Local fallback for BMW E46 touring profile." };
    }
    if (bodyCode === "compact") {
      return { cd: knownCd ?? 0.3, area: knownArea ?? 2.07, note: "Local fallback for BMW E46 compact profile." };
    }
    return { cd: knownCd ?? 0.29, area: knownArea ?? 2.06, note: "Local fallback for BMW E46 sedan profile." };
  }

  const genericByBody: Record<string, { cd: number; area: number }> = {
    sedan: { cd: 0.35, area: 2.1 },
    coupe: { cd: 0.34, area: 2 },
    cabrio: { cd: 0.38, area: 2 },
    cabriolet: { cd: 0.38, area: 2 },
    convertible: { cd: 0.38, area: 2 },
    break: { cd: 0.35, area: 2.16 },
    wagon: { cd: 0.35, area: 2.16 },
    touring: { cd: 0.35, area: 2.16 },
    compact: { cd: 0.32, area: 2 },
    roadster: { cd: 0.39, area: 1.9 },
    sav: { cd: 0.35, area: 2.65 },
    suv: { cd: 0.35, area: 2.65 },
    sac: { cd: 0.34, area: 2.82 },
  };
  const generic = genericByBody[bodyCode] ?? genericByBody.sedan!;
  return {
    cd: knownCd ?? generic.cd,
    area: knownArea ?? generic.area,
    note: `Generic ${bodyCode || "vehicle"} aerodynamic fallback.`,
  };
}

function fallbackReasonLabel(reason: string | null): string | null {
  const normalizedReason = normalized(reason);
  if (!normalizedReason) return null;
  if (normalizedReason.includes("could not find the table")) return "aero DB table unavailable";
  if (normalizedReason.includes("no body styles")) return "generation body-style mapping missing";
  if (normalizedReason.includes("no aero profile")) return "aero profile missing for body style";
  if (normalizedReason.includes("no catalog generation")) return "catalog generation missing";
  return reason;
}

function buildFallbackAeroProfile(car: SavedGarageCar | null, reason: string | null): AeroProfileRow {
  const { cd, area, note } = fallbackAeroNumbers(car);
  const cleanReason = fallbackReasonLabel(reason);
  const label = [carKey(car, "brand"), carKey(car, "model"), carKey(car, "catalogGenerationCode")].filter(Boolean).join(" ");
  return {
    id: "local-fallback-aero-profile",
    generation_body_style_id: null,
    aero_package_id: null,
    name: `${label || "Vehicle"} estimated aero fallback`,
    drag_coefficient_cd: cd,
    frontal_area_m2: area,
    drag_area_cda_m2: round(cd * area, 3),
    lift_coefficient_cl: null,
    front_lift_coefficient: null,
    rear_lift_coefficient: null,
    front_aero_balance_percent: null,
    rear_aero_balance_percent: null,
    reference_speed_kmh: 160,
    is_estimated: true,
    confidence_level: "low",
    data_source_type: "estimated",
    calculation_method: `Local fallback: CdA = Cd * frontal_area_m2${cleanReason ? `; ${cleanReason}` : ""}`,
    source_name: "Garage Solutions fallback aero model",
    is_default: true,
    notes: `${note}${cleanReason ? ` ${cleanReason}` : ""}`,
  };
}

function packageMatchScore(pkg: AeroPackageRow, candidate: string): number {
  const name = normalized(pkg.name);
  const manufacturer = normalized(pkg.manufacturer);
  const candidateNorm = normalized(candidate);
  if (!candidateNorm || !name) return 0;
  if (name === candidateNorm) return 100 + name.length;
  if (`${manufacturer} ${name}`.trim() === candidateNorm) return 90 + name.length;
  if (candidateNorm.includes(name)) return 50 + name.length;
  return 0;
}

function isActiveAeroComponent(row: AeroBodyComponentRow): boolean {
  return row.installStatus === "installed" || row.upgradePlan === "planned";
}

function componentMatcherFor(row: AeroBodyComponentRow) {
  return COMPONENT_MATCHERS[row.id] ?? null;
}

function brandLabelById(id: string | null | undefined): string {
  if (!id) return "";
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bApr\b/, "APR")
    .replace(/\bAc\b/, "AC")
    .replace(/\bM\b/, "M");
}

function desiredBrandFor(row: AeroBodyComponentRow): string {
  const sourceBrand = row.sourceKind === "brand" ? row.sourceBrandId : null;
  const planBrand = row.upgradePlan === "planned" && row.planVendorKind === "brand" ? row.planVendorBrandId : null;
  return normalized(brandLabelById(sourceBrand ?? planBrand));
}

function componentMatches(row: AeroComponentRow, matcher: { types: string[]; names: string[] }): boolean {
  const type = normalized(row.component_type);
  const name = normalized(row.name);
  return matcher.types.map(normalized).includes(type) || matcher.names.map(normalized).some((n) => name.includes(n));
}

function chooseAeroComponentForPlannerRow(
  plannerRow: AeroBodyComponentRow,
  dbComponents: AeroComponentRow[],
  matcher: { types: string[]; names: string[] },
): AeroComponentRow | null {
  const candidates = dbComponents.filter((row) => componentMatches(row, matcher));
  if (!candidates.length) return null;

  const desiredProduct = normalized(plannerRow.aeroProductName);
  if (desiredProduct) {
    const productMatch = candidates.find((row) => normalized(row.name).includes(desiredProduct));
    if (productMatch) return productMatch;
  }

  const desiredType = normalized(plannerRow.aeroComponentType);
  if (desiredType) {
    const typeMatch = candidates.find((row) => normalized(row.component_type) === desiredType);
    if (typeMatch) return typeMatch;
  }

  const desiredBrand = desiredBrandFor(plannerRow);
  if (desiredBrand) {
    const brandMatch = candidates.find((row) => {
      const manufacturer = normalized(row.manufacturer);
      return manufacturer && (manufacturer.includes(desiredBrand) || desiredBrand.includes(manufacturer));
    });
    if (brandMatch) return brandMatch;
  }

  return (
    candidates.find((row) => normalized(row.manufacturer)) ??
    candidates[0] ??
    null
  );
}

function chooseBestEffect(
  effects: AeroComponentEffectRow[],
  generationBodyStyleId: number | string,
  speedKmh: number,
): AeroComponentEffectRow | null {
  const bodySpecific = effects.filter((effect) => String(effect.generation_body_style_id ?? "") === String(generationBodyStyleId));
  const generic = effects.filter((effect) => effect.generation_body_style_id == null);
  const candidates = bodySpecific.length ? bodySpecific : generic;
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => {
    const aSpeed = Number(a.speed_kmh ?? 160);
    const bSpeed = Number(b.speed_kmh ?? 160);
    return Math.abs(aSpeed - speedKmh) - Math.abs(bSpeed - speedKmh);
  })[0] ?? null;
}

async function resolveGenerationBodyStyle(
  generationId: string,
  car: SavedGarageCar | null,
): Promise<{
  row: GenerationBodyStyleRow | null;
  style: BodyStyleRow | null;
  error: string | null;
}> {
  const sb = getSiteSupabaseClient();
  const genEq = idEq(generationId);
  let { data: gbsRows, error } = await sb
    .from("generation_body_styles")
    .select("id, body_style_id")
    .eq("generation_id", genEq)
    .limit(100);

  if ((!gbsRows || !gbsRows.length) && typeof genEq === "number") {
    const alt = await sb
      .from("generation_body_styles")
      .select("id, body_style_id")
      .eq("generation_id", generationId)
      .limit(100);
    gbsRows = alt.data;
    error = alt.error;
  }

  const generationBodyStyles = (gbsRows ?? []) as GenerationBodyStyleRow[];
  if (error && !generationBodyStyles.length) {
    return { row: null, style: null, error: error.message };
  }
  if (!generationBodyStyles.length) {
    return { row: null, style: null, error: "No body styles for selected generation" };
  }

  const bodyStyleIds = [...new Set(generationBodyStyles.map((row) => row.body_style_id))];
  const { data: bodyRows, error: bodyError } = await sb
    .from("body_styles")
    .select("id, code, name")
    .in("id", bodyStyleIds)
    .limit(100);
  const styles = (bodyRows ?? []) as BodyStyleRow[];
  if (bodyError && !styles.length) {
    return { row: null, style: null, error: bodyError.message };
  }

  const byId = new Map(styles.map((style) => [String(style.id), style]));
  const candidates = bodyStyleCandidates(car);
  const matchedRow =
    generationBodyStyles.find((row) => {
      const style = byId.get(String(row.body_style_id));
      const code = normalized(style?.code);
      const name = normalized(style?.name);
      return candidates.some((candidate) => candidate === code || candidate === name || name.includes(candidate));
    }) ?? (generationBodyStyles.length === 1 ? generationBodyStyles[0]! : null);

  return {
    row: matchedRow,
    style: matchedRow ? byId.get(String(matchedRow.body_style_id)) ?? null : null,
    error: matchedRow ? null : "No aero body style match for selected vehicle",
  };
}

async function fetchBaseProfile(
  generationId: string,
  generationBodyStyleId: number | string,
  car: SavedGarageCar | null,
): Promise<{
  profile: AeroProfileRow | null;
  packageLabel: string | null;
  packageProfileMatched: boolean;
  error: string | null;
}> {
  const sb = getSiteSupabaseClient();
  const genEq = idEq(generationId);
  const { data: packageRows, error: packageError } = await sb
    .from("aero_package")
    .select("id, generation_id, name, manufacturer, package_type")
    .eq("generation_id", genEq)
    .limit(100);
  const packages = (packageRows ?? []) as AeroPackageRow[];
  if (packageError && !packages.length) {
    return { profile: null, packageLabel: null, packageProfileMatched: false, error: packageError.message };
  }

  const directPackageId = packageIdCandidate(car);
  const candidates = packageNameCandidates(car);
  const scoredPackage = candidates
    .flatMap((candidate) =>
      packages.map((pkg) => ({
        pkg,
        score: packageMatchScore(pkg, candidate),
      })),
    )
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.pkg ?? null;
  const matchedPackage =
    (directPackageId ? packages.find((pkg) => pkg.id === directPackageId) : null) ??
    scoredPackage ??
    null;

  const { data: profileRows, error } = await sb
    .from("aero_profile")
    .select(
      "id, generation_body_style_id, aero_package_id, name, drag_coefficient_cd, frontal_area_m2, drag_area_cda_m2, lift_coefficient_cl, front_lift_coefficient, rear_lift_coefficient, front_aero_balance_percent, rear_aero_balance_percent, reference_speed_kmh, is_estimated, confidence_level, data_source_type, calculation_method, source_name, is_default",
    )
    .eq("generation_body_style_id", generationBodyStyleId)
    .limit(100);
  const profiles = (profileRows ?? []) as AeroProfileRow[];
  if (error && !profiles.length) {
    return { profile: null, packageLabel: null, packageProfileMatched: false, error: error.message };
  }

  const packageProfile = matchedPackage
    ? profiles.find((profile) => profile.aero_package_id === matchedPackage.id) ?? null
    : null;
  const defaultProfile =
    profiles.find((profile) => profile.is_default) ??
    profiles.find((profile) => {
      const pkg = packages.find((row) => row.id === profile.aero_package_id);
      return normalized(pkg?.name) === "stock";
    }) ??
    profiles.find((profile) => profile.aero_package_id == null) ??
    profiles[0] ??
    null;

  return {
    profile: packageProfile ?? defaultProfile,
    packageLabel: matchedPackage?.name ?? (defaultProfile ? "Stock" : null),
    packageProfileMatched: Boolean(packageProfile),
    error: defaultProfile || packageProfile ? null : "No aero profile for selected body style",
  };
}

async function fetchComponentEffects(
  components: AeroBodyComponentRow[],
  generationBodyStyleId: number | string,
  speedKmh: number,
): Promise<ComponentEffectMatch[]> {
  const activeRows = components.filter(isActiveAeroComponent).filter((row) => componentMatcherFor(row));
  if (!activeRows.length) return [];

  const localFallbackEffects = () =>
    activeRows.map((plannerRow) => buildAftermarketAeroEffect(plannerRow)).filter(isComponentEffect);

  const sb = getSiteSupabaseClient();
  const { data: componentRows, error: componentError } = await sb
    .from("aero_component")
    .select("id, name, component_type, position, manufacturer")
    .limit(1000);
  if (componentError || !componentRows?.length) return localFallbackEffects();

  const dbComponents = componentRows as AeroComponentRow[];
  const matches = activeRows
    .map((plannerRow) => {
      const matcher = componentMatcherFor(plannerRow);
      if (!matcher) return null;
      const aeroComponent = chooseAeroComponentForPlannerRow(plannerRow, dbComponents, matcher);
      return aeroComponent ? { plannerRow, aeroComponent } : null;
    })
    .filter((row): row is { plannerRow: AeroBodyComponentRow; aeroComponent: AeroComponentRow } => Boolean(row));

  if (!matches.length) return localFallbackEffects();

  const componentIds = [...new Set(matches.map((match) => match.aeroComponent.id))];
  const { data: effectRows, error: effectError } = await sb
    .from("aero_component_effect")
    .select(
      "id, aero_component_id, generation_body_style_id, speed_kmh, delta_cd, delta_cl, delta_front_downforce_kg, delta_rear_downforce_kg, delta_total_downforce_kg, delta_drag_kg, data_source_type, confidence_level",
    )
    .in("aero_component_id", componentIds)
    .limit(1000);
  if (effectError || !effectRows?.length) return localFallbackEffects();

  const effects = effectRows as AeroComponentEffectRow[];
  const out: ComponentEffectMatch[] = [];
  for (const { plannerRow, aeroComponent } of matches) {
    const best = chooseBestEffect(
      effects.filter((effect) => effect.aero_component_id === aeroComponent.id),
      generationBodyStyleId,
      speedKmh,
    );
    if (best) {
      out.push({
        ...best,
        componentPlannerId: plannerRow.id,
        componentLabel: plannerRow.label,
        aeroComponentName: aeroComponent.name,
        aeroComponentType: aeroComponent.component_type,
      });
    }
  }
  if (!out.length) return localFallbackEffects();
  const matchedPlannerIds = new Set(out.map((effect) => effect.componentPlannerId).filter(Boolean));
  return [
    ...out,
    ...activeRows
      .filter((plannerRow) => !matchedPlannerIds.has(plannerRow.id))
      .map((plannerRow) => buildAftermarketAeroEffect(plannerRow))
      .filter(isComponentEffect),
  ];
}

export async function fetchVehicleAerodynamicData({
  car,
  components,
  speedKmh,
}: {
  car: SavedGarageCar | null;
  components: AeroBodyComponentRow[];
  speedKmh: number;
}): Promise<VehicleAerodynamicData> {
  const generationId = carKey(car, "catalog_generation_id", "catalogGenerationId");
  if (!car) {
    return {
      baseAeroProfile: null,
      componentEffects: [],
      bodyStyleLabel: null,
      bodyStyleCode: null,
      generationBodyStyleId: null,
      packageLabel: null,
      packageProfileMatched: false,
      error: "No catalog generation selected",
    };
  }
  if (!generationId || !isSafeCatalogBigintKey(generationId)) {
    const fallbackProfile = buildFallbackAeroProfile(car, "No catalog generation selected");
    return {
      baseAeroProfile: fallbackProfile,
      componentEffects: await fetchComponentEffects(components, "local-fallback", speedKmh),
      bodyStyleLabel: fallbackBodyStyleLabel(inferBodyTypeCode(car)),
      bodyStyleCode: inferBodyTypeCode(car),
      generationBodyStyleId: null,
      packageLabel: "Estimated",
      packageProfileMatched: false,
      error: null,
    };
  }

  const resolvedBody = await resolveGenerationBodyStyle(generationId, car);
  if (!resolvedBody.row) {
    const fallbackProfile = buildFallbackAeroProfile(car, resolvedBody.error);
    return {
      baseAeroProfile: fallbackProfile,
      componentEffects: await fetchComponentEffects(components, "local-fallback", speedKmh),
      bodyStyleLabel: fallbackBodyStyleLabel(inferBodyTypeCode(car)),
      bodyStyleCode: inferBodyTypeCode(car),
      generationBodyStyleId: null,
      packageLabel: "Estimated",
      packageProfileMatched: false,
      error: null,
    };
  }

  const base = await fetchBaseProfile(generationId, resolvedBody.row.id, car);
  const componentEffects = await fetchComponentEffects(components, resolvedBody.row.id, speedKmh);
  const bodyStyleLabel = text(resolvedBody.style?.name) || text(resolvedBody.style?.code) || null;
  const bodyStyleCode = text(resolvedBody.style?.code) || null;

  return {
    baseAeroProfile: base.profile ?? buildFallbackAeroProfile(car, base.error),
    componentEffects,
    bodyStyleLabel,
    bodyStyleCode,
    generationBodyStyleId: resolvedBody.row.id,
    packageLabel: base.profile ? base.packageLabel : "Estimated",
    packageProfileMatched: base.packageProfileMatched,
    error: base.profile ? base.error : null,
  };
}
