"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { WHOLESALE_ACTIVITY_KEYS } from "@/lib/activities";
import type { PriceTierOption } from "@/lib/pricing";

export type PriceTier = PriceTierOption & { productId: string };

/**
 * Tarification par palier ("prix de gros") : nouvelle fonctionnalité,
 * désactivée par défaut tant qu'elle n'est pas explicitement activée depuis
 * /admin/fonctionnalites — voir la règle du memory "Feature rollout rule".
 */
const PRICE_TIERS_FLAG = "prix_de_gros";

export async function ensurePriceTiersFlagRegistered() {
  await registerFeatureFlag(
    PRICE_TIERS_FLAG,
    "Tarification par palier (prix de gros)",
    "Prix unitaire dégressif selon la quantité achetée (ex. 10+ pièces à un tarif, 50+ à un autre), appliqué automatiquement à la caisse — pour grossistes, dépôts et quincailleries."
  );
}

/**
 * Enregistre le flag au passage (idempotent) avant de le vérifier, pour que
 * les points d'entrée qui ne passent pas par la fiche produit (recherche
 * caisse, chargement de la grille caisse) ne considèrent jamais la
 * fonctionnalité comme activée par défaut simplement parce qu'aucune page ne
 * l'a encore enregistrée.
 */
export async function isPriceTiersModuleEnabled(businessId: string): Promise<boolean> {
  await ensurePriceTiersFlagRegistered();
  return isFeatureEnabled(PRICE_TIERS_FLAG, businessId);
}

export function isWholesaleActivity(activityKey: string | null | undefined): boolean {
  return !!activityKey && WHOLESALE_ACTIVITY_KEYS.includes(activityKey);
}

/** Paliers de prix d'un produit (ex. "10 pièces et + : 450 FCFA/pièce") — voir supabase/schema.sql::product_price_tiers. */
export async function getPriceTiersAction(productId: string): Promise<PriceTier[]> {
  const user = await requireUser();
  if (!(await isPriceTiersModuleEnabled(user.businessId))) return [];

  const { data } = await supabase
    .from("product_price_tiers")
    .select("id, productId:product_id, minQuantity:min_quantity, unitPrice:unit_price")
    .eq("business_id", user.businessId)
    .eq("product_id", productId)
    .order("min_quantity", { ascending: true });
  return (data ?? []) as unknown as PriceTier[];
}

const tierSchema = z.object({
  minQuantity: z.coerce.number().int().positive("Doit être supérieur à 0"),
  unitPrice: z.coerce.number().min(0, "Prix invalide"),
});

export type PriceTierActionResult = { error?: string; success?: string };

export async function addPriceTierAction(productId: string, formData: FormData): Promise<PriceTierActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isPriceTiersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = tierSchema.safeParse({
    minQuantity: formData.get("minQuantity"),
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const { data: existing } = await supabase
    .from("product_price_tiers")
    .select("id")
    .eq("product_id", productId)
    .eq("min_quantity", parsed.data.minQuantity)
    .maybeSingle();
  if (existing) return { error: "Un palier existe déjà pour cette quantité" };

  const { error } = await supabase.from("product_price_tiers").insert({
    business_id: user.businessId,
    product_id: productId,
    min_quantity: parsed.data.minQuantity,
    unit_price: parsed.data.unitPrice,
  });
  if (error) {
    console.error("[addPriceTierAction] Échec de la création :", error.message);
    return error.code === "23505" ? { error: "Un palier existe déjà pour cette quantité" } : { error: "Impossible d'enregistrer le palier" };
  }

  revalidatePath(`/produits/${productId}`);
  revalidatePath("/produits");
  return { success: "Palier ajouté" };
}

export async function updatePriceTierAction(tierId: string, formData: FormData): Promise<PriceTierActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isPriceTiersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = tierSchema.safeParse({
    minQuantity: formData.get("minQuantity"),
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: current } = await supabase
    .from("product_price_tiers")
    .select("productId:product_id")
    .eq("id", tierId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!current) return { error: "Palier introuvable" };

  const { data: duplicate } = await supabase
    .from("product_price_tiers")
    .select("id")
    .eq("product_id", current.productId)
    .eq("min_quantity", parsed.data.minQuantity)
    .neq("id", tierId)
    .maybeSingle();
  if (duplicate) return { error: "Un palier existe déjà pour cette quantité" };

  const { data: tier, error } = await supabase
    .from("product_price_tiers")
    .update({
      min_quantity: parsed.data.minQuantity,
      unit_price: parsed.data.unitPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tierId)
    .eq("business_id", user.businessId)
    .select("productId:product_id")
    .single();
  if (error || !tier) {
    console.error("[updatePriceTierAction] Échec de la mise à jour :", error?.message);
    return error?.code === "23505" ? { error: "Un palier existe déjà pour cette quantité" } : { error: "Impossible de mettre à jour le palier" };
  }

  revalidatePath(`/produits/${tier.productId}`);
  return { success: "Palier mis à jour" };
}

export async function deletePriceTierAction(tierId: string): Promise<PriceTierActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isPriceTiersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const { data: tier } = await supabase
    .from("product_price_tiers")
    .select("id, productId:product_id")
    .eq("id", tierId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!tier) return { error: "Palier introuvable" };

  const { error } = await supabase.from("product_price_tiers").delete().eq("id", tierId);
  if (error) {
    console.error("[deletePriceTierAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer le palier" };
  }

  revalidatePath(`/produits/${tier.productId}`);
  return { success: "Palier supprimé" };
}
