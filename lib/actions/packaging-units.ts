"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { generateProductBarcode } from "@/lib/reference";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

export type PackagingUnit = {
  id: string;
  productId: string;
  name: string;
  multiplier: number;
  salePrice: number;
  barcode: string | null;
};

/**
 * Conditionnements : nouvelle fonctionnalité, désactivée par défaut tant
 * qu'elle n'est pas explicitement activée depuis /admin/fonctionnalites —
 * voir la règle du memory "Feature rollout rule".
 */
const PACKAGING_UNITS_FLAG = "conditionnements";

export async function ensurePackagingUnitsFlagRegistered() {
  await registerFeatureFlag(
    PACKAGING_UNITS_FLAG,
    "Conditionnements",
    "Vente par colis/carton (multiplicateur d'unités) en plus de l'unité de base, avec code-barres dédié."
  );
}

/**
 * Enregistre le flag au passage (idempotent) avant de le vérifier, pour que
 * les points d'entrée qui ne passent pas par une page produit (recherche
 * caisse, scan de code-barres) ne considèrent jamais la fonctionnalité comme
 * activée par défaut simplement parce qu'aucune page ne l'a encore enregistrée.
 */
export async function isPackagingUnitsModuleEnabled(businessId: string): Promise<boolean> {
  await ensurePackagingUnitsFlagRegistered();
  return isFeatureEnabled(PACKAGING_UNITS_FLAG, businessId);
}

/** Conditionnements de vente d'un produit (ex. "Carton de 12") — voir supabase/schema.sql::product_packaging_units. */
export async function getPackagingUnitsAction(productId: string): Promise<PackagingUnit[]> {
  const user = await requireUser();
  if (!(await isPackagingUnitsModuleEnabled(user.businessId))) return [];

  const { data } = await supabase
    .from("product_packaging_units")
    .select("id, productId:product_id, name, multiplier, salePrice:sale_price, barcode")
    .eq("business_id", user.businessId)
    .eq("product_id", productId)
    .order("multiplier", { ascending: true });
  return (data ?? []) as unknown as PackagingUnit[];
}

const packagingSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  multiplier: z.coerce.number().positive("Doit être supérieur à 0"),
  salePrice: z.coerce.number().min(0, "Prix invalide"),
  barcode: z.string().optional(),
});

export type PackagingUnitActionResult = { error?: string; success?: string };

export async function addPackagingUnitAction(productId: string, formData: FormData): Promise<PackagingUnitActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isPackagingUnitsModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = packagingSchema.safeParse({
    name: formData.get("name"),
    multiplier: formData.get("multiplier"),
    salePrice: formData.get("salePrice"),
    barcode: formData.get("barcode") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: product } = await supabase
    .from("products")
    .select("id, trackUnits:track_units")
    .eq("id", productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };
  if (product.trackUnits) return { error: "Un produit à suivi individuel ne peut pas avoir de conditionnement" };

  if (parsed.data.barcode) {
    const { data: barcodeTaken } = await supabase
      .from("product_packaging_units")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("barcode", parsed.data.barcode)
      .maybeSingle();
    if (barcodeTaken) return { error: "Ce code-barres est déjà utilisé par un autre conditionnement" };
  }

  const { error } = await supabase.from("product_packaging_units").insert({
    business_id: user.businessId,
    product_id: productId,
    name: parsed.data.name,
    multiplier: parsed.data.multiplier,
    sale_price: parsed.data.salePrice,
    barcode: parsed.data.barcode ?? null,
  });
  if (error) {
    console.error("[addPackagingUnitAction] Échec de la création :", error.message);
    return { error: "Impossible d'enregistrer le conditionnement" };
  }

  revalidatePath(`/produits/${productId}`);
  revalidatePath("/produits");
  return { success: "Conditionnement ajouté" };
}

export async function updatePackagingUnitAction(unitId: string, formData: FormData): Promise<PackagingUnitActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isPackagingUnitsModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = packagingSchema.safeParse({
    name: formData.get("name"),
    multiplier: formData.get("multiplier"),
    salePrice: formData.get("salePrice"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: unit, error } = await supabase
    .from("product_packaging_units")
    .update({
      name: parsed.data.name,
      multiplier: parsed.data.multiplier,
      sale_price: parsed.data.salePrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId)
    .eq("business_id", user.businessId)
    .select("productId:product_id")
    .single();
  if (error || !unit) {
    console.error("[updatePackagingUnitAction] Échec de la mise à jour :", error?.message);
    return { error: "Impossible de mettre à jour le conditionnement" };
  }

  revalidatePath(`/produits/${unit.productId}`);
  return { success: "Conditionnement mis à jour" };
}

export async function deletePackagingUnitAction(unitId: string): Promise<PackagingUnitActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isPackagingUnitsModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const { data: unit } = await supabase
    .from("product_packaging_units")
    .select("id, productId:product_id")
    .eq("id", unitId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!unit) return { error: "Conditionnement introuvable" };

  const { error } = await supabase.from("product_packaging_units").delete().eq("id", unitId);
  if (error) {
    console.error("[deletePackagingUnitAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer le conditionnement" };
  }

  revalidatePath(`/produits/${unit.productId}`);
  return { success: "Conditionnement supprimé" };
}

/** Génère et enregistre un code-barres EAN-13 pour un conditionnement qui n'en a pas — même logique que pour un produit (voir lib/actions/products.ts::ensureProductBarcodeAction). */
export async function ensurePackagingBarcodeAction(unitId: string): Promise<{ barcode: string } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isPackagingUnitsModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const { data: unit } = await supabase
    .from("product_packaging_units")
    .select("id, barcode")
    .eq("id", unitId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!unit) return { error: "Conditionnement introuvable" };
  if (unit.barcode) return { barcode: unit.barcode as string };

  try {
    const barcode = await generateProductBarcode(user.businessId);
    const { error } = await supabase.from("product_packaging_units").update({ barcode }).eq("id", unitId);
    if (error) {
      console.error("[ensurePackagingBarcodeAction] Échec de l'enregistrement :", error.message);
      return { error: "Impossible de générer le code-barres" };
    }
    return { barcode };
  } catch (e) {
    console.error("[ensurePackagingBarcodeAction] Échec de la génération :", e);
    return { error: "Impossible de générer le code-barres pour le moment" };
  }
}
