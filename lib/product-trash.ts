import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const PRODUCT_TRASH_FLAG = "corbeille_produits";

export async function isProductTrashEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    PRODUCT_TRASH_FLAG,
    "Corbeille des produits",
    "Bouton « Corbeille » dans Produits : liste des produits archivés (supprimés de la liste) avec un bouton « Restaurer » pour les remettre en vente."
  );
  return isFeatureEnabled(PRODUCT_TRASH_FLAG, businessId);
}
