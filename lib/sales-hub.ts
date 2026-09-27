import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const SALES_HUB_FLAG = "accueil_vente";

/**
 * Flag accueil_vente : sur téléphone, le bouton « Ventes » de la barre du bas
 * ouvre un écran de départ (/ventes/accueil) — gros bouton « Nouvelle vente »
 * et tuiles Caisse, Facture A4, Devis, Historique, Sessions — au lieu d'ouvrir
 * directement la caisse, comme le demandait le propriétaire (modèle FasoStock).
 */
export async function isSalesHubEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    SALES_HUB_FLAG,
    "Écran « Vente » (point de départ des ventes)",
    "Téléphone : le bouton « Ventes » de la barre du bas ouvre un écran avec « Nouvelle vente » et des tuiles Caisse, Facture A4, Devis, Historique des ventes, Sessions de caisse."
  );
  return isFeatureEnabled(SALES_HUB_FLAG, businessId);
}
