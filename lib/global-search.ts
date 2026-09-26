import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const GLOBAL_SEARCH_FLAG = "recherche_globale";

export async function isGlobalSearchEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    GLOBAL_SEARCH_FLAG,
    "Barre de recherche globale",
    "Barre de recherche dans l'en-tête (raccourci Ctrl K) : retrouve en un seul endroit produits (nom, référence, code-barres), clients, fournisseurs et ventes (numéro de ticket)."
  );
  return isFeatureEnabled(GLOBAL_SEARCH_FLAG, businessId);
}
