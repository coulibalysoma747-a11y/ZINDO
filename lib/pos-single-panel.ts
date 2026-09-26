import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const POS_SINGLE_PANEL_FLAG = "caisse_une_colonne";

export async function isPosSinglePanelEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    POS_SINGLE_PANEL_FLAG,
    "Caisse en une colonne",
    "Panier, total, moyen de paiement (boutons), client, remise, montant reçu et « Annuler / Valider » réunis dans une seule colonne à droite, visible sans faire défiler."
  );
  return isFeatureEnabled(POS_SINGLE_PANEL_FLAG, businessId);
}
