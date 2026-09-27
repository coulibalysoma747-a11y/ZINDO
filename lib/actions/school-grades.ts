"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { requireSchoolAccess, canAccessSubject, canAccessClass } from "@/lib/school-access";
import { computeClassReport, attendanceCounts } from "@/lib/school-report";
import { EVALUATION_KINDS, schoolYearStart, type EvaluationKind } from "@/lib/school-constants";

export type ActionState = { error?: string; success?: string } | undefined;

export type Evaluation = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  term: number;
  kind: EvaluationKind;
  title: string;
  day: string;
  maxScore: number;
  weight: number;
  locked: boolean;
  gradedCount: number;
};

const EVAL_SELECT =
  "id, classId:class_id, subjectId:subject_id, term, kind, title, day, maxScore:max_score, weight, locked, class:school_classes(name), subject:school_subjects(name), grades:school_grades(id)";

type RawEval = Omit<Evaluation, "className" | "subjectName" | "gradedCount"> & {
  class: { name: string } | null;
  subject: { name: string } | null;
  grades: { id: string }[];
};
const toEval = ({ class: c, subject: s, grades, ...e }: RawEval): Evaluation => ({
  ...e,
  className: c?.name ?? "?",
  subjectName: s?.name ?? "?",
  gradedCount: grades.length,
});

export async function getEvaluationsAction(filters: { classId?: string; term?: number }): Promise<Evaluation[]> {
  const access = await requireSchoolAccess("teach");
  let q = supabase.from("school_evaluations").select(EVAL_SELECT).eq("business_id", access.user.businessId).order("day", { ascending: false });
  if (filters.classId) q = q.eq("class_id", filters.classId);
  if (filters.term) q = q.eq("term", filters.term);
  const { data } = await q;
  return ((data ?? []) as unknown as RawEval[]).map(toEval).filter((e) => canAccessSubject(access, e.classId, e.subjectId));
}

const evalSchema = z.object({
  classId: z.string().min(1, "Choisissez une classe"),
  subjectId: z.string().min(1, "Choisissez une matière"),
  term: z.coerce.number().int().min(1).max(3),
  kind: z.enum(Object.keys(EVALUATION_KINDS) as [EvaluationKind, ...EvaluationKind[]]),
  title: z.string().trim().min(1, "Donnez un nom à l'évaluation"),
  day: z.string().min(1, "Date requise"),
  maxScore: z.coerce.number().positive("Barème invalide"),
  weight: z.coerce.number().positive("Poids invalide"),
});

export async function createEvaluationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const parsed = evalSchema.safeParse(Object.fromEntries(["classId", "subjectId", "term", "kind", "title", "day", "maxScore", "weight"].map((k) => [k, formData.get(k) ?? undefined])));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (!canAccessSubject(access, d.classId, d.subjectId)) return { error: "Vous n'enseignez pas cette matière dans cette classe" };
  const { data, error } = await supabase
    .from("school_evaluations")
    .insert({
      business_id: access.user.businessId,
      class_id: d.classId,
      subject_id: d.subjectId,
      term: d.term,
      kind: d.kind,
      title: d.title,
      day: d.day,
      max_score: d.maxScore,
      weight: d.weight,
      created_by: access.user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createEvaluationAction]", error?.message);
    return { error: "Impossible de créer l'évaluation" };
  }
  await logAction({ businessId: access.user.businessId, userId: access.user.id, action: "CREATE", entity: "SchoolEvaluation", entityId: data.id as string, details: d.title });
  redirect(`/ecole/notes/${data.id}`);
}

export async function getEvaluationSheetAction(evaluationId: string) {
  const access = await requireSchoolAccess("teach");
  const bid = access.user.businessId;
  const { data } = await supabase.from("school_evaluations").select(EVAL_SELECT).eq("id", evaluationId).eq("business_id", bid).maybeSingle();
  if (!data) return null;
  const evaluation = toEval(data as unknown as RawEval);
  if (!canAccessSubject(access, evaluation.classId, evaluation.subjectId)) return null;
  const [{ data: students }, { data: grades }] = await Promise.all([
    supabase.from("students").select("id, last_name, first_name").eq("business_id", bid).eq("class_id", evaluation.classId).eq("active", true).order("last_name").order("first_name"),
    supabase.from("school_grades").select("studentId:student_id, score, absent").eq("evaluation_id", evaluationId),
  ]);
  const byStudent = new Map(((grades ?? []) as { studentId: string; score: number | null; absent: boolean }[]).map((g) => [g.studentId, g]));
  return {
    evaluation,
    isManager: access.isManager,
    rows: (students ?? []).map((s) => ({
      studentId: s.id as string,
      name: `${s.last_name} ${s.first_name}`,
      score: byStudent.get(s.id as string)?.score ?? null,
      absent: byStudent.get(s.id as string)?.absent ?? false,
    })),
  };
}

export async function saveGradesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const evaluationId = String(formData.get("evaluationId") || "");
  const sheet = await getEvaluationSheetAction(evaluationId);
  if (!sheet) return { error: "Évaluation introuvable" };
  const { evaluation } = sheet;
  if (evaluation.locked) return { error: "Les notes sont verrouillées : demandez à la direction de les déverrouiller" };

  const rows = [];
  const changes: string[] = [];
  for (const r of sheet.rows) {
    const raw = String(formData.get(`score_${r.studentId}`) ?? "").trim().replace(",", ".");
    const absent = formData.get(`absent_${r.studentId}`) === "on";
    if (!raw && !absent) continue;
    const score = raw ? Number(raw) : null;
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > evaluation.maxScore)) {
      return { error: `Note invalide pour ${r.name} (entre 0 et ${evaluation.maxScore})` };
    }
    if (r.score !== null && r.score !== score) changes.push(`${r.name} : ${r.score} → ${score ?? "absent"}`);
    rows.push({
      business_id: access.user.businessId,
      evaluation_id: evaluationId,
      student_id: r.studentId,
      score: absent ? null : score,
      absent,
      updated_by: access.user.id,
      updated_at: new Date().toISOString(),
    });
  }
  if (rows.length === 0) return { error: "Aucune note saisie" };
  const { error } = await supabase.from("school_grades").upsert(rows, { onConflict: "evaluation_id,student_id" });
  if (error) {
    console.error("[saveGradesAction]", error.message);
    return { error: "Impossible d'enregistrer les notes" };
  }
  // Historique des modifications : chaque note changée est tracée dans le journal.
  await logAction({
    businessId: access.user.businessId,
    userId: access.user.id,
    action: "UPDATE",
    entity: "SchoolGrades",
    entityId: evaluationId,
    details: `${evaluation.title} · ${rows.length} notes${changes.length ? ` · modifiées : ${changes.join(" ; ")}` : ""}`.slice(0, 1000),
  });
  revalidatePath(`/ecole/notes/${evaluationId}`);
  return { success: `${rows.length} note(s) enregistrée(s)` };
}

export async function setEvaluationLockedAction(evaluationId: string, locked: boolean): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const sheet = await getEvaluationSheetAction(evaluationId);
  if (!sheet) return { error: "Évaluation introuvable" };
  // L'enseignant peut verrouiller ; seule la direction peut déverrouiller.
  if (!locked && !access.isManager) return { error: "Seule la direction peut déverrouiller les notes" };
  const { error } = await supabase.from("school_evaluations").update({ locked }).eq("id", evaluationId).eq("business_id", access.user.businessId);
  if (error) return { error: "Impossible de modifier le verrouillage" };
  await logAction({ businessId: access.user.businessId, userId: access.user.id, action: "UPDATE", entity: "SchoolEvaluation", entityId: evaluationId, details: locked ? "notes verrouillées" : "notes déverrouillées" });
  revalidatePath(`/ecole/notes/${evaluationId}`);
  return { success: locked ? "Notes verrouillées" : "Notes déverrouillées" };
}

export async function deleteEvaluationAction(evaluationId: string): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const sheet = await getEvaluationSheetAction(evaluationId);
  if (!sheet) return { error: "Évaluation introuvable" };
  if (sheet.evaluation.locked) return { error: "Déverrouillez d'abord les notes" };
  if (!access.isManager && sheet.evaluation.gradedCount > 0) return { error: "Des notes sont saisies : seule la direction peut supprimer cette évaluation" };
  const { error } = await supabase.from("school_evaluations").delete().eq("id", evaluationId).eq("business_id", access.user.businessId);
  if (error) return { error: "Impossible de supprimer l'évaluation" };
  await logAction({ businessId: access.user.businessId, userId: access.user.id, action: "DELETE", entity: "SchoolEvaluation", entityId: evaluationId, details: sheet.evaluation.title });
  revalidatePath("/ecole/notes");
  return { success: "Évaluation supprimée" };
}

// ---------------------------------------------------------------------------
// Bulletins
// ---------------------------------------------------------------------------

export async function getClassReportAction(classId: string, term: number) {
  const access = await requireSchoolAccess("teach");
  if (!canAccessClass(access, classId)) return null;
  return computeClassReport(access.user.businessId, classId, term);
}


export async function saveReportNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const studentId = String(formData.get("studentId") || "");
  const term = Number(formData.get("term"));
  if (!studentId || ![1, 2, 3].includes(term)) return { error: "Données invalides" };
  const { error } = await supabase.from("school_report_notes").upsert(
    {
      business_id: access.user.businessId,
      student_id: studentId,
      term,
      appreciation: String(formData.get("appreciation") || "") || null,
      decision: String(formData.get("decision") || "") || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,term" }
  );
  if (error) return { error: "Impossible d'enregistrer l'appréciation" };
  revalidatePath(`/ecole/bulletins/${studentId}`);
  return { success: "Appréciation enregistrée" };
}

/**
 * Données complètes des bulletins d'une classe pour un trimestre (un seul
 * élève si studentId est donné) : moyennes, rangs, absences, appréciations.
 */
export async function getReportCardsAction(params: { classId?: string; studentId?: string; term: number }) {
  const access = await requireSchoolAccess("manage");
  const bid = access.user.businessId;
  let classId = params.classId;
  if (params.studentId) {
    const { data } = await supabase.from("students").select("class_id").eq("id", params.studentId).eq("business_id", bid).maybeSingle();
    classId = (data?.class_id as string | null | undefined) ?? undefined;
  }
  if (!classId) return null;
  const report = await computeClassReport(bid, classId, params.term);
  if (!report) return null;
  const students = params.studentId ? report.students.filter((s) => s.studentId === params.studentId) : report.students;
  const ids = students.map((s) => s.studentId);
  const [attendance, { data: notes }] = await Promise.all([
    attendanceCounts(bid, ids, schoolYearStart()),
    ids.length
      ? supabase.from("school_report_notes").select("studentId:student_id, appreciation, decision").eq("business_id", bid).eq("term", params.term).in("student_id", ids)
      : Promise.resolve({ data: [] }),
  ]);
  const b = access.user.business;
  return {
    classId,
    report: { ...report, students },
    attendance,
    notes: Object.fromEntries(((notes ?? []) as { studentId: string; appreciation: string | null; decision: string | null }[]).map((n) => [n.studentId, n])),
    school: { name: b.name, logoUrl: b.logoUrl ?? null, address: b.address ?? null, city: b.city ?? null, phone: b.phone ?? null },
  };
}
