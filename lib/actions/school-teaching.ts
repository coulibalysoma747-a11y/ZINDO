"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { requireSchoolAccess, canAccessClass, canAccessSubject } from "@/lib/school-access";
import { HOMEWORK_KINDS, type HomeworkKind } from "@/lib/school-constants";

/** Emploi du temps, leçons (chapitre par chapitre) et devoirs. */

export type ActionState = { error?: string; success?: string } | undefined;

// ---------------------------------------------------------------------------
// Emploi du temps
// ---------------------------------------------------------------------------

export type TimetableSlot = {
  id: string;
  classId: string;
  className: string;
  weekday: number;
  startTime: string;
  endTime: string;
  subjectName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  room: string | null;
};

const SLOT_SELECT =
  "id, classId:class_id, weekday, startTime:start_time, endTime:end_time, teacherId:teacher_id, room, class:school_classes(name), subject:school_subjects(name), teacher:school_teachers(last_name, first_name)";

type RawSlot = Omit<TimetableSlot, "className" | "subjectName" | "teacherName"> & {
  class: { name: string } | null;
  subject: { name: string } | null;
  teacher: { last_name: string; first_name: string } | null;
};
const toSlot = ({ class: c, subject: s, teacher: t, ...r }: RawSlot): TimetableSlot => ({
  ...r,
  className: c?.name ?? "?",
  subjectName: s?.name ?? null,
  teacherName: t ? `${t.last_name} ${t.first_name}` : null,
});

/** Emploi du temps d'une classe, ou celui de l'enseignant connecté (sans classe). */
export async function getTimetableAction(classId?: string): Promise<TimetableSlot[]> {
  const access = await requireSchoolAccess("teach");
  let q = supabase.from("school_timetable").select(SLOT_SELECT).eq("business_id", access.user.businessId).order("weekday").order("start_time");
  if (classId) {
    if (!canAccessClass(access, classId)) return [];
    q = q.eq("class_id", classId);
  } else if (!access.isManager) {
    if (!access.teacherId) return [];
    q = q.eq("teacher_id", access.teacherId);
  } else {
    return [];
  }
  const { data } = await q;
  return ((data ?? []) as unknown as RawSlot[]).map(toSlot);
}

const slotSchema = z.object({
  classId: z.string().min(1),
  weekday: z.coerce.number().int().min(1).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de début invalide"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide"),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  room: z.string().trim().optional(),
});

export async function saveTimetableSlotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const parsed = slotSchema.safeParse({
    classId: formData.get("classId"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    subjectId: formData.get("subjectId") || undefined,
    teacherId: formData.get("teacherId") || undefined,
    room: formData.get("room") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.endTime <= d.startTime) return { error: "L'heure de fin doit être après l'heure de début" };
  const bid = access.user.businessId;

  // Chevauchements : même classe, ou même enseignant, au même moment.
  const { data: sameDay } = await supabase
    .from("school_timetable")
    .select("classId:class_id, teacherId:teacher_id, startTime:start_time, endTime:end_time, class:school_classes(name)")
    .eq("business_id", bid)
    .eq("weekday", d.weekday);
  for (const s of (sameDay ?? []) as unknown as { classId: string; teacherId: string | null; startTime: string; endTime: string; class: { name: string } | null }[]) {
    const overlap = d.startTime < s.endTime && s.startTime < d.endTime;
    if (!overlap) continue;
    if (s.classId === d.classId) return { error: `La classe a déjà un cours de ${s.startTime} à ${s.endTime}` };
    if (d.teacherId && s.teacherId === d.teacherId) return { error: `Cet enseignant a déjà cours en ${s.class?.name ?? "?"} de ${s.startTime} à ${s.endTime}` };
  }

  const { error } = await supabase.from("school_timetable").insert({
    business_id: bid,
    class_id: d.classId,
    weekday: d.weekday,
    start_time: d.startTime,
    end_time: d.endTime,
    subject_id: d.subjectId ?? null,
    teacher_id: d.teacherId ?? null,
    room: d.room ?? null,
  });
  if (error) {
    console.error("[saveTimetableSlotAction]", error.message);
    return { error: "Impossible d'ajouter le cours" };
  }
  await logAction({ businessId: bid, userId: access.user.id, action: "CREATE", entity: "SchoolTimetable", entityId: d.classId, details: `jour ${d.weekday} ${d.startTime}-${d.endTime}` });
  revalidatePath("/ecole/emploi-du-temps");
  return { success: "Cours ajouté à l'emploi du temps" };
}

export async function deleteTimetableSlotAction(id: string): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const { error } = await supabase.from("school_timetable").delete().eq("id", id).eq("business_id", access.user.businessId);
  if (error) return { error: "Impossible de supprimer le cours" };
  await logAction({ businessId: access.user.businessId, userId: access.user.id, action: "DELETE", entity: "SchoolTimetable", entityId: id });
  revalidatePath("/ecole/emploi-du-temps");
  return { success: "Cours supprimé" };
}

// ---------------------------------------------------------------------------
// Leçons : chapitres puis leçons, par classe et matière
// ---------------------------------------------------------------------------

export type Lesson = { id: string; title: string; content: string | null; position: number; doneAt: string | null };
export type Chapter = { id: string; title: string; position: number; lessons: Lesson[] };

export async function getChaptersAction(classId: string, subjectId: string): Promise<Chapter[]> {
  const access = await requireSchoolAccess("teach");
  if (!canAccessSubject(access, classId, subjectId)) return [];
  const { data } = await supabase
    .from("school_chapters")
    .select("id, title, position, lessons:school_lessons(id, title, content, position, doneAt:done_at)")
    .eq("business_id", access.user.businessId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .order("position")
    .order("created_at");
  return ((data ?? []) as unknown as Chapter[]).map((c) => ({ ...c, lessons: [...c.lessons].sort((a, b) => a.position - b.position) }));
}

export async function saveChapterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const title = String(formData.get("title") || "").trim();
  const classId = String(formData.get("classId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const position = Number(formData.get("position") || 0);
  if (!title) return { error: "Le titre du chapitre est requis" };
  const id = String(formData.get("id") || "");
  const bid = access.user.businessId;
  const { error } = id
    ? await supabase.from("school_chapters").update({ title, position }).eq("id", id).eq("business_id", bid)
    : await supabase.from("school_chapters").insert({ business_id: bid, class_id: classId, subject_id: subjectId, title, position });
  if (error) return { error: "Impossible d'enregistrer le chapitre" };
  await logAction({ businessId: bid, userId: access.user.id, action: id ? "UPDATE" : "CREATE", entity: "SchoolChapter", entityId: id || undefined, details: title });
  revalidatePath("/ecole/lecons");
  return { success: id ? "Chapitre modifié" : "Chapitre ajouté" };
}

export async function deleteChapterAction(id: string): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const { error } = await supabase.from("school_chapters").delete().eq("id", id).eq("business_id", access.user.businessId);
  if (error) return { error: "Impossible de supprimer le chapitre" };
  await logAction({ businessId: access.user.businessId, userId: access.user.id, action: "DELETE", entity: "SchoolChapter", entityId: id });
  revalidatePath("/ecole/lecons");
  return { success: "Chapitre supprimé" };
}

export async function saveLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const title = String(formData.get("title") || "").trim();
  const chapterId = String(formData.get("chapterId") || "");
  const content = String(formData.get("content") || "").trim() || null;
  const position = Number(formData.get("position") || 0);
  if (!title) return { error: "Le titre de la leçon est requis" };
  const id = String(formData.get("id") || "");
  const bid = access.user.businessId;
  const { data: chapter } = await supabase.from("school_chapters").select("id").eq("id", chapterId).eq("business_id", bid).maybeSingle();
  if (!chapter) return { error: "Chapitre introuvable" };
  const { error } = id
    ? await supabase.from("school_lessons").update({ title, content, position }).eq("id", id).eq("business_id", bid)
    : await supabase.from("school_lessons").insert({ business_id: bid, chapter_id: chapterId, title, content, position });
  if (error) return { error: "Impossible d'enregistrer la leçon" };
  await logAction({ businessId: bid, userId: access.user.id, action: id ? "UPDATE" : "CREATE", entity: "SchoolLesson", entityId: id || undefined, details: title });
  revalidatePath("/ecole/lecons");
  return { success: id ? "Leçon modifiée" : "Leçon ajoutée" };
}

export async function deleteLessonAction(id: string): Promise<ActionState> {
  const access = await requireSchoolAccess("manage");
  const { error } = await supabase.from("school_lessons").delete().eq("id", id).eq("business_id", access.user.businessId);
  if (error) return { error: "Impossible de supprimer la leçon" };
  await logAction({ businessId: access.user.businessId, userId: access.user.id, action: "DELETE", entity: "SchoolLesson", entityId: id });
  revalidatePath("/ecole/lecons");
  return { success: "Leçon supprimée" };
}

/** L'enseignant marque une leçon comme faite (ou non faite). */
export async function setLessonDoneAction(lessonId: string, done: boolean): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const bid = access.user.businessId;
  const { data } = await supabase
    .from("school_lessons")
    .select("id, chapter:school_chapters(class_id, subject_id)")
    .eq("id", lessonId)
    .eq("business_id", bid)
    .maybeSingle();
  const chapter = (data as unknown as { chapter: { class_id: string; subject_id: string } | null } | null)?.chapter;
  if (!chapter || !canAccessSubject(access, chapter.class_id, chapter.subject_id)) return { error: "Leçon introuvable" };
  const { error } = await supabase.from("school_lessons").update({ done_at: done ? new Date().toISOString() : null }).eq("id", lessonId).eq("business_id", bid);
  if (error) return { error: "Impossible de mettre à jour la leçon" };
  revalidatePath("/ecole/lecons");
  return { success: done ? "Leçon marquée comme faite" : "Leçon marquée comme à faire" };
}

// ---------------------------------------------------------------------------
// Devoirs, exercices et questions
// ---------------------------------------------------------------------------

export type Homework = {
  id: string;
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string | null;
  kind: HomeworkKind;
  title: string;
  content: string | null;
  dueDate: string | null;
  createdAt: string;
};

export async function getHomeworkAction(classId?: string): Promise<Homework[]> {
  const access = await requireSchoolAccess("teach");
  let q = supabase
    .from("school_homework")
    .select("id, classId:class_id, subjectId:subject_id, kind, title, content, dueDate:due_date, createdAt:created_at, class:school_classes(name), subject:school_subjects(name)")
    .eq("business_id", access.user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (classId) q = q.eq("class_id", classId);
  const { data } = await q;
  return ((data ?? []) as unknown as (Omit<Homework, "className" | "subjectName"> & { class: { name: string } | null; subject: { name: string } | null })[])
    .map(({ class: c, subject: s, ...h }) => ({ ...h, className: c?.name ?? "?", subjectName: s?.name ?? null }))
    .filter((h) => (h.subjectId ? canAccessSubject(access, h.classId, h.subjectId) : canAccessClass(access, h.classId)));
}

const homeworkSchema = z.object({
  classId: z.string().min(1, "Choisissez une classe"),
  subjectId: z.string().optional(),
  kind: z.enum(Object.keys(HOMEWORK_KINDS) as [HomeworkKind, ...HomeworkKind[]]),
  title: z.string().trim().min(1, "Le titre est requis"),
  content: z.string().trim().optional(),
  dueDate: z.string().optional(),
});

export async function saveHomeworkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const parsed = homeworkSchema.safeParse({
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId") || undefined,
    kind: formData.get("kind") || "DEVOIR",
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const allowed = d.subjectId ? canAccessSubject(access, d.classId, d.subjectId) : canAccessClass(access, d.classId);
  if (!allowed) return { error: "Vous n'avez pas accès à cette classe ou à cette matière" };
  const id = String(formData.get("id") || "");
  const bid = access.user.businessId;
  const row = { class_id: d.classId, subject_id: d.subjectId ?? null, kind: d.kind, title: d.title, content: d.content ?? null, due_date: d.dueDate ?? null };
  const { error } = id
    ? await supabase.from("school_homework").update(row).eq("id", id).eq("business_id", bid)
    : await supabase.from("school_homework").insert({ ...row, business_id: bid, created_by: access.user.id });
  if (error) {
    console.error("[saveHomeworkAction]", error.message);
    return { error: "Impossible d'enregistrer le devoir" };
  }
  await logAction({ businessId: bid, userId: access.user.id, action: id ? "UPDATE" : "CREATE", entity: "SchoolHomework", entityId: id || undefined, details: d.title });
  revalidatePath("/ecole/devoirs");
  return { success: id ? "Devoir modifié" : "Devoir publié" };
}

export async function deleteHomeworkAction(id: string): Promise<ActionState> {
  const access = await requireSchoolAccess("teach");
  const bid = access.user.businessId;
  const { data } = await supabase.from("school_homework").select("classId:class_id, subjectId:subject_id").eq("id", id).eq("business_id", bid).maybeSingle();
  if (!data) return { error: "Devoir introuvable" };
  const h = data as { classId: string; subjectId: string | null };
  if (!(h.subjectId ? canAccessSubject(access, h.classId, h.subjectId) : canAccessClass(access, h.classId))) return { error: "Accès refusé" };
  const { error } = await supabase.from("school_homework").delete().eq("id", id).eq("business_id", bid);
  if (error) return { error: "Impossible de supprimer le devoir" };
  await logAction({ businessId: bid, userId: access.user.id, action: "DELETE", entity: "SchoolHomework", entityId: id });
  revalidatePath("/ecole/devoirs");
  return { success: "Devoir supprimé" };
}
