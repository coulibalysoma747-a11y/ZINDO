/** Pack Vérifié du Marché ZINDO : prix et durée (partagés par la demande, la validation et le paiement SasPay). */
export const PACK_PRICE = 1000;
export const PACK_DAYS = 30;

/** Nouvelle fin de pack : 30 jours après la fin actuelle si le pack est encore actif, sinon à partir d'aujourd'hui. */
export function extendPack(currentEnd: string | null): string {
  const base = Math.max(Date.now(), currentEnd ? new Date(currentEnd).getTime() : 0);
  return new Date(base + PACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
