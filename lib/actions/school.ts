"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { logAction } from "@/lib/audit";
import { SCHOOL_ACTIVITY_KEY, SCHOOL_FLAG } from "@/lib/nav";

/**
 * École (étape 1) : classes, élèves et scolarité payée par tranches.
 * Désactivée par défaut (flag gestion_scolaire) et jamais visible hors de
 * l'activité « ecole » — voir la règle du memory « Feature rollout rule ».
 */

export type ActionState = { error?: string; success?: string } | undefined;

export type SchoolClass = { id: string; name: string; level: string | null; annualFee: number; studentCount: number };

export type StudentRow = {
  id: string;
  matricule: string | null;
  lastName: string;
  firstName: string;
  sex: string | null;
  birthDate: string | null;
  parentName: string | null;
  parentPhone: string | null;
  customFee: number | null;
  active: boolean;
  classId: string | null;
  className: string | null;
  fee: number;
  paid: number;
  remaining: number;
};

export type StudentPayment = { id: string; number: string; amount: number; method: string; note: string | null; paidAt: string };

/** Vérifie l'accès au module et renvoie l'utilisateur ; redirige sinon. */
async function requireSchool() {
  const user = await requirePermission(PERMISSIONS.SCHOOL_MANAGE);
  await registerFeatureFlag(
    SCHOOL_FLAG,
    "Gestion scolaire (école)",
    "Élèves, classes, frais de scolarité par tranches, impayés et reçus pour les écoles."
  );
  if (user.business.activityKey !== SCHOOL_ACTIVITY_KEY) redirect("/dashboard");
  if (!(await isFeatureEnabled(SCHOOL_FLAG, user.businessId))) redirect("/dashboard");
  return user;
}

export async function getSchoolContextAction() {
  const user = await requireSchool();
  const b = user.business;
  return { currency: b.currency, businessName: b.name, phone: b.phone ?? null, address: b.address ?? null, city: b.city ?? null, logoUrl: b.logoUrl ?? null };
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export async function getSchoolClassesAction(): Promise<SchoolClass[]> {
  const user = await requireSchool();
  const { data } = await supabase
    .from("school_classes")
    .select("id, name, level, annualFee:annual_fee, students(id, active)")
    .eq("business_id", user.businessId)
    .order("name");
  return ((data ?? []) as unknown as (Omit<SchoolClass, "studentCount"> & { students: { active: boolean }[] })[]).map(
    ({ students, ...c }) => ({ ...c, studentCount: students.filter((s) => s.active).length })
  );
}

const classSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la classe est requis"),
  level: z.string().trim().optional(),
  annualFee: z.coerce.number().min(0, "Montant invalide"),
});

export async function saveSchoolClassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSchool();
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level") || undefined,
    annualFee: formData.get("annualFee") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const id = String(formData.get("id") || "");
  const row = { name: parsed.data.name, level: parsed.data.level ?? null, annual_fee: parsed.data.annualFee };

  const { error } = id
    ? await supabase.from("school_classes").update(row).eq("id", id).eq("business_id", user.businessId)
    : await supabase.from("school_classes").insert({ ...row, business_id: user.businessId });
  if (error) {
    console.error("[saveSchoolClassAction]", error.message);
    return { error: "Impossible d'enregistrer la classe" };
  }
  await logAction({ businessId: user.businessId, userId: user.id, action: id ? "UPDATE" : "CREATE", entity: "SchoolClass", entityId: id || undefined, details: row.name });
  revalidatePath("/ecole/classes");
  return { success: id ? "Classe modifiée" : "Classe créée" };
}

export async function deleteSchoolClassAction(id: string): Promise<ActionState> {
  const user = await requireSchool();
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .eq("class_id", id);
  if ((count ?? 0) > 0) return { error: "Cette classe contient des élèves : changez-les de classe d'abord" };
  const { error } = await supabase.from("school_classes").delete().eq("id", id).eq("business_id", user.businessId);
  if (error) return { error: "Impossible de supprimer la classe" };
  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "SchoolClass", entityId: id });
  revalidatePath("/ecole/classes");
  return { success: "Classe supprimée" };
}

// ---------------------------------------------------------------------------
// Élèves
// ---------------------------------------------------------------------------

type RawStudent = Omit<StudentRow, "className" | "fee" | "paid" | "remaining"> & {
  class: { name: string; annualFee: number } | null;
  payments: { amount: number }[];
};

const STUDENT_SELECT =
  "id, matricule, lastName:last_name, firstName:first_name, sex, birthDate:birth_date, parentName:parent_name, parentPhone:parent_phone, customFee:custom_fee, active, classId:class_id, class:school_classes(name, annualFee:annual_fee), payments:student_payments(amount)";

function toStudentRow({ class: cls, payments, ...s }: RawStudent): StudentRow {
  const fee = s.customFee ?? cls?.annualFee ?? 0;
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return { ...s, className: cls?.name ?? null, fee, paid, remaining: Math.max(0, fee - paid) };
}

export async function getStudentsAction(): Promise<StudentRow[]> {
  const user = await requireSchool();
  const { data } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .eq("business_id", user.businessId)
    .order("last_name")
    .order("first_name");
  return ((data ?? []) as unknown as RawStudent[]).map(toStudentRow);
}

export async function getStudentAction(id: string): Promise<{ student: StudentRow; payments: StudentPayment[] } | null> {
  const user = await requireSchool();
  const { data } = await supabase.from("students").select(STUDENT_SELECT).eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!data) return null;
  const { data: payments } = await supabase
    .from("student_payments")
    .select("id, number, amount, method, note, paidAt:paid_at")
    .eq("student_id", id)
    .eq("business_id", user.businessId)
    .order("paid_at", { ascending: false });
  return { student: toStudentRow(data as unknown as RawStudent), payments: (payments ?? []) as StudentPayment[] };
}

const studentSchema = z.object({
  lastName: z.string().trim().min(1, "Le nom est requis"),
  firstName: z.string().trim().min(1, "Le prénom est requis"),
  matricule: z.string().trim().optional(),
  classId: z.string().optional(),
  sex: z.enum(["M", "F"]).optional(),
  birthDate: z.string().optional(),
  parentName: z.string().trim().optional(),
  parentPhone: z.string().trim().optional(),
  customFee: z.coerce.number().min(0, "Montant invalide").optional(),
});

export async function saveStudentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSchool();
  const get = (k: string) => formData.get(k) || undefined;
  const parsed = studentSchema.safeParse({
    lastName: formData.get("lastName"),
    firstName: formData.get("firstName"),
    matricule: get("matricule"),
    classId: get("classId"),
    sex: get("sex"),
    birthDate: get("birthDate"),
    parentName: get("parentName"),
    parentPhone: get("parentPhone"),
    customFee: get("customFee"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const id = String(formData.get("id") || "");
  const row = {
    last_name: d.lastName.toUpperCase(),
    first_name: d.firstName,
    matricule: d.matricule ?? null,
    class_id: d.classId ?? null,
    sex: d.sex ?? null,
    birth_date: d.birthDate ?? null,
    parent_name: d.parentName ?? null,
    parent_phone: d.parentPhone ?? null,
    custom_fee: d.customFee ?? null,
    active: formData.get("active") !== "off",
  };

  let studentId = id;
  if (id) {
    const { error } = await supabase.from("students").update(row).eq("id", id).eq("business_id", user.businessId);
    if (error) return { error: "Impossible d'enregistrer l'élève" };
  } else {
    const { data, error } = await supabase.from("students").insert({ ...row, business_id: user.businessId }).select("id").single();
    if (error || !data) {
      console.error("[saveStudentAction]", error?.message);
      return { error: "Impossible d'enregistrer l'élève" };
    }
    studentId = data.id as string;
  }
  await logAction({ businessId: user.businessId, userId: user.id, action: id ? "UPDATE" : "CREATE", entity: "Student", entityId: studentId, details: `${row.last_name} ${row.first_name}` });
  revalidatePath("/ecole/eleves");
  redirect(`/ecole/eleves/${studentId}`);
}

export async function deleteStudentAction(id: string): Promise<ActionState> {
  const user = await requireSchool();
  const { count } = await supabase
    .from("student_payments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .eq("student_id", id);
  if ((count ?? 0) > 0) return { error: "Cet élève a des paiements : marquez-le plutôt comme parti (inactif)" };
  const { error } = await supabase.from("students").delete().eq("id", id).eq("business_id", user.businessId);
  if (error) return { error: "Impossible de supprimer l'élève" };
  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "Student", entityId: id });
  revalidatePath("/ecole/eleves");
  return { success: "Élève supprimé" };
}

// ---------------------------------------------------------------------------
// Paiements de scolarité
// ---------------------------------------------------------------------------

const paymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.coerce.number().positive("Le montant doit être supérieur à 0"),
  method: z.enum(["ESPECES", "MOBILE_MONEY", "VIREMENT", "AUTRE"]),
  note: z.string().trim().optional(),
});

export async function addStudentPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSchool();
  const parsed = paymentSchema.safeParse({
    studentId: formData.get("studentId"),
    amount: formData.get("amount"),
    method: formData.get("method") || "ESPECES",
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const current = await getStudentAction(d.studentId);
  if (!current) return { error: "Élève introuvable" };
  if (d.amount > current.student.remaining + 0.001) {
    return { error: `Le montant dépasse le reste à payer (${current.student.remaining})` };
  }

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("student_payments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .like("number", `SCO-${year}-%`);
  let seq = (count ?? 0) + 1;
  // Numéro unique par commerce : en cas de collision (deux paiements au même
  // instant), on essaie le suivant.
  for (let attempt = 0; attempt < 5; attempt++, seq++) {
    const number = `SCO-${year}-${String(seq).padStart(4, "0")}`;
    const { data, error } = await supabase
      .from("student_payments")
      .insert({ business_id: user.businessId, student_id: d.studentId, number, amount: d.amount, method: d.method, note: d.note ?? null, user_id: user.id })
      .select("id")
      .single();
    if (!error && data) {
      await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "StudentPayment", entityId: data.id as string, details: `${number} · ${d.amount}` });
      revalidatePath(`/ecole/eleves/${d.studentId}`);
      revalidatePath("/ecole/impayes");
      return { success: `Paiement ${number} enregistré` };
    }
    if (error?.code !== "23505") {
      console.error("[addStudentPaymentAction]", error?.message);
      break;
    }
  }
  return { error: "Impossible d'enregistrer le paiement" };
}

export async function deleteStudentPaymentAction(id: string, studentId: string): Promise<ActionState> {
  const user = await requireSchool();
  const { error } = await supabase.from("student_payments").delete().eq("id", id).eq("business_id", user.businessId);
  if (error) return { error: "Impossible d'annuler le paiement" };
  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "StudentPayment", entityId: id });
  revalidatePath(`/ecole/eleves/${studentId}`);
  revalidatePath("/ecole/impayes");
  return { success: "Paiement annulé" };
}

export async function getStudentPaymentAction(paymentId: string) {
  const user = await requireSchool();
  const { data } = await supabase
    .from("student_payments")
    .select("id, number, amount, method, note, paidAt:paid_at, studentId:student_id")
    .eq("id", paymentId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  return data as (StudentPayment & { studentId: string }) | null;
}
