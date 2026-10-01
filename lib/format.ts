import { WORLD_CURRENCIES } from "@/lib/world-countries";

/** Francs CFA (UEMOA et CEMAC) : affichés « FCFA », sans centimes. */
const CFA = new Set(["XOF", "XAF"]);

// Symboles figés dans les données (lib/world-countries.ts) : le serveur et le
// navigateur affichent exactement le même texte.
const SYMBOLS = new Map(WORLD_CURRENCIES.map(([code, , symbol]) => [code, symbol]));

// Monnaies sans subdivision utilisée (norme ISO 4217) : montants entiers.
const ZERO_DECIMALS = new Set(["XOF", "XAF", "XPF", "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "VND", "VUV"]);

/** Nombre de décimales d'une monnaie : 0 pour le FCFA, le franc guinéen…, 2 pour l'euro, le naira… */
export function moneyDecimals(currency: string): number {
  return ZERO_DECIMALS.has(currency) ? 0 : 2;
}

/** Arrondi d'un montant à la précision de sa monnaie (entier en FCFA, au centime en euro). */
export function roundMoney(amount: number, currency = "XOF"): number {
  const factor = 10 ** moneyDecimals(currency);
  return Math.round(amount * factor) / factor;
}

/** Pas de saisie d'un champ de montant : « 1 » en FCFA, « 0.01 » en euro. */
export function moneyStep(currency = "XOF"): string {
  return moneyDecimals(currency) === 0 ? "1" : "0.01";
}

/** Symbole court d'une monnaie pour les libellés : FCFA, €, $, ₦, GH₵… (code ISO si inconnu). */
export function currencyLabel(currency: string): string {
  return CFA.has(currency) ? "FCFA" : SYMBOLS.get(currency) ?? currency;
}

/** Intl met une espace fine insécable (U+202F) entre les milliers, que beaucoup de polices affichent presque invisible (« 65830 ») : on la remplace par une espace insécable normale. */
const readable = (n: string) => n.replaceAll(String.fromCharCode(0x202f), String.fromCharCode(0xa0));

export function formatMoney(amount: number, currency = "XOF") {
  if (CFA.has(currency)) return `${readable(new Intl.NumberFormat("fr-FR").format(Math.round(amount)))}${String.fromCharCode(0xa0)}FCFA`;
  // Autres monnaies : décimales seulement si le montant en a (1 250 ₦, mais 12,50 €).
  const whole = Number.isInteger(Math.round(amount * 100) / 100);
  const number = new Intl.NumberFormat("fr-FR", whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${readable(number)} ${currencyLabel(currency)}`;
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** "9 janvier 2026" — format long utilisé sur les factures A4 ("le {date}"). */
export function formatLongDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

const FR_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const FR_TEENS = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const FR_TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** 0 à 99, orthographe traditionnelle : « vingt et un », « soixante-dix », « quatre-vingts ». */
function frUnder100(n: number, final: boolean): string {
  if (n < 10) return FR_UNITS[n];
  if (n < 20) return FR_TEENS[n - 10];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return FR_TENS[t];
    return u === 1 ? `${FR_TENS[t]} et un` : `${FR_TENS[t]}-${FR_UNITS[u]}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${FR_TEENS[n - 70]}`;
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";
  if (n < 90) return `quatre-vingt-${FR_UNITS[n - 80]}`;
  return `quatre-vingt-${FR_TEENS[n - 90]}`;
}

/** 0 à 999 ; `final` : rien ne suit (« deux cents », « quatre-vingts ») — faux devant « mille ». */
function frUnder1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(h === 1 ? "cent" : `${FR_UNITS[h]} ${rest === 0 && final ? "cents" : "cent"}`);
  if (rest > 0 || h === 0) parts.push(frUnder100(rest, final));
  return parts.join(" ");
}

/**
 * Nombre entier en toutes lettres, orthographe française traditionnelle :
 * « mille six cent quatre-vingt-dix », « deux cents », « trois millions ».
 */
export function numberToFrenchWords(n: number): string {
  const value = Math.round(Math.abs(n));
  if (value === 0) return "zéro";
  const billions = Math.floor(value / 1_000_000_000);
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const rest = value % 1000;
  const parts: string[] = [];
  if (billions > 0) parts.push(`${frUnder1000(billions, true)} milliard${billions > 1 ? "s" : ""}`);
  if (millions > 0) parts.push(`${frUnder1000(millions, true)} million${millions > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${frUnder1000(thousands, false)} mille`);
  if (rest > 0) parts.push(frUnder1000(rest, true));
  return parts.join(" ");
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // lundi = début de semaine
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfYesterday() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

/** Nom de la monnaie accordé au nombre : « franc CFA » / « francs CFA », « euro » / « euros », « dollars des États-Unis »… */
function currencyWords(currency: string, plural: boolean): string {
  if (CFA.has(currency)) return plural ? "francs CFA" : "franc CFA";
  const name = WORLD_CURRENCIES.find(([code]) => code === currency)?.[1] ?? currency;
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  if (!plural || lower === currency) return lower;
  // Pluriel des mots jusqu'au premier « de / des / du » (« dollars des États-Unis », « nairas nigérians »).
  let stop = false;
  return lower
    .split(" ")
    .map((word) => {
      if (stop || /^(de|des|du|d')$/i.test(word)) {
        stop = true;
        return word;
      }
      return /[sxz]$/i.test(word) ? word : `${word}s`;
    })
    .join(" ");
}

/**
 * Montant en toutes lettres pour les documents (« Arrêté à la somme de… ») :
 * « Mille cinq cents francs CFA », « Douze euros et cinquante centimes ».
 */
export function amountInWords(amount: number, currency = "XOF"): string {
  const rounded = roundMoney(Math.abs(amount), currency);
  const units = Math.floor(rounded);
  const cents = Math.round((rounded - units) * 100);
  const main = `${numberToFrenchWords(units)} ${currencyWords(currency, units >= 2)}`;
  // Majuscules, comme sur les factures officielles (choix du propriétaire, 30/09/2026).
  return (cents > 0 ? `${main} et ${numberToFrenchWords(cents)} centime${cents > 1 ? "s" : ""}` : main).toUpperCase();
}
