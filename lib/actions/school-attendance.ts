"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { requireSchoolAccess, canAccessClass } from "@/lib/school-access";
import { ATTENDANCE_STATUSES, schoolYearStart, type AttendanceStatus } from "@/lib/school-constants";

export type ActionState = { error?: string; success?: string } | undefined;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type RollCallRow = { studentId: string; name: string; status: AttendanceStatus | null; note: string | null };

/** Liste d'appel d'une classe pour un jour donné. */
export async function getRollCallAction(classId: string, day: string): Promise<RollCallRow[]> {
  const access = await requireSchoolAccess("teach");
  if (!canAccessClass(access, classId) || !DAY.test(day)) return [];
  const bid = access.user.businessId;
  const [{ data: students }, { data: marks }] = await Promise.all([
    supabase.from("students").select("id, last_name, first_name").eq("business_id", bid).eq("class_id", classId).eq("active", true).order("last_name").order("first_name"),
    supabase.from("school_attendance").select("student_id, status, note").eq("business_id", bid).eq("class_id", classId).eq("day", day),
  ]);
  const byStudent = new Map((marks ?? []).map((m) => [m.student_id as string, m]));
  return (students ?? []).map((s) => {
    const m = byStudent.get(s.id as string);
    return {
      studentId: s.id as string,
      name: `${s.last_name} ${s.first_name}`,
      status: (m?.status as AttendanceStatus | undefined) ?? null,
      note: (m?.note as string | null | undefined) ?? null,
    };
  });
}

export async function saveRollCallAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const classId = String(formData.get("classId") || "");
  const day = String(formData.get("day") || "");
  if (!DAY.test(day)) return { error: "Date invalide" };
  if (!canAccessClass(access, classId)) return { error: "Vous n'avez pas accès à cette classe" };
  const bid = access.user.businessId;

  const { data: students } = await supabase.from("students").select("id").eq("business_id", bid).eq("class_id", classId).eq("active", true);
  const rows = (students ?? [])
    .map((s) => {
      const status = String(formData.get(`status_${s.id}`) || "");
      if (!(status in ATTENDANCE_STATUSES)) return null;
      return {
        business_id: bid,
        student_id: s.id as string,
        class_id: classId,
        day,
        status,
        note: String(formData.get(`note_${s.id}`) || "") || null,
        user_id: access.user.id,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length === 0) return { error: "Aucun élève n'a été marqué" };

  const { error } = await supabase.from("school_attendance").upsert(rows, { onConflict: "student_id,day" });
  if (error) {
    console.error("[saveRollCallAction]", error.message);
    return { error: "Impossible d'enregistrer l'appel" };
  }
  const absents = rows.filter((r) => r.status !== "PRESENT").length;
  await logAction({ businessId: bid, userId: access.user.id, action: "UPDATE", entity: "SchoolAttendance", entityId: classId, details: `${day} · ${rows.length} élèves · ${absents} absents/retards` });
  revalidatePath("/ecole/presences");
  return { success: `Appel enregistré : ${rows.length} élèves, ${absents} absence(s) ou retard(s)` };
}

export type AttendanceStats = {
  today: { absents: number; retards: number };
  week: { absents: number; retards: number };
  month: { absents: number; retards: number };
  mostAbsent: { studentId: string; name: string; className: string | null; absences: number; retards: number }[];
};

/** Statistiques d'absences (limitées aux classes de l'enseignant). */
export async function getAttendanceStatsAction(): Promise<AttendanceStats> {
  const access = await requireSchoolAccess("teach");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = monday.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  let q = supabase
    .from("school_attendance")
    .select("day, status, studentId:student_id, classId:class_id, student:students(last_name, first_name, class:school_classes(name))")
    .eq("business_id", access.user.businessId)
    .gte("day", monthStart < weekStart ? monthStart : weekStart)
    .neq("status", "PRESENT");
  if (!access.isManager) q = q.in("class_id", access.classIds.length ? access.classIds : ["-"]);
  const { data } = await q;
  const rows = (data ?? []) as unknown as {
    day: string;
    status: AttendanceStatus;
    studentId: string;
    student: { last_name: string; first_name: string; class: { name: string } | null } | null;
  }[];

  const count = (from: string, to = today) => {
    const r = rows.filter((x) => x.day >= from && x.day <= to);
    return { absents: r.filter((x) => x.status === "ABSENT" || x.status === "JUSTIFIE").length, retards: r.filter((x) => x.status === "RETARD").length };
  };
  const per = new Map<string, AttendanceStats["mostAbsent"][number]>();
  for (const r of rows.filter((x) => x.day >= monthStart)) {
    const e = per.get(r.studentId) ?? {
      studentId: r.studentId,
      name: r.student ? `${r.student.last_name} ${r.student.first_name}` : "?",
      className: r.student?.class?.name ?? null,
      absences: 0,
      retards: 0,
    };
    if (r.status === "RETARD") e.retards++;
    else e.absences++;
    per.set(r.studentId, e);
  }
  return {
    today: count(today),
    week: count(weekStart),
    month: count(monthStart),
    mostAbsent: [...per.values()].sort((a, b) => b.absences - a.absences || b.retards - a.retards).slice(0, 10),
  };
}

/** Absences et retards d'un élève depuis la rentrée (fiche élève, bulletin). */
export async function getStudentAttendanceSummaryAction(studentId: string) {
  const access = await requireSchoolAccess("teach");
  const { data } = await supabase
    .from("school_attendance")
    .select("day, status, note, classId:class_id")
    .eq("business_id", access.user.businessId)
    .eq("student_id", studentId)
    .gte("day", schoolYearStart())
    .neq("status", "PRESENT")
    .order("day", { ascending: false });
  const rows = ((data ?? []) as { day: string; status: AttendanceStatus; note: string | null; classId: string | null }[]).filter(
    (r) => !r.classId || canAccessClass(access, r.classId)
  );
  return {
    absences: rows.filter((r) => r.status === "ABSENT").length,
    justified: rows.filter((r) => r.status === "JUSTIFIE").length,
    retards: rows.filter((r) => r.status === "RETARD").length,
    recent: rows.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Présences des enseignants (direction seulement)
// ---------------------------------------------------------------------------

export async function getTeacherRollCallAction(day: string) {
  const access = await requireSchoolAccess("manage");
  const bid = access.user.businessId;
  const [{ data: teachers }, { data: marks }] = await Promise.all([
    supabase.from("school_teachers").select("id, last_name, first_name").eq("business_id", bid).eq("active", true).order("last_name"),
    supabase.from("school_teacher_attendance").select("teacher_id, status, note").eq("business_id", bid).eq("day", DAY.test(day) ? day : "1900-01-01"),
  ]);
  const byTeacher = new Map((marks ?? []).map((m) => [m.teacher_id as string, m]));
  return (teachers ?? []).map((t) => ({
    teacherId: t.id as string,
    name: `${t.last_name} ${t.first_name}`,
    status: (byTeacher.get(t.id as string)?.status as AttendanceStatus | undefined) ?? null,
    note: (byTeacher.get(t.id as string)?.note as string | null | undefined) ?? null,
  }));
}

export async function saveTeacherRollCallAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const day = String(formData.get("day") || "");
  if (!DAY.test(day)) return { error: "Date invalide" };
  const bid = access.user.businessId;
  const { data: teachers } = await supabase.from("school_teachers").select("id").eq("business_id", bid).eq("active", true);
  const rows = (teachers ?? [])
    .map((t) => {
      const status = String(formData.get(`status_${t.id}`) || "");
      if (!(status in ATTENDANCE_STATUSES)) return null;
      return { business_id: bid, teacher_id: t.id as string, day, status, note: String(formData.get(`note_${t.id}`) || "") || null, user_id: access.user.id, updated_at: new Date().toISOString() };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length === 0) return { error: "Aucun enseignant n'a été marqué" };
  const { error } = await supabase.from("school_teacher_attendance").upsert(rows, { onConflict: "teacher_id,day" });
  if (error) {
    console.error("[saveTeacherRollCallAction]", error.message);
    return { error: "Impossible d'enregistrer les présences" };
  }
  await logAction({ businessId: bid, userId: access.user.id, action: "UPDATE", entity: "SchoolTeacherAttendance", details: `${day} · ${rows.length} enseignants` });
  revalidatePath("/ecole/enseignants/presences");
  return { success: "Présences des enseignants enregistrées" };
}

/** Absences et retards des enseignants sur le mois en cours. */
export async function getTeacherAttendanceMonthAction() {
  const access = await requireSchoolAccess("manage");
  const monthStart = new Date().toISOString().slice(0, 8) + "01";
  const { data } = await supabase
    .from("school_teacher_attendance")
    .select("teacherId:teacher_id, status")
    .eq("business_id", access.user.businessId)
    .gte("day", monthStart)
    .neq("status", "PRESENT");
  const per = new Map<string, { absences: number; retards: number }>();
  for (const r of (data ?? []) as { teacherId: string; status: AttendanceStatus }[]) {
    const e = per.get(r.teacherId) ?? { absences: 0, retards: 0 };
    if (r.status === "RETARD") e.retards++;
    else e.absences++;
    per.set(r.teacherId, e);
  }
  return Object.fromEntries(per);
}
