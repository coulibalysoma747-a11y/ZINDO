"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { isConsultationsModuleEnabled } from "@/lib/actions/consultations";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";

export type ActionState = { error?: string; success?: string } | undefined;

export type DiagnosisCategory = { id: string; name: string };

/** Même garde que le reste du module Consultations — voir lib/actions/medical-acts.ts. */
async function requireDiagnosisCategoriesAccess() {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");
  if (!(await isConsultationsModuleEnabled(user.businessId))) redirect("/dashboard");
  return user;
}

export async function getDiagnosisCategoriesAction(): Promise<DiagnosisCategory[]> {
  const user = await requireDiagnosisCategoriesAccess();
  const { data } = await supabase
    .from("diagnosis_categories")
    .select("id, name")
    .eq("business_id", user.businessId)
    .order("name", { ascending: true });
  return (data ?? []) as unknown as DiagnosisCategory[];
}

const categorySchema = z.object({ name: z.string().min(1, "Le nom est requis") });

/** Catégorie existante (insensible à la casse) ou création à la volée — utilisé par le sélecteur "Diagnostic" du formulaire de consultation. */
export async function getOrCreateDiagnosisCategoryByNameAction(name: string): Promise<{ id: string } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  const trimmed = name.trim();
  if (!trimmed) return { error: "Diagnostic vide" };

  const { data: existing } = await supabase
    .from("diagnosis_categories")
    .select("id")
    .eq("business_id", user.businessId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return { id: existing.id as string };

  const { data: category, error } = await supabase
    .from("diagnosis_categories")
    .insert({ business_id: user.businessId, name: trimmed })
    .select("id")
    .single();
  if (error || !category) return { error: "Impossible de créer le diagnostic" };
  return { id: category.id as string };
}

export async function createDiagnosisCategoryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireDiagnosisCategoriesAccess();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase
    .from("diagnosis_categories")
    .select("id")
    .eq("business_id", user.businessId)
    .ilike("name", parsed.data.name)
    .maybeSingle();
  if (existing) return { error: "Ce diagnostic existe déjà" };

  const { data: category, error } = await supabase
    .from("diagnosis_categories")
    .insert({ business_id: user.businessId, name: parsed.data.name })
    .select("id")
    .single();
  if (error || !category) {
    console.error("[createDiagnosisCategoryAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer le diagnostic" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "DiagnosisCategory", entityId: category.id as string });

  revalidatePath("/consultations/diagnostics");
  return { success: "Diagnostic créé" };
}

export async function updateDiagnosisCategoryAction(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireDiagnosisCategoriesAccess();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: category } = await supabase
    .from("diagnosis_categories")
    .select("id, name")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!category) return { error: "Diagnostic introuvable" };

  const { error } = await supabase.from("diagnosis_categories").update({ name: parsed.data.name }).eq("id", id);
  if (error) {
    console.error("[updateDiagnosisCategoryAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le diagnostic" };
  }

  // consultations.diagnosis est un champ texte dénormalisé (pas de clé
  // étrangère, comme products.brand) — on réaligne les consultations déjà
  // enregistrées avec l'ancien libellé pour ne pas fausser les statistiques
  // par pathologie (voir /consultations/statistiques).
  if (category.name !== parsed.data.name) {
    await supabase
      .from("consultations")
      .update({ diagnosis: parsed.data.name })
      .eq("business_id", user.businessId)
      .eq("diagnosis", category.name as string);
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "DiagnosisCategory", entityId: id });

  revalidatePath("/consultations/diagnostics");
  revalidatePath("/consultations");
  return { success: "Diagnostic mis à jour" };
}

export async function deleteDiagnosisCategoryAction(id: string): Promise<ActionState> {
  const user = await requireDiagnosisCategoriesAccess();

  const { data: category } = await supabase
    .from("diagnosis_categories")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!category) return { error: "Diagnostic introuvable" };

  const { error } = await supabase.from("diagnosis_categories").delete().eq("id", id);
  if (error) {
    console.error("[deleteDiagnosisCategoryAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer le diagnostic" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "DiagnosisCategory", entityId: id });

  revalidatePath("/consultations/diagnostics");
  return { success: "Diagnostic supprimé" };
}
