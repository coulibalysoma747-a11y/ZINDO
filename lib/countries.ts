// Pays d'Afrique de l'Ouest pris en charge par ZINDO. Tous partagent le franc
// CFA (XOF, zone UEMOA) — pas de conversion de devise à gérer entre eux.
export type CountryCode = "BF" | "CI" | "ML" | "NE" | "SN" | "TG" | "BJ" | "GW";

export type Country = {
  code: CountryCode;
  name: { fr: string; en: string };
  dialCode: string; // indicatif téléphonique international
  phoneExample: string; // format local, sans indicatif
  capital: string; // exemple de ville, utilisé comme placeholder
};

export const COUNTRIES: Country[] = [
  { code: "BF", name: { fr: "Burkina Faso", en: "Burkina Faso" }, dialCode: "+226", phoneExample: "70 00 00 00", capital: "Ouagadougou" },
  { code: "CI", name: { fr: "Côte d'Ivoire", en: "Côte d'Ivoire" }, dialCode: "+225", phoneExample: "07 00 00 00 00", capital: "Abidjan" },
  { code: "ML", name: { fr: "Mali", en: "Mali" }, dialCode: "+223", phoneExample: "70 00 00 00", capital: "Bamako" },
  { code: "NE", name: { fr: "Niger", en: "Niger" }, dialCode: "+227", phoneExample: "90 00 00 00", capital: "Niamey" },
  { code: "SN", name: { fr: "Sénégal", en: "Senegal" }, dialCode: "+221", phoneExample: "70 000 00 00", capital: "Dakar" },
  { code: "TG", name: { fr: "Togo", en: "Togo" }, dialCode: "+228", phoneExample: "90 00 00 00", capital: "Lomé" },
  { code: "BJ", name: { fr: "Bénin", en: "Benin" }, dialCode: "+229", phoneExample: "90 00 00 00", capital: "Cotonou" },
  { code: "GW", name: { fr: "Guinée-Bissau", en: "Guinea-Bissau" }, dialCode: "+245", phoneExample: "955 000 000", capital: "Bissau" },
];

export const DEFAULT_COUNTRY_CODE: CountryCode = "BF";

export function getCountry(code: string | null | undefined): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE)!;
}

export function isCountryCode(value: string | null | undefined): value is CountryCode {
  return COUNTRIES.some((c) => c.code === value);
}

// Nom du pays (fr) attendu par la colonne businesses.country (texte libre,
// pas un code ISO) — voir supabase/schema.sql.
export function countryNameFr(code: string | null | undefined): string {
  return getCountry(code).name.fr;
}

// Retrouve l'indicatif téléphonique à partir de businesses.country (texte
// libre en français, ex. "Côte d'Ivoire") — utilisé pour deviner l'indicatif
// par défaut d'un numéro client saisi sans indicatif (WhatsApp, SMS...).
export function dialCodeForCountryName(countryName: string | null | undefined): string {
  const match = COUNTRIES.find((c) => c.name.fr.toLowerCase() === (countryName ?? "").trim().toLowerCase());
  return (match ?? getCountry(DEFAULT_COUNTRY_CODE)).dialCode;
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
