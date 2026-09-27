import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const MOBILE_PAGES_FLAG = "pages_mobile";

/**
 * Flag pages_mobile : versions « téléphone » (cartes au lieu de tableaux,
 * actions principales en avant) des pages Crédits, Achats et Stock.
 * Ordinateur inchangé.
 */
export async function isMobilePagesEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    MOBILE_PAGES_FLAG,
    "Pages adaptées au téléphone (Crédits, Achats, Stock)",
    "Sur téléphone : cartes lisibles au lieu de tableaux coupés (montant dû visible, appel en un geste), et actions principales (Entrée, Sortie, Nouvel achat) mises en avant. Ordinateur inchangé."
  );
  return isFeatureEnabled(MOBILE_PAGES_FLAG, businessId);
}
