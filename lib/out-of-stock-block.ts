import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const OUT_OF_STOCK_BLOCK_FLAG = "refus_rupture_caisse";

export async function isOutOfStockBlockEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    OUT_OF_STOCK_BLOCK_FLAG,
    "Refus des produits en rupture à la caisse",
    "Au scan (ou au clic) d'un produit dont le stock est à zéro, ou déjà entièrement dans le panier : bip d'erreur, message rouge sous la recherche, et le produit n'est pas ajouté."
  );
  return isFeatureEnabled(OUT_OF_STOCK_BLOCK_FLAG, businessId);
}
