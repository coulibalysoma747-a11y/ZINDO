import "server-only";

/**
 * Supabase (PostgREST) plafonne une requête à 1 000 lignes : pour un calcul
 * qui a besoin de tout l'historique (réassort sur 90 jours de mouvements), on
 * relit page par page jusqu'à épuisement, avec un plafond de sécurité.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  { pageSize = 1000, maxRows = 50000 }: { pageSize?: number; maxRows?: number } = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      console.error("[fetchAllPages] Échec de lecture :", error.message);
      break;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

/**
 * Variante de fetchAllPages qui lit plusieurs pages en même temps (par
 * vagues de `concurrency`), au lieu d'attendre chaque page avant de demander
 * la suivante : pour 4 000 lignes, un seul aller-retour au lieu de quatre.
 * `fetchPage` doit trier sur une colonne unique pour que les pages ne se
 * chevauchent pas.
 */
export async function fetchAllPagesConcurrently<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  { pageSize = 1000, maxRows = 50000, concurrency = 4 }: { pageSize?: number; maxRows?: number; concurrency?: number } = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; start < maxRows; start += pageSize * concurrency) {
    const froms: number[] = [];
    for (let from = start; from < Math.min(start + pageSize * concurrency, maxRows); from += pageSize) froms.push(from);
    const pages = await Promise.all(froms.map((from) => fetchPage(from, from + pageSize - 1)));
    for (const { data, error } of pages) {
      if (error) {
        console.error("[fetchAllPagesConcurrently] Échec de lecture :", error.message);
        return rows;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) return rows;
    }
  }
  return rows;
}
