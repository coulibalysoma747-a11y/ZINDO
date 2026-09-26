import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { supabase } from "@/lib/supabase";

const MISC_ITEM_FLAG = "article_divers";

/**
 * Référence de la fiche cachée « Article divers » (une par commerce, créée au
 * premier usage, inactive donc absente des listes de produits). Les lignes
 * de vente qui la portent ne contrôlent ni ne bougent le stock.
 */
export const MISC_ITEM_REFERENCE = "ZND-DIVERS";

export async function isMiscItemEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    MISC_ITEM_FLAG,
    "Caisse : article divers (prix rapide)",
    "Bouton « Article divers » à la caisse : on tape un montant (et un libellé facultatif, ex. « Sachet de glace ») et la ligne part au panier, sans fiche produit ni mouvement de stock."
  );
  return isFeatureEnabled(MISC_ITEM_FLAG, businessId);
}

/** Identifiants des fiches « Article divers » parmi ces produits (aucune requête si la liste est vide). */
export async function findMiscItemProductIds(businessId: string, productIds: string[]): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("business_id", businessId)
    .eq("reference", MISC_ITEM_REFERENCE)
    .in("id", productIds);
  return new Set(((data ?? []) as Array<{ id: string }>).map((p) => p.id));
}
