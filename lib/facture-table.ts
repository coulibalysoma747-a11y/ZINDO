import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const FACTURE_TABLE_FLAG = "facture_tableau";

/** Flag facture_tableau : Facture A4 remplie ligne par ligne au clavier (/factures/tableau). */
export async function isFactureTableEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    FACTURE_TABLE_FLAG,
    "Facture A4 (tableau)",
    "Deuxième façon de faire une facture A4 : ligne par ligne dans un tableau, au clavier (recherche + Entrée, quantité, prix), au lieu des cartes de produits. Tuile dans l'écran Vente."
  );
  return isFeatureEnabled(FACTURE_TABLE_FLAG, businessId);
}
