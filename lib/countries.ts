import { WORLD_COUNTRIES } from "@/lib/world-countries";

// Tous les pays du monde (lib/world-countries.ts, source GeoNames), le Burkina
// Faso restant le pays par défaut. Les noms viennent d'Intl.DisplayNames : ils
// sont justes et accentués dans les deux langues, côté serveur comme navigateur.
export type CountryCode = string;

export type Country = {
  code: CountryCode;
  name: { fr: string; en: string };
  dialCode: string; // indicatif téléphonique international
  phoneExample: string; // format local, sans indicatif
  capital: string; // exemple de ville, utilisé comme placeholder
  currency: string; // monnaie ISO (XOF, EUR…)
};

// Formats de numéro connus (pays déjà servis par ZINDO) ; ailleurs, pas d'exemple.
const PHONE_EXAMPLES: Record<string, string> = {
  BF: "70 00 00 00",
  CI: "07 00 00 00 00",
  ML: "70 00 00 00",
  NE: "90 00 00 00",
  SN: "70 000 00 00",
  TG: "90 00 00 00",
  BJ: "90 00 00 00",
  GW: "955 000 000",
};

// Ville donnée en exemple quand ce n'est pas la capitale administrative.
const EXAMPLE_CITIES: Record<string, string> = { CI: "Abidjan", BJ: "Cotonou" };

const FR = new Intl.DisplayNames(["fr"], { type: "region" });
const EN = new Intl.DisplayNames(["en"], { type: "region" });

// Codes obsolètes de GeoNames (Antilles néerlandaises, Serbie-et-Monténégro) : doublons.
const OBSOLETE = new Set(["AN", "CS"]);

/** Tous les pays, triés par nom français. */
export const COUNTRIES: Country[] = WORLD_COUNTRIES.filter(([code]) => !OBSOLETE.has(code)).map(([code, dialCode, currency, capital]) => ({
  code,
  name: { fr: FR.of(code) ?? code, en: EN.of(code) ?? code },
  dialCode,
  phoneExample: PHONE_EXAMPLES[code] ?? "",
  capital: EXAMPLE_CITIES[code] ?? capital,
  currency,
})).sort((a, b) => a.name.fr.localeCompare(b.name.fr, "fr"));

export const DEFAULT_COUNTRY_CODE: CountryCode = "BF";

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string | null | undefined): Country {
  return (code && BY_CODE.get(code)) || BY_CODE.get(DEFAULT_COUNTRY_CODE)!;
}

export function isCountryCode(value: string | null | undefined): value is CountryCode {
  return !!value && BY_CODE.has(value);
}

/** Recherche d'un pays sans tenir compte des accents ni des majuscules (« cote » → Côte d'Ivoire). */
export function normalizeSearch(value: string): string {
  return value
    .replace(/[’‘ʼ]/g, "'")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Nom du pays (fr) attendu par la colonne businesses.country (texte libre,
// pas un code ISO) — voir supabase/schema.sql.
export function countryNameFr(code: string | null | undefined): string {
  return getCountry(code).name.fr;
}

/** Code ISO à partir de businesses.country (nom français, texte libre). */
export function countryCodeFromName(countryName: string | null | undefined): CountryCode | null {
  const wanted = normalizeSearch(countryName ?? "");
  return COUNTRIES.find((c) => normalizeSearch(c.name.fr) === wanted)?.code ?? null;
}

// Retrouve l'indicatif téléphonique à partir de businesses.country (texte
// libre en français, ex. "Côte d'Ivoire") — utilisé pour deviner l'indicatif
// par défaut d'un numéro client saisi sans indicatif (WhatsApp, SMS...).
export function dialCodeForCountryName(countryName: string | null | undefined): string {
  return getCountry(countryCodeFromName(countryName)).dialCode;
}

// Normalise un numéro de téléphone pour un lien wa.me : uniquement des
// chiffres, préfixé par l'indicatif du pays du commerce si absent. Un simple
// indicatif "226" en dur casserait les liens pour un client dont le numéro
// est saisi sans indicatif dans un commerce hors Burkina Faso.
export function toWhatsAppDigits(phone: string, businessCountryName: string | null | undefined): string {
  const digits = phone.replace(/\D/g, "");
  const dial = dialCodeForCountryName(businessCountryName).replace("+", "");
  return digits.startsWith(dial) ? digits : `${dial}${digits}`;
}
