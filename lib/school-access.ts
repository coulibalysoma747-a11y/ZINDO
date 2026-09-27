import "server-only";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireUser, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { SCHOOL_ACTIVITY_KEY, SCHOOL_FLAG } from "@/lib/nav";

/**
 * Accès au module École (flag gestion_scolaire, activité « ecole »).
 *
 * Deux niveaux :
 * - direction (ecole.gerer) : voit et gère tout l'établissement ;
 * - enseignant (ecole.enseigner) : ne voit que les classes et matières qui
 *   lui sont attribuées (fiche enseignant reliée à son compte ZINDO).
 */
export type SchoolAccess = {
  user: Awaited<ReturnType<typeof requireUser>>;
  isManager: boolean;
  /** Fiche enseignant reliée au compte connecté, s'il y en a une. */
  teacherId: string | null;
  /** Couples classe/matière enseignés (vide pour la direction : tout est permis). */
  pairs: { classId: string; subjectId: string }[];
  /** Classes accessibles à l'enseignant (ses matières + celles dont il est professeur principal). */
  classIds: string[];
};

export async function requireSchoolAccess(level: "manage" | "teach" = "teach"): Promise<SchoolAccess> {
  const user = await requireUser();
  await registerFeatureFlag(
    SCHOOL_FLAG,
    "Gestion scolaire (école)",
    "Élèves, classes, scolarité, enseignants, présences, notes, bulletins, emploi du temps, leçons et devoirs pour les écoles."
  );
  if (user.business.activityKey !== SCHOOL_ACTIVITY_KEY) redirect("/dashboard");
  if (!(await isFeatureEnabled(SCHOOL_FLAG, user.businessId))) redirect("/dashboard");

  const [isManager, canTeach] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.SCHOOL_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SCHOOL_TEACH, user.id),
  ]);
  if (!isManager && (level === "manage" || !canTeach)) redirect("/dashboard?erreur=acces-refuse");

  const { data: teacher } = await supabase
    .from("school_teachers")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  const teacherId = (teacher?.id as string | undefined) ?? null;

  let pairs: SchoolAccess["pairs"] = [];
  let classIds: string[] = [];
  if (!isManager && teacherId) {
    const [{ data: cs }, { data: main }] = await Promise.all([
      supabase.from("school_class_subjects").select("classId:class_id, subjectId:subject_id").eq("business_id", user.businessId).eq("teacher_id", teacherId),
      supabase.from("school_classes").select("id").eq("business_id", user.businessId).eq("main_teacher_id", teacherId),
    ]);
    pairs = (cs ?? []) as SchoolAccess["pairs"];
    classIds = [...new Set([...pairs.map((p) => p.classId), ...(main ?? []).map((c) => c.id as string)])];
  }
  return { user, isManager, teacherId, pairs, classIds };
}

export function canAccessClass(access: SchoolAccess, classId: string) {
  return access.isManager || access.classIds.includes(classId);
}

export function canAccessSubject(access: SchoolAccess, classId: string, subjectId: string) {
  return access.isManager || access.pairs.some((p) => p.classId === classId && p.subjectId === subjectId);
}

/** Classes visibles par l'utilisateur, triées par nom. */
export async function getAccessibleClasses(access: SchoolAccess) {
  let q = supabase.from("school_classes").select("id, name").eq("business_id", access.user.businessId).order("name");
  if (!access.isManager) q = q.in("id", access.classIds.length ? access.classIds : ["-"]);
  const { data } = await q;
  return (data ?? []) as { id: string; name: string }[];
}

/** Matières d'une classe (avec coefficient et enseignant), limitées à celles de l'enseignant. */
export async function getClassSubjects(access: SchoolAccess, classId: string) {
  const { data } = await supabase
    .from("school_class_subjects")
    .select("id, subjectId:subject_id, coefficient, teacherId:teacher_id, subject:school_subjects(name), teacher:school_teachers(last_name, first_name)")
    .eq("business_id", access.user.businessId)
    .eq("class_id", classId);
  const rows = ((data ?? []) as unknown as {
    id: string;
    subjectId: string;
    coefficient: number;
    teacherId: string | null;
    subject: { name: string } | null;
    teacher: { last_name: string; first_name: string } | null;
  }[])
    .filter((r) => canAccessSubject(access, classId, r.subjectId))
    .map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      name: r.subject?.name ?? "?",
      coefficient: Number(r.coefficient),
      teacherId: r.teacherId,
      teacherName: r.teacher ? `${r.teacher.last_name} ${r.teacher.first_name}` : null,
    }));
  return rows.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
