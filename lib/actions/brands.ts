"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const brandSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
});

export async function createBrandAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("name", parsed.data.name)
    .maybeSingle();
  if (existing) return { error: "Cette marque existe déjà" };

  const { data: brand, error } = await supabase
    .from("brands")
    .insert({ business_id: user.businessId, name: parsed.data.name })
    .select("id")
    .single();
  if (error || !brand) {
    console.error("[createBrandAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la marque" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Brand",
    entityId: brand.id as string,
  });

  revalidatePath("/marques");
  return { success: "Marque créée" };
}

/** Retourne la marque existante correspondant à ce nom (insensible à la casse), ou la crée — utilisé par le sélecteur du formulaire produit pour permettre de saisir une marque à la volée. */
export async function getOrCreateBrandByNameAction(name: string): Promise<{ id: string } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nom de marque vide" };

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("business_id", user.businessId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return { id: existing.id as string };

  const { data: brand, error } = await supabase
    .from("brands")
    .insert({ business_id: user.businessId, name: trimmed })
    .select("id")
    .single();
  if (error || !brand) return { error: "Impossible de créer la marque" };
  return { id: brand.id as string };
}

export async function updateBrandAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!brand) return { error: "Marque introuvable" };

  const { error } = await supabase.from("brands").update({ name: parsed.data.name }).eq("id", id);
  if (error) {
    console.error("[updateBrandAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la marque" };
  }

  // products.brand est un champ texte dénormalisé (pas de clé étrangère,
  // voir supabase/schema.sql) — on le réaligne pour tous les produits qui
  // portaient l'ancien nom, sans quoi renommer une marque ici la
  // désynchroniserait silencieusement des produits déjà enregistrés.
  if (brand.name !== parsed.data.name) {
    await supabase
      .from("products")
      .update({ brand: parsed.data.name })
      .eq("business_id", user.businessId)
      .eq("brand", brand.name as string);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Brand",
    entityId: id,
  });

  revalidatePath("/marques");
  revalidatePath("/produits");
  return { success: "Marque mise à jour" };
}

export async function deleteBrandAction(id: string) {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!brand) return { error: "Marque introuvable" };

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .eq("brand", brand.name as string);
  if (productCount && productCount > 0) {
    return { error: `Impossible de supprimer : ${productCount} produit(s) utilisent cette marque` };
  }

  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) {
    console.error("[deleteBrandAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer la marque" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "Brand",
    entityId: id,
  });

  revalidatePath("/marques");
  return { success: "Marque supprimée" };
}
