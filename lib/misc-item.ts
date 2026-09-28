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

/**
 * Fiche cachée « Article divers » du commerce, créée au premier usage (inactive,
 * donc absente des listes de produits). Sert aux lignes sans stock : prix rapide
 * de la caisse, frais de livraison d'une commande du Marché…
 */
export async function ensureMiscItemProduct(businessId: string): Promise<{ id: string; name: string; reference: string; unit: string } | null> {
  const select = "id, name, reference, unit";
  const { data: existing } = await supabase.from("products").select(select).eq("business_id", businessId).eq("reference", MISC_ITEM_REFERENCE).maybeSingle();
  if (existing) return existing as { id: string; name: string; reference: string; unit: string };
  const { data: created, error } = await supabase
    .from("products")
    .insert({ business_id: businessId, reference: MISC_ITEM_REFERENCE, name: "Article divers", purchase_price: 0, sale_price: 0, active: false })
    .select(select)
    .single();
  if (!error && created) return created as { id: string; name: string; reference: string; unit: string };
  // Deux créations simultanées : l'autre a gagné (référence unique par commerce).
  const { data: again } = await supabase.from("products").select(select).eq("business_id", businessId).eq("reference", MISC_ITEM_REFERENCE).maybeSingle();
  if (!again) console.error("[ensureMiscItemProduct] Échec de la création :", error?.message);
  return (again as { id: string; name: string; reference: string; unit: string } | null) ?? null;
}
