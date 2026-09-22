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
import { generatePatientCode } from "@/lib/reference";

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
  patientName: z.string().optional(),
  patientAge: z.coerce.number().int().min(0, "Âge invalide").max(130, "Âge invalide").optional(),
  sex: z.enum(SEX_OPTIONS, { message: "Sexe requis" }),
  ageGroup: z.enum(AGE_GROUP_OPTIONS, { message: "Tranche d'âge requise" }),
  actId: z.string().optional(),
  diagnosis: z.string().min(1, "Diagnostic requis"),
  treatment: z.string().optional(),
  fee: z.coerce.number().min(0, "Montant invalide"),
  items: z.string().optional(),
});

// Une ligne d'ordonnance référence SOIT un produit du catalogue (productId),
// SOIT une description libre (customName, ex. "Paracétamol 1000 mg") quand le
// médecin prescrit un médicament qui n'existe pas dans son catalogue Produits
// — les deux façons de prescrire cohabitent, au choix du médecin (voir
// docs/cahier-des-charges-cabinet-medical.md §3.5).
const prescriptionItemSchema = z
  .object({
    productId: z.string().optional(),
    customName: z.string().optional(),
    quantity: z.coerce.number().int().positive(),
    posology: z.string().optional(),
  })
  .refine((i) => !!i.productId || !!i.customName?.trim(), { message: "Produit ou description requis" });

type PrescriptionItem = { productId?: string; customName?: string; quantity: number; posology?: string };

/** Parse le champ caché "items" (JSON) du formulaire — voir ConsultationForm. */
function parsePrescriptionItems(raw: string | undefined): PrescriptionItem[] | { error: string } {
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "Ordonnance invalide" };
  }
  if (!Array.isArray(json)) return { error: "Ordonnance invalide" };
  const items: PrescriptionItem[] = [];
  for (const entry of json) {
    const parsed = prescriptionItemSchema.safeParse(entry);
    if (!parsed.success) return { error: "Ordonnance invalide" };
    items.push(parsed.data);
  }
  return items;
}

export async function createConsultationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);

  const parsed = consultationSchema.safeParse({
    patientName: formData.get("patientName") || undefined,
    patientAge: formData.get("patientAge") || undefined,
    sex: formData.get("sex"),
    ageGroup: formData.get("ageGroup"),
    actId: formData.get("actId") || undefined,
    diagnosis: formData.get("diagnosis"),
    treatment: formData.get("treatment") || undefined,
    fee: formData.get("fee") || 0,
    items: formData.get("items") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const items = parsePrescriptionItems(parsed.data.items);
  if ("error" in items) return { error: items.error };

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

  const catalogProductIds = [...new Set(items.map((i) => i.productId).filter((id): id is string => !!id))];
  if (catalogProductIds.length > 0) {
    const { count: productCount } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("business_id", user.businessId)
      .in("id", catalogProductIds);
    if (productCount !== catalogProductIds.length) return { error: "Un des produits de l'ordonnance est introuvable" };
  }

  const patientCode = await generatePatientCode(user.businessId);

  const { data: consultation, error } = await supabase
    .from("consultations")
    .insert({
      business_id: user.businessId,
      user_id: user.id,
      patient_code: patientCode,
      patient_name: parsed.data.patientName || null,
      patient_age: parsed.data.patientAge ?? null,
      sex: parsed.data.sex,
      age_group: parsed.data.ageGroup,
      act_id: actId,
      diagnosis: parsed.data.diagnosis,
      treatment: parsed.data.treatment || null,
      fee: parsed.data.fee,
    })
    .select("id")
    .single();
  if (error || !consultation) {
    console.error("[createConsultationAction] Échec de l'enregistrement :", error?.message);
    return { error: "Impossible d'enregistrer la consultation" };
  }

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("consultation_items").insert(
      items.map((i) => ({
        consultation_id: consultation.id,
        product_id: i.productId || null,
        custom_name: i.productId ? null : i.customName!.trim(),
        quantity: i.quantity,
        posology: i.posology || null,
      }))
    );
    if (itemsError) console.error("[createConsultationAction] Échec de l'enregistrement de l'ordonnance :", itemsError.message);
  }

  revalidatePath("/consultations");
  redirect("/consultations");
}

export type Ordonnance = {
  id: string;
  number: string;
  date: string;
  patientCode: string | null;
  patientName: string | null;
  patientAge: number | null;
  sex: "M" | "F";
  diagnosis: string;
  doctorName: string;
  items: { productName: string; unit: string | null; quantity: number; posology: string | null }[];
};

/**
 * Ordonnance imprimable (§3.5 du cahier des charges) : purement informative,
 * ne touche jamais le stock — voir supabase/schema.sql::consultation_items.
 * Chaque ligne vient soit du catalogue Produits (product), soit d'une
 * description libre (custom_name) quand le médecin décrit un médicament hors
 * catalogue.
 */
export async function getConsultationOrdonnanceAction(id: string): Promise<Ordonnance | { error: string }> {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);

  const { data } = await supabase
    .from("consultations")
    .select(
      "id, diagnosis, createdAt:created_at, patientCode:patient_code, patientName:patient_name, patientAge:patient_age, sex, " +
        "user:users(firstName:first_name, lastName:last_name), " +
        "items:consultation_items(quantity, posology, customName:custom_name, product:products(name, unit))"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) return { error: "Consultation introuvable" };

  const row = data as unknown as {
    id: string;
    diagnosis: string;
    createdAt: string;
    patientCode: string | null;
    patientName: string | null;
    patientAge: number | null;
    sex: "M" | "F";
    user: { firstName: string; lastName: string } | null;
    items: { quantity: number; posology: string | null; customName: string | null; product: { name: string; unit: string } | null }[];
  };

  return {
    id: row.id,
    number: `ORD-${row.id.slice(0, 8).toUpperCase()}`,
    date: row.createdAt,
    patientCode: row.patientCode,
    patientName: row.patientName,
    patientAge: row.patientAge,
    sex: row.sex,
    diagnosis: row.diagnosis,
    doctorName: row.user ? `${row.user.firstName} ${row.user.lastName}` : "",
    items: row.items
      .filter((i) => i.product || i.customName)
      .map((i) => ({
        productName: i.product?.name ?? i.customName!,
        unit: i.product?.unit ?? null,
        quantity: i.quantity,
        posology: i.posology,
      })),
  };
}
