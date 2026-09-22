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

export type MedicalAct = { id: string; name: string; defaultFee: number };

/**
 * Garde commune aux écrans/actions du catalogue d'actes : même règle que le
 * reste du module Consultations (activité + flag) — voir
 * lib/actions/consultations.ts et docs/cahier-des-charges-cabinet-medical.md.
 */
async function requireMedicalActsAccess() {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");
  if (!(await isConsultationsModuleEnabled(user.businessId))) redirect("/dashboard");
  return user;
}

export async function getMedicalActsAction(): Promise<MedicalAct[]> {
  const user = await requireMedicalActsAccess();
  const { data } = await supabase
    .from("medical_acts")
    .select("id, name, defaultFee:default_fee")
    .eq("business_id", user.businessId)
    .order("name", { ascending: true });
  return (data ?? []) as unknown as MedicalAct[];
}

const actSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  defaultFee: z.coerce.number().min(0, "Tarif invalide"),
});

export async function createMedicalActAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireMedicalActsAccess();
  const parsed = actSchema.safeParse({
    name: formData.get("name"),
    defaultFee: formData.get("defaultFee") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase
    .from("medical_acts")
    .select("id")
    .eq("business_id", user.businessId)
    .ilike("name", parsed.data.name)
    .maybeSingle();
  if (existing) return { error: "Cet acte existe déjà" };

  const { data: act, error } = await supabase
    .from("medical_acts")
    .insert({ business_id: user.businessId, name: parsed.data.name, default_fee: parsed.data.defaultFee })
    .select("id")
    .single();
  if (error || !act) {
    console.error("[createMedicalActAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer l'acte" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "MedicalAct", entityId: act.id as string });

  revalidatePath("/consultations/actes");
  return { success: "Acte créé" };
}

export async function updateMedicalActAction(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireMedicalActsAccess();
  const parsed = actSchema.safeParse({
    name: formData.get("name"),
    defaultFee: formData.get("defaultFee") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: act } = await supabase
    .from("medical_acts")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!act) return { error: "Acte introuvable" };

  const { error } = await supabase
    .from("medical_acts")
    .update({ name: parsed.data.name, default_fee: parsed.data.defaultFee })
    .eq("id", id);
  if (error) {
    console.error("[updateMedicalActAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour l'acte" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "MedicalAct", entityId: id });

  revalidatePath("/consultations/actes");
  return { success: "Acte mis à jour" };
}

export async function deleteMedicalActAction(id: string): Promise<ActionState> {
  const user = await requireMedicalActsAccess();

  const { data: act } = await supabase
    .from("medical_acts")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!act) return { error: "Acte introuvable" };

  const { error } = await supabase.from("medical_acts").delete().eq("id", id);
  if (error) {
    console.error("[deleteMedicalActAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer l'acte" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "MedicalAct", entityId: id });

  revalidatePath("/consultations/actes");
  return { success: "Acte supprimé" };
}
