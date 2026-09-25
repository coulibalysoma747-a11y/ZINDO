/**
 * Recherche tolérante pour la caisse : insensible à la casse, aux accents et
 * aux espaces multiples, mot par mot (ordre libre), avec une petite tolérance
 * aux fautes de frappe — "SCOCH NOIRE" retrouve "Scotch noir".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Distance d'édition bornée : renvoie `max + 1` dès qu'elle dépasse `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

function tokenMatches(queryToken: string, words: string[], haystack: string, fuzzy: boolean): boolean {
  if (haystack.includes(queryToken)) return true;
  // Fautes de frappe : seulement pour des mots assez longs, sinon trop de faux
  // positifs — et jamais pour un numéro ("6204" ne doit pas trouver "6004").
  if (!fuzzy || queryToken.length < 4 || /\d/.test(queryToken)) return false;
  const max = queryToken.length >= 7 ? 2 : 1;
  return words.some(
    (w) =>
      editDistance(queryToken, w, max) <= max ||
      // Mot tapé en entier alors que le produit l'a au singulier/abrégé ("noire" → "noir"),
      // ou mot en cours de frappe avec une faute ("scoc" → "scotch").
      (w.length >= 3 && editDistance(queryToken, w.slice(0, queryToken.length), max) <= max)
  );
}

/**
 * Vrai si chaque mot de la recherche se retrouve dans l'un des champs —
 * exactement, ou à une faute de frappe près si `fuzzy`.
 */
export function matchesSearch(
  normalizedQuery: string,
  fields: (string | null | undefined)[],
  { fuzzy = true }: { fuzzy?: boolean } = {}
): boolean {
  if (!normalizedQuery) return true;
  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  const words = haystack.split(" ");
  return normalizedQuery.split(" ").every((t) => tokenMatches(t, words, haystack, fuzzy));
}

/**
 * Filtre une liste : les correspondances exactes d'abord ; la tolérance aux
 * fautes de frappe ne sert qu'en repli, quand la recherche exacte ne trouve rien.
 */
export function searchItems<T>(items: T[], query: string, fields: (item: T) => (string | null | undefined)[]): T[] {
  const q = normalizeSearchText(query);
  if (!q) return items;
  const exact = items.filter((item) => matchesSearch(q, fields(item), { fuzzy: false }));
  return exact.length > 0 ? exact : items.filter((item) => matchesSearch(q, fields(item)));
}
