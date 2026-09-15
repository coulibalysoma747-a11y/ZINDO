export function formatMoney(amount: number, currency = "XOF") {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("fr-FR").format(rounded);
  return `${formatted} ${currency === "XOF" ? "FCFA" : currency}`;
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

/** "9 janvier 2026" — format long utilisé sur les factures A4 ("le {date}"). */
export function formatLongDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

const FR_UNITS = ["Zéro", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf"];
const FR_TEENS = ["Dix", "Onze", "Douze", "Treize", "Quatorze", "Quinze", "Seize"];
const FR_TENS: Record<number, string> = { 2: "Vingt", 3: "Trente", 4: "Quarante", 5: "Cinquante", 6: "Soixante" };

function frTeenOrOnes(n: number): string {
  // n de 10 à 19
  if (n < 17) return FR_TEENS[n - 10];
  return `Dix ${FR_UNITS[n - 10]}`; // 17, 18, 19
}

function frUnder100(n: number): string {
  if (n < 10) return FR_UNITS[n];
  if (n < 17) return FR_TEENS[n - 10];
  if (n < 20) return `Dix ${FR_UNITS[n - 10]}`;
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return FR_TENS[t];
    if (u === 1) return `${FR_TENS[t]} Et Un`;
    return `${FR_TENS[t]} ${FR_UNITS[u]}`;
  }
  if (n < 80) {
    const u = n - 60; // 10..19
    if (u === 11) return "Soixante Et Onze";
    return `Soixante ${frTeenOrOnes(u)}`;
  }
  const u = n - 80; // 0..19
  if (u === 0) return "Quatre Vingt"; // 80
  if (u < 10) return `Quatre Vingt ${FR_UNITS[u]}`; // 81-89 : pas de "et" (contrairement à 21, 31...)
  return `Quatre Vingt ${frTeenOrOnes(u)}`; // 90-99
}

function frUnder1000(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) {
    if (h > 1) parts.push(FR_UNITS[h]);
    parts.push("Cent");
  }
  if (rest > 0) parts.push(frUnder100(rest));
  return parts.join(" ");
}

/**
 * Convertit un montant en toutes lettres, pour la mention "Arrêtée la
 * présente facture à la somme de : ..." des factures A4 — convention
 * commerciale ouest-africaine où "Cent"/"Vingt"/"Mille"/"Million" restent
 * invariables (jamais de -s), sans traits d'union entre les mots.
 */
export function numberToFrenchWords(n: number): string {
  const value = Math.round(Math.abs(n));
  if (value === 0) return "Zéro";

  const billions = Math.floor(value / 1_000_000_000);
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const rest = value % 1000;

  const parts: string[] = [];
  if (billions > 0) parts.push(`${frUnder1000(billions)} Milliard`);
  if (millions > 0) parts.push(`${frUnder1000(millions)} Million`);
  if (thousands > 0) parts.push(thousands === 1 ? "Mille" : `${frUnder1000(thousands)} Mille`);
  if (rest > 0) parts.push(frUnder1000(rest));

  return parts.join(" ").replace(/\s+/g, " ").trim();
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
