import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const EXTENDED_EDIT_FLAG = "modifier_supprimer_partout";

/**
 * Flag modifier_supprimer_partout : boutons « Modifier » et « Supprimer » ajoutés
 * là où ils manquaient (clients, fournisseurs, dépenses, services, rendez-vous,
 * tables, codes promo, utilisateurs, garanties, lots de péremption, inventaires…).
 */
export async function isExtendedEditEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    EXTENDED_EDIT_FLAG,
    "Modifier / supprimer partout",
    "Ajoute les boutons « Modifier » et « Supprimer » qui manquaient : clients, fournisseurs, dépenses, services et rendez-vous, tables, codes promo, utilisateurs, garanties, lots de péremption, inventaires en cours."
  );
  return isFeatureEnabled(EXTENDED_EDIT_FLAG, businessId);
}
