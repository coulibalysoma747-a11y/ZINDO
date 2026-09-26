import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const SETTINGS_TABS_FLAG = "parametres_onglets";

export async function isSettingsTabsEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    SETTINGS_TABS_FLAG,
    "Paramètres en onglets",
    "Range la page Paramètres en onglets (Commerce, Caisse et paiements, Stock, Factures, Dépenses, Modules, Équipe, Avancé) au lieu d'une longue page à faire défiler. Retire aussi l'intégration FasoStock de cette page."
  );
  return isFeatureEnabled(SETTINGS_TABS_FLAG, businessId);
}
