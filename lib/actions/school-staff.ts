"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { requireSchoolAccess } from "@/lib/school-access";

export type ActionState = { error?: string; success?: string } | undefined;

export type Teacher = {
  id: string;
  userId: string | null;
  userName: string | null;
  lastName: string;
  firstName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  function: string | null;
  hireDate: string | null;
  active: boolean;
  /** « Mathématiques (6e A), Physique (5e B) » */
  assignments: string[];
};

async function manager() {
  return (await requireSchoolAccess("manage")).user;
}

// ---------------------------------------------------------------------------
// Enseignants
// ---------------------------------------------------------------------------

export async function getTeachersAction(): Promise<Teacher[]> {
  const user = await manager();
  const [{ data }, { data: cs }] = await Promise.all([
    supabase
      .from("school_teachers")
      .select("id, userId:user_id, lastName:last_name, firstName:first_name, phone, whatsapp, email, function, hireDate:hire_date, active, user:users(first_name, last_name)")
      .eq("business_id", user.businessId)
      .order("last_name")
      .order("first_name"),
    supabase
      .from("school_class_subjects")
      .select("teacherId:teacher_id, subject:school_subjects(name), class:school_classes(name)")
      .eq("business_id", user.businessId)
      .not("teacher_id", "is", null),
  ]);
  const byTeacher = new Map<string, string[]>();
  for (const r of (cs ?? []) as unknown as { teacherId: string; subject: { name: string } | null; class: { name: string } | null }[]) {
    byTeacher.set(r.teacherId, [...(byTeacher.get(r.teacherId) ?? []), `${r.subject?.name ?? "?"} (${r.class?.name ?? "?"})`]);
  }
  return ((data ?? []) as unknown as (Omit<Teacher, "userName" | "assignments"> & { user: { first_name: string; last_name: string } | null })[]).map(
    ({ user: u, ...t }) => ({ ...t, userName: u ? `${u.first_name} ${u.last_name}` : null, assignments: (byTeacher.get(t.id) ?? []).sort() })
  );
}

/** Comptes ZINDO de l'établissement, pour relier une fiche enseignant à un compte. */
export async function getSchoolUsersAction() {
  const user = await manager();
  const { data } = await supabase.from("users").select("id, first_name, last_name, phone").eq("business_id", user.businessId).eq("active", true).order("first_name");
  return (data ?? []).map((u) => ({ id: u.id as string, name: `${u.first_name} ${u.last_name}`, phone: u.phone as string | null }));
}

const teacherSchema = z.object({
  lastName: z.string().trim().min(1, "Le nom est requis"),
  firstName: z.string().trim().min(1, "Le prénom est requis"),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email("E-mail invalide").optional(),
  function: z.string().trim().optional(),
  hireDate: z.string().optional(),
  userId: z.string().optional(),
});

export async function saveTeacherAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await manager();
  const get = (k: string) => formData.get(k) || undefined;
  const parsed = teacherSchema.safeParse({
    lastName: formData.get("lastName"),
    firstName: formData.get("firstName"),
    phone: get("phone"),
    whatsapp: get("whatsapp"),
    email: get("email"),
    function: get("function"),
    hireDate: get("hireDate"),
    userId: get("userId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const id = String(formData.get("id") || "");

  if (d.userId) {
    let q = supabase.from("school_teachers").select("id").eq("business_id", user.businessId).eq("user_id", d.userId);
    if (id) q = q.neq("id", id);
    const { data: other } = await q.limit(1);
    if (other?.length) return { error: "Ce compte ZINDO est déjà relié à un autre enseignant" };
  }

  const row = {
    last_name: d.lastName.toUpperCase(),
    first_name: d.firstName,
    phone: d.phone ?? null,
    whatsapp: d.whatsapp ?? null,
    email: d.email ?? null,
    function: d.function ?? null,
    hire_date: d.hireDate ?? null,
    user_id: d.userId ?? null,
    active: formData.get("active") !== "off",
  };
  const { error } = id
    ? await supabase.from("school_teachers").update(row).eq("id", id).eq("business_id", user.businessId)
    : await supabase.from("school_teachers").insert({ ...row, business_id: user.businessId });
  if (error) {
    console.error("[saveTeacherAction]", error.message);
    return { error: "Impossible d'enregistrer l'enseignant" };
  }
  await logAction({ businessId: user.businessId, userId: user.id, action: id ? "UPDATE" : "CREATE", entity: "SchoolTeacher", entityId: id || undefined, details: `${row.last_name} ${row.first_name}` });
  revalidatePath("/ecole/enseignants");
  return { success: id ? "Enseignant modifié" : "Enseignant ajouté" };
}

export async function deleteTeacherAction(id: string): Promise<ActionState> {
  const user = await manager();
  const { error } = await supabase.from("school_teachers").delete().eq("id", id).eq("business_id", user.businessId);
  if (error) return { error: "Impossible de supprimer l'enseignant" };
  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "SchoolTeacher", entityId: id });
  revalidatePath("/ecole/enseignants");
  return { success: "Enseignant supprimé" };
}

// ---------------------------------------------------------------------------
// Matières
// ---------------------------------------------------------------------------

export async function getSubjectsAction() {
  const user = await manager();
  const { data } = await supabase.from("school_subjects").select("id, name, classes:school_class_subjects(id)").eq("business_id", user.businessId).order("name");
  return ((data ?? []) as unknown as { id: string; name: string; classes: { id: string }[] }[]).map((s) => ({ id: s.id, name: s.name, classCount: s.classes.length }));
}

export async function saveSubjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await manager();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Le nom de la matière est requis" };
  const id = String(formData.get("id") || "");
  let dup = supabase.from("school_subjects").select("id").eq("business_id", user.businessId).ilike("name", name);
  if (id) dup = dup.neq("id", id);
  const { data: other } = await dup.limit(1);
  if (other?.length) return { error: "Cette matière existe déjà" };
  const { error } = id
    ? await supabase.from("school_subjects").update({ name }).eq("id", id).eq("business_id", user.businessId)
    : await supabase.from("school_subjects").insert({ name, business_id: user.businessId });
  if (error) return { error: "Impossible d'enregistrer la matière" };
  await logAction({ businessId: user.businessId, userId: user.id, action: id ? "UPDATE" : "CREATE", entity: "SchoolSubject", entityId: id || undefined, details: name });
  revalidatePath("/ecole/matieres");
  return { success: id ? "Matière modifiée" : "Matière ajoutée" };
}

export async function deleteSubjectAction(id: string): Promise<ActionState> {
  const user = await manager();
  const { count } = await supabase.from("school_evaluations").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("subject_id", id);
  if ((count ?? 0) > 0) return { error: "Des notes existent pour cette matière : elle ne peut pas être supprimée" };
  const { error } = await supabase.from("school_subjects").delete().eq("id", id).eq("business_id", user.businessId);
  if (error) return { error: "Impossible de supprimer la matière" };
  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "SchoolSubject", entityId: id });
  revalidatePath("/ecole/matieres");
  return { success: "Matière supprimée" };
}

// ---------------------------------------------------------------------------
// Matières d'une classe (coefficient + enseignant) et professeur principal
// ---------------------------------------------------------------------------

const classSubjectSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1, "Choisissez une matière"),
  teacherId: z.string().optional(),
  coefficient: z.coerce.number().positive("Coefficient invalide").max(20, "Coefficient invalide"),
});

export async function saveClassSubjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await manager();
  const parsed = classSubjectSchema.safeParse({
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId"),
    teacherId: formData.get("teacherId") || undefined,
    coefficient: formData.get("coefficient") || 1,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const { error } = await supabase
    .from("school_class_subjects")
    .upsert(
      { business_id: user.businessId, class_id: d.classId, subject_id: d.subjectId, teacher_id: d.teacherId ?? null, coefficient: d.coefficient },
      { onConflict: "class_id,subject_id" }
    );
  if (error) {
    console.error("[saveClassSubjectAction]", error.message);
    return { error: "Impossible d'enregistrer la matière de la classe" };
  }
  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "SchoolClassSubject", entityId: d.classId, details: `${d.subjectId} · coef ${d.coefficient}` });
  revalidatePath(`/ecole/classes/${d.classId}`);
  return { success: "Matière enregistrée pour la classe" };
}

export async function deleteClassSubjectAction(id: string, classId: string): Promise<ActionState> {
  const user = await manager();
  const { error } = await supabase.from("school_class_subjects").delete().eq("id", id).eq("business_id", user.businessId);
  if (error) return { error: "Impossible de retirer la matière" };
  await logAction({ businessId: user.businessId, userId: user.id, action: "DELETE", entity: "SchoolClassSubject", entityId: id });
  revalidatePath(`/ecole/classes/${classId}`);
  return { success: "Matière retirée de la classe" };
}

export async function setMainTeacherAction(classId: string, teacherId: string | null): Promise<ActionState> {
  const user = await manager();
  const { error } = await supabase.from("school_classes").update({ main_teacher_id: teacherId }).eq("id", classId).eq("business_id", user.businessId);
  if (error) return { error: "Impossible d'enregistrer le professeur principal" };
  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "SchoolClass", entityId: classId, details: `professeur principal ${teacherId ?? "aucun"}` });
  revalidatePath(`/ecole/classes/${classId}`);
  return { success: "Professeur principal enregistré" };
}
