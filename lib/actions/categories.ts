"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const categorySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
});

export async function createCategoryAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("name", parsed.data.name)
    .maybeSingle();
  if (existing) return { error: "Cette catégorie existe déjà" };

  const { data: category, error } = await supabase
    .from("categories")
    .insert({ business_id: user.businessId, name: parsed.data.name, description: parsed.data.description ?? null })
    .select("id")
    .single();
  if (error || !category) {
    console.error("[createCategoryAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la catégorie" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Category",
    entityId: category.id as string,
  });

  revalidatePath("/categories");
  return { success: "Catégorie créée" };
}

export async function updateCategoryAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!category) return { error: "Catégorie introuvable" };

  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name, description: parsed.data.description ?? null })
    .eq("id", id);
  if (error) {
    console.error("[updateCategoryAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la catégorie" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Category",
    entityId: id,
  });

  revalidatePath("/categories");
  return { success: "Catégorie mise à jour" };
}

export async function deleteCategoryAction(id: string) {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!category) return { error: "Catégorie introuvable" };

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (productCount && productCount > 0) {
    return { error: `Impossible de supprimer : ${productCount} produit(s) utilisent cette catégorie` };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    console.error("[deleteCategoryAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer la catégorie" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "Category",
    entityId: id,
  });

  revalidatePath("/categories");
  return { success: "Catégorie supprimée" };
}
