/** Mapare marcă (etichetă salvată) → logo pentru UI garaj / fallback fără Supabase. */
export const LOGO_FALLBACK_BY_BRAND = {
  audi: "assets/Audi-logo-icon-on-transparent-background-PNG.avif",
  bmw: "https://cdn.simpleicons.org/bmw",
  "mercedes-benz": "https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg",
  volkswagen: "https://cdn.simpleicons.org/volkswagen",
  skoda: "https://cdn.simpleicons.org/skoda",
  renault: "https://cdn.simpleicons.org/renault",
  dacia: "https://cdn.simpleicons.org/dacia",
  ford: "https://cdn.simpleicons.org/ford",
  opel: "https://cdn.simpleicons.org/opel",
  toyota: "https://cdn.simpleicons.org/toyota",
};

export function brandKeyFromLabel(label) {
  if (!label || typeof label !== "string") return "";
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

export function getBrandLogoUrl(brandLabel) {
  const key = brandKeyFromLabel(brandLabel);
  return LOGO_FALLBACK_BY_BRAND[key] || "";
}
