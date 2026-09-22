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

export type PosologyPreset = { id: string; label: string };

/** Même garde que le reste du module Consultations — voir lib/actions/medical-acts.ts. */
async function requirePosologyPresetsAccess() {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");
  if (!(await isConsultationsModuleEnabled(user.businessId))) redirect("/dashboard");
  return user;
}

export async function getPosologyPresetsAction(): Promise<PosologyPreset[]> {
  const user = await requirePosologyPresetsAccess();
  const { data } = await supabase
    .from("posology_presets")
    .select("id, label")
    .eq("business_id", user.businessId)
    .order("label", { ascending: true });
  return (data ?? []) as unknown as PosologyPreset[];
}

const presetSchema = z.object({ label: z.string().min(1, "Le libellé est requis") });

/** Préréglage existant (insensible à la casse) ou création à la volée — utilisé depuis l'ordonnance du formulaire de consultation. */
export async function getOrCreatePosologyPresetByNameAction(label: string): Promise<{ id: string } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  const trimmed = label.trim();
  if (!trimmed) return { error: "Posologie vide" };

  const { data: existing } = await supabase
    .from("posology_presets")
    .select("id")
    .eq("business_id", user.businessId)
    .ilike("label", trimmed)
    .maybeSingle();
  if (existing) return { id: existing.id as string };

  const { data: preset, error } = await supabase
    .from("posology_presets")
    .insert({ business_id: user.businessId, label: trimmed })
    .select("id")
    .single();
  if (error || !preset) return { error: "Impossible d'enregistrer la posologie" };
  return { id: preset.id as string };
}

export async function createPosologyPresetAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePosologyPresetsAccess();
  const parsed = presetSchema.safeParse({ label: formData.get("label") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase
    .from("posology_presets")
    .select("id")
    .eq("business_id", user.businessId)
    .ilike("label", parsed.data.label)
    .maybeSingle();
  if (existing) return { error: "Cette posologie existe déjà" };

  const { data: preset, error } = await supabase
    .from("posology_presets")
    .insert({ business_id: user.businessId, label: parsed.data.label })
    .select("id")
    .single();
  if (error || !preset) {
    console.error("[createPosologyPresetAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la posologie" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "PosologyPreset", entityId: preset.id as string });

  revalidatePath("/consultations/posologies");
  return { success: "Posologie créée" };
}

export async function updatePosologyPresetAction(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePosologyPresetsAccess();
  const parsed = presetSchema.safeParse({ label: formData.get("label") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: preset } = await supabase
    .from("posology_presets")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!preset) return { error: "Posologie introuvable" };

  const { error } = await supabase.from("posology_presets").update({ label: parsed.data.label }).eq("id", id);
  if (error) {
    console.error("[updatePosologyPresetAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la posologie" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "PosologyPreset", entityId: id });

  revalidatePath("/consultations/posologies");
  return { success: "Posologie mise à jour" };
}

export async function deletePosologyPresetAction(id: string): Promise<ActionState> {
  const user = await requirePosologyPresetsAccess();

  const { data: preset } = await supabase
    .from("posology_presets")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!preset) return { error: "Posologie introuvable" };

  const { error } = await supabase.from("posology_presets").delete().eq("id", id);
  if (error) {
    console.error("[deletePosologyPresetAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer la posologie" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "PosologyPreset", entityId: id });

  revalidatePath("/consultations/posologies");
  return { success: "Posologie supprimée" };
}
