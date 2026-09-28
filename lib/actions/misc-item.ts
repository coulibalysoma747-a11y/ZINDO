"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureMiscItemProduct, isMiscItemEnabled } from "@/lib/misc-item";
import type { PosProduct } from "@/components/products/ProductGrid";

/**
 * Fiche « Article divers » du commerce, créée au premier usage (flag
 * article_divers). Inactive : elle n'apparaît ni dans les produits ni à la
 * caisse, seulement sur les lignes « Article divers » des ventes.
 */
export async function getMiscItemProductAction(): Promise<PosProduct | { error: string }> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!(await isMiscItemEnabled(user.businessId))) return { error: "Fonctionnalité non disponible" };

  const product = await ensureMiscItemProduct(user.businessId);
  if (!product) return { error: "Impossible de préparer l'article divers. Réessayez." };

  return {
    id: product.id,
    name: product.name,
    reference: product.reference,
    barcode: null,
    photoUrl: null,
    salePrice: 0,
    purchasePrice: 0,
    quantity: 0,
    unit: product.unit,
    trackUnits: false,
  };
}
