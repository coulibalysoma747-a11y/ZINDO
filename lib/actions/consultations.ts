"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { CONSULTATIONS_FLAG } from "@/lib/nav";
import { SEX_OPTIONS, AGE_GROUP_OPTIONS } from "@/lib/consultation-constants";

export type ActionState = { error?: string } | undefined;

/**
 * Consultations (cabinet médical) : nouvelle fonctionnalité, désactivée par
 * défaut tant qu'elle n'est pas explicitement activée depuis
 * /admin/fonctionnalites — voir la règle du memory "Feature rollout rule".
 * N'est de toute façon jamais visible hors de l'activité "cabinet_medical".
 */
export async function ensureConsultationsFlagRegistered() {
  await registerFeatureFlag(
    CONSULTATIONS_FLAG,
    "Consultations (cabinet médical)",
    "Registre des consultations, statistiques épidémiologiques et bilan financier pour les cabinets médicaux et cliniques."
  );
}

export async function isConsultationsModuleEnabled(businessId: string) {
  return isFeatureEnabled(CONSULTATIONS_FLAG, businessId);
}

const consultationSchema = z.object({
  patientCode: z.string().optional(),
  sex: z.enum(SEX_OPTIONS, { message: "Sexe requis" }),
  ageGroup: z.enum(AGE_GROUP_OPTIONS, { message: "Tranche d'âge requise" }),
  actId: z.string().optional(),
  diagnosis: z.string().min(1, "Diagnostic requis"),
  treatment: z.string().optional(),
  fee: z.coerce.number().min(0, "Montant invalide"),
});

export async function createConsultationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);

  const parsed = consultationSchema.safeParse({
    patientCode: formData.get("patientCode") || undefined,
    sex: formData.get("sex"),
    ageGroup: formData.get("ageGroup"),
    actId: formData.get("actId") || undefined,
    diagnosis: formData.get("diagnosis"),
    treatment: formData.get("treatment") || undefined,
    fee: formData.get("fee") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  let actId: string | null = null;
  if (parsed.data.actId) {
    const { data: act } = await supabase
      .from("medical_acts")
      .select("id")
      .eq("id", parsed.data.actId)
      .eq("business_id", user.businessId)
      .maybeSingle();
    if (!act) return { error: "Acte médical introuvable" };
    actId = act.id as string;
  }

  const { error } = await supabase.from("consultations").insert({
    business_id: user.businessId,
    user_id: user.id,
    patient_code: parsed.data.patientCode || null,
    sex: parsed.data.sex,
    age_group: parsed.data.ageGroup,
    act_id: actId,
    diagnosis: parsed.data.diagnosis,
    treatment: parsed.data.treatment || null,
    fee: parsed.data.fee,
  });
  if (error) {
    console.error("[createConsultationAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer la consultation" };
  }

  revalidatePath("/consultations");
  redirect("/consultations");
}

export type ConsultationReceipt = {
  ticketNumber: string;
  date: string;
  itemName: string;
  fee: number;
  cashierName: string;
};

/** Reçu de consultation imprimable (§3.2 du cahier des charges) — aucune identité nominative du patient n'y figure. */
export async function getConsultationReceiptAction(id: string): Promise<ConsultationReceipt | { error: string }> {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);

  const { data } = await supabase
    .from("consultations")
    .select("id, diagnosis, fee, createdAt:created_at, act:medical_acts(name), user:users(firstName:first_name, lastName:last_name)")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) return { error: "Consultation introuvable" };

  const row = data as unknown as {
    id: string;
    diagnosis: string;
    fee: number;
    createdAt: string;
    act: { name: string } | null;
    user: { firstName: string; lastName: string } | null;
  };

  return {
    ticketNumber: `CONS-${row.id.slice(0, 8).toUpperCase()}`,
    date: row.createdAt,
    itemName: row.act?.name ?? row.diagnosis,
    fee: row.fee,
    cashierName: row.user ? `${row.user.firstName} ${row.user.lastName}` : "",
  };
}
