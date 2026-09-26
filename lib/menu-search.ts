import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const MENU_SEARCH_FLAG = "recherche_menu";

export async function isMenuSearchEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    MENU_SEARCH_FLAG,
    "Recherche dans le menu",
    "Petit champ « Chercher un module » en haut du menu de gauche (ordinateur et téléphone) : on tape « stock », seuls les modules correspondants restent affichés."
  );
  return isFeatureEnabled(MENU_SEARCH_FLAG, businessId);
}
