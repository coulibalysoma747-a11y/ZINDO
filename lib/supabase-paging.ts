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
