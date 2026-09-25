/**
 * Numéro de ticket saisi à la main (continuité d'une numérotation existante,
 * ex. "S-1251" après FasoStock) : propose le suivant en incrémentant le
 * dernier groupe de chiffres, zéros de tête conservés — "S-1251" → "S-1252",
 * "S-0099" → "S-0100". `null` si le numéro ne contient aucun chiffre.
 */
export function nextManualSaleNumber(previous: string): string | null {
  const m = previous.trim().match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return null;
  const [, prefix, digits, suffix] = m;
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return `${prefix}${next}${suffix}`;
}

/** Nettoyage d'un numéro saisi : espaces retirés, longueur bornée ; `undefined` si vide. */
export function cleanManualSaleNumber(value: string | null | undefined): string | undefined {
  const cleaned = (value ?? "").trim().slice(0, 40);
  return cleaned || undefined;
}
