const NULLISH = new Set(["null", "undefined", ""]);

export function hasText(value: unknown): value is string {
  if (value == null) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (NULLISH.has(s.toLowerCase())) return false;
  return true;
}

/** Afișare sigură: nu returnează literalul "null". */
export function displayText(value: unknown, emptyLabel = "Nespecificat"): string {
  if (hasText(value)) return String(value).trim();
  return emptyLabel;
}

/** Pentru rânduri de detaliu: ascunde câmpul dacă lipsește valoarea. */
export function displayOptional(value: unknown): string | null {
  if (hasText(value)) return String(value).trim();
  return null;
}

export function formatBooleanRo(value: boolean | null | undefined): string | null {
  if (value === true) return "Da";
  if (value === false) return "Nu";
  return null;
}

export function formatEur(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return `${n.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} € (TVA inclus)`;
}

export function formatKgRange(front: unknown, rear: unknown): string | null {
  const f = formatNumber(front);
  const r = formatNumber(rear);
  if (f == null && r == null) return null;
  if (f != null && r != null) return `Față ${f} kg · Spate ${r} kg`;
  if (f != null) return `Față ${f} kg`;
  if (r != null) return `Spate ${r} kg`;
  return null;
}

export function formatLoweringRange(min: unknown, max: unknown, label: string): string | null {
  const a = formatNumber(min);
  const b = formatNumber(max);
  if (a == null && b == null) return null;
  if (a != null && b != null) return `${label}: ${a}–${b} mm`;
  if (a != null) return `${label}: min. ${a} mm`;
  if (b != null) return `${label}: max. ${b} mm`;
  return null;
}

export function formatNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function formatRateRange(
  label: string,
  min: unknown,
  max: unknown,
): string | null {
  const a = formatNumber(min);
  const b = formatNumber(max);
  if (a == null && b == null) return null;
  if (a != null && b != null) return `${label}: ${a}–${b} N/mm`;
  if (a != null) return `${label}: min. ${a} N/mm`;
  if (b != null) return `${label}: max. ${b} N/mm`;
  return null;
}
