import "server-only";
import { supabase } from "@/lib/supabase";

/**
 * Calcul des moyennes d'une classe pour un trimestre (bulletins).
 *
 * Moyenne d'une matière = moyenne pondérée (poids de l'évaluation) des notes
 * ramenées sur 20 ; les absences ne comptent pas. Moyenne générale =
 * Σ(moyenne × coefficient) / Σ(coefficients des matières notées).
 */
export type SubjectResult = {
  subjectId: string;
  name: string;
  coefficient: number;
  teacherName: string | null;
  average: number | null;
  classAverage: number | null;
  rank: number | null;
};

export type StudentReport = {
  studentId: string;
  name: string;
  matricule: string | null;
  subjects: SubjectResult[];
  average: number | null;
  rank: number | null;
};

export type ClassReport = {
  className: string;
  mainTeacher: string | null;
  studentCount: number;
  classAverage: number | null;
  best: number | null;
  worst: number | null;
  students: StudentReport[];
};

function ranks<T>(items: T[], value: (t: T) => number | null) {
  const sorted = items.map(value).filter((v): v is number => v !== null).sort((a, b) => b - a);
  return (t: T) => {
    const v = value(t);
    return v === null ? null : sorted.findIndex((x) => x === v) + 1;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function computeClassReport(businessId: string, classId: string, term: number): Promise<ClassReport | null> {
  const [{ data: cls }, { data: cs }, { data: students }, { data: evals }] = await Promise.all([
    supabase.from("school_classes").select("name, teacher:school_teachers(last_name, first_name)").eq("id", classId).eq("business_id", businessId).maybeSingle(),
    supabase
      .from("school_class_subjects")
      .select("subjectId:subject_id, coefficient, subject:school_subjects(name), teacher:school_teachers(last_name, first_name)")
      .eq("business_id", businessId)
      .eq("class_id", classId),
    supabase.from("students").select("id, last_name, first_name, matricule").eq("business_id", businessId).eq("class_id", classId).eq("active", true).order("last_name").order("first_name"),
    supabase.from("school_evaluations").select("id, subjectId:subject_id, maxScore:max_score, weight").eq("business_id", businessId).eq("class_id", classId).eq("term", term),
  ]);
  if (!cls) return null;

  const evalList = (evals ?? []) as { id: string; subjectId: string; maxScore: number; weight: number }[];
  const { data: grades } = evalList.length
    ? await supabase.from("school_grades").select("evaluationId:evaluation_id, studentId:student_id, score, absent").in("evaluation_id", evalList.map((e) => e.id))
    : { data: [] };
  const evalById = new Map(evalList.map((e) => [e.id, e]));

  // Somme pondérée par élève et par matière.
  const acc = new Map<string, { sum: number; weight: number }>();
  for (const g of (grades ?? []) as { evaluationId: string; studentId: string; score: number | null; absent: boolean }[]) {
    const e = evalById.get(g.evaluationId);
    if (!e || g.absent || g.score === null) continue;
    const key = `${g.studentId}|${e.subjectId}`;
    const a = acc.get(key) ?? { sum: 0, weight: 0 };
    a.sum += (Number(g.score) / Number(e.maxScore)) * 20 * Number(e.weight);
    a.weight += Number(e.weight);
    acc.set(key, a);
  }

  const subjects = ((cs ?? []) as unknown as {
    subjectId: string;
    coefficient: number;
    subject: { name: string } | null;
    teacher: { last_name: string; first_name: string } | null;
  }[])
    .map((s) => ({
      subjectId: s.subjectId,
      name: s.subject?.name ?? "?",
      coefficient: Number(s.coefficient),
      teacherName: s.teacher ? `${s.teacher.last_name} ${s.teacher.first_name}` : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const studentList = (students ?? []) as { id: string; last_name: string; first_name: string; matricule: string | null }[];
  const avg = (studentId: string, subjectId: string) => {
    const a = acc.get(`${studentId}|${subjectId}`);
    return a && a.weight > 0 ? round2(a.sum / a.weight) : null;
  };

  const reports: StudentReport[] = studentList.map((st) => {
    let sum = 0;
    let coef = 0;
    const subj = subjects.map((s) => {
      const a = avg(st.id, s.subjectId);
      if (a !== null) {
        sum += a * s.coefficient;
        coef += s.coefficient;
      }
      return { ...s, average: a, classAverage: null as number | null, rank: null as number | null };
    });
    return { studentId: st.id, name: `${st.last_name} ${st.first_name}`, matricule: st.matricule, subjects: subj, average: coef > 0 ? round2(sum / coef) : null, rank: null };
  });

  // Rangs et moyennes de classe par matière.
  subjects.forEach((s, i) => {
    const values = reports.map((r) => r.subjects[i].average).filter((v): v is number => v !== null);
    const classAvg = values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null;
    const rankOf = ranks(reports, (r) => r.subjects[i].average);
    for (const r of reports) {
      r.subjects[i].classAverage = classAvg;
      r.subjects[i].rank = rankOf(r);
    }
  });
  const rankOf = ranks(reports, (r) => r.average);
  for (const r of reports) r.rank = rankOf(r);

  const generals = reports.map((r) => r.average).filter((v): v is number => v !== null);
  const teacher = (cls as unknown as { teacher: { last_name: string; first_name: string } | null }).teacher;
  return {
    className: cls.name as string,
    mainTeacher: teacher ? `${teacher.last_name} ${teacher.first_name}` : null,
    studentCount: reports.length,
    classAverage: generals.length ? round2(generals.reduce((a, b) => a + b, 0) / generals.length) : null,
    best: generals.length ? Math.max(...generals) : null,
    worst: generals.length ? Math.min(...generals) : null,
    students: reports,
  };
}

/** Absences, absences justifiées et retards depuis la rentrée, par élève. */
export async function attendanceCounts(businessId: string, studentIds: string[], since: string) {
  const out: Record<string, { absences: number; justified: number; retards: number }> = {};
  for (const id of studentIds) out[id] = { absences: 0, justified: 0, retards: 0 };
  if (studentIds.length === 0) return out;
  const { data } = await supabase
    .from("school_attendance")
    .select("studentId:student_id, status")
    .eq("business_id", businessId)
    .in("student_id", studentIds)
    .gte("day", since)
    .neq("status", "PRESENT");
  for (const r of (data ?? []) as { studentId: string; status: string }[]) {
    const e = out[r.studentId];
    if (!e) continue;
    if (r.status === "RETARD") e.retards++;
    else if (r.status === "JUSTIFIE") e.justified++;
    else e.absences++;
  }
  return out;
}
