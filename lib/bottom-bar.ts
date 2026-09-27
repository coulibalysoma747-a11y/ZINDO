import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const BOTTOM_BAR_FLAG = "barre_bas_quatre";

/** Flag barre_bas_quatre : barre du bas Accueil / Produits / Vente / Plus — voir components/layout/MobileTabBarFour.tsx. */
export async function isFourTabBarEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    BOTTOM_BAR_FLAG,
    "Barre du bas à 4 boutons (Accueil, Produits, Vente, Plus)",
    "Téléphone : barre du bas Accueil / Produits / Vente / Plus ; « Plus » ouvre les actions rapides et tous les autres modules rangés par rubrique."
  );
  return isFeatureEnabled(BOTTOM_BAR_FLAG, businessId);
}
