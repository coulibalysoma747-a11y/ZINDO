import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const SELECT_ON_FOCUS_FLAG = "selection_auto_champs";

/** Flag selection_auto_champs : toucher une case sélectionne son contenu — voir components/layout/SelectOnFocus.tsx. */
export async function isSelectOnFocusEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    SELECT_ON_FOCUS_FLAG,
    "Cases : sélectionner le contenu au toucher",
    "Dans toute l'application, toucher une case (prix, nom, quantité, téléphone…) sélectionne son contenu : ce qu'on tape le remplace au lieu de s'ajouter (« 2 » puis 3 donnait « 23 »). Hors zones de texte longues et mots de passe."
  );
  return isFeatureEnabled(SELECT_ON_FOCUS_FLAG, businessId);
}
