import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { supabase } from "@/lib/supabase";
import { MISC_ITEM_REFERENCE } from "@/lib/misc-item";

const PRODUCT_TRASH_FLAG = "corbeille_produits";

export async function isProductTrashEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    PRODUCT_TRASH_FLAG,
    "Corbeille des produits",
    "Bouton « Corbeille » dans Produits : liste des produits archivés (supprimés de la liste) avec un bouton « Restaurer » pour les remettre en vente."
  );
  return isFeatureEnabled(PRODUCT_TRASH_FLAG, businessId);
}

/** Durée de séjour dans la corbeille avant l'effacement automatique. */
export const TRASH_RETENTION_DAYS = 30;

/**
 * L'effacement automatique ne touche que les produits archivés à partir de cette date :
 * ceux archivés avant n'ont jamais été prévenus de la règle des 30 jours.
 */
export const TRASH_PURGE_STARTS_AT = "2026-10-01T00:00:00.000Z";

export const TRASH_BLOCKED_MESSAGE =
  "Ce produit apparaît dans des ventes, des achats ou d'autres documents : il reste dans la corbeille pour garder votre historique.";

/**
 * Efface définitivement un produit archivé. La base refuse (code 23503) si le produit
 * est déjà utilisé dans une vente, un achat, un devis, un inventaire… : l'historique
 * est ainsi protégé, sans avoir à le vérifier table par table.
 */
export async function deleteProductForever(businessId: string, productId: string): Promise<{ ok: true } | { error: string; blocked?: boolean }> {
  const { data: product } = await supabase
    .from("products")
    .select("id, active, reference")
    .eq("id", productId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };
  if (product.active) return { error: "Seul un produit de la corbeille peut être effacé définitivement" };
  if (product.reference === MISC_ITEM_REFERENCE) return { error: "Ce produit ne peut pas être effacé" };

  const { error } = await supabase.from("products").delete().eq("id", productId).eq("business_id", businessId).eq("active", false);
  if (error) {
    if (error.code === "23503") return { error: TRASH_BLOCKED_MESSAGE, blocked: true };
    console.error("[deleteProductForever] Échec de l'effacement :", error.message);
    return { error: "Impossible d'effacer le produit" };
  }
  return { ok: true };
}

/** Efface les produits archivés depuis plus de TRASH_RETENTION_DAYS jours (tâche quotidienne). */
export async function purgeExpiredTrash(): Promise<{ deleted: number; kept: number }> {
  const limit = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: expired, error } = await supabase
    .from("products")
    .select("id, businessId:business_id")
    .eq("active", false)
    .neq("reference", MISC_ITEM_REFERENCE)
    .lt("updated_at", limit)
    .gte("updated_at", TRASH_PURGE_STARTS_AT)
    .limit(1000);
  if (error) {
    console.error("[purgeExpiredTrash] Lecture impossible :", error.message);
    return { deleted: 0, kept: 0 };
  }
  let deleted = 0;
  let kept = 0;
  for (const p of (expired ?? []) as { id: string; businessId: string }[]) {
    const result = await deleteProductForever(p.businessId, p.id);
    if ("ok" in result) deleted++;
    else kept++;
  }
  return { deleted, kept };
}
