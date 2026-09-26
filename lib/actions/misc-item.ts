"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { isMiscItemEnabled, MISC_ITEM_REFERENCE } from "@/lib/misc-item";
import type { PosProduct } from "@/components/products/ProductGrid";

/**
 * Fiche « Article divers » du commerce, créée au premier usage (flag
 * article_divers). Inactive : elle n'apparaît ni dans les produits ni à la
 * caisse, seulement sur les lignes « Article divers » des ventes.
 */
export async function getMiscItemProductAction(): Promise<PosProduct | { error: string }> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!(await isMiscItemEnabled(user.businessId))) return { error: "Fonctionnalité non disponible" };

  const select = "id, name, reference, unit";
  const { data: existing } = await supabase
    .from("products")
    .select(select)
    .eq("business_id", user.businessId)
    .eq("reference", MISC_ITEM_REFERENCE)
    .maybeSingle();

  let product = existing as { id: string; name: string; reference: string; unit: string } | null;
  if (!product) {
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        business_id: user.businessId,
        reference: MISC_ITEM_REFERENCE,
        name: "Article divers",
        purchase_price: 0,
        sale_price: 0,
        active: false,
      })
      .select(select)
      .single();
    if (error || !created) {
      console.error("[getMiscItemProductAction] Échec de la création :", error?.message);
      return { error: "Impossible de préparer l'article divers. Réessayez." };
    }
    product = created as unknown as typeof product;
  }

  return {
    id: product!.id,
    name: product!.name,
    reference: product!.reference,
    barcode: null,
    photoUrl: null,
    salePrice: 0,
    purchasePrice: 0,
    quantity: 0,
    unit: product!.unit,
    trackUnits: false,
  };
}
