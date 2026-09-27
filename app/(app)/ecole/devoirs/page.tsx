import { NotebookPen } from "lucide-react";
import { requireSchoolAccess, getAccessibleClasses, getClassSubjects } from "@/lib/school-access";
import { getHomeworkAction } from "@/lib/actions/school-teaching";
import { EmptyState } from "@/components/ui/Empty";
import { FILTER_INPUT, FILTER_BUTTON } from "@/components/school/styles";
import { HomeworkBoard } from "./HomeworkBoard";

export default async function HomeworkPage({ searchParams }: { searchParams: Promise<{ classe?: string }> }) {
  const sp = await searchParams;
  const access = await requireSchoolAccess("teach");
  const classes = await getAccessibleClasses(access);
  const classId = sp.classe && classes.some((c) => c.id === sp.classe) ? sp.classe : classes[0]?.id;
  const [homework, subjects] = await Promise.all([
    classId ? getHomeworkAction(classId) : Promise.resolve([]),
    classId ? getClassSubjects(access, classId) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Devoirs</h1>
          <p className="text-sm text-zinc-500">Devoirs, exercices et questions donnés aux élèves, avec la date de remise.</p>
        </div>
      </div>
      {classes.length === 0 ? (
        <EmptyState title="Aucune classe" description={access.isManager ? "Créez d'abord vos classes." : "Aucune classe ne vous est attribuée."} />
      ) : (
        <>
          <form className="flex flex-wrap gap-2">
            <select name="classe" defaultValue={classId} className={FILTER_INPUT}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className={FILTER_BUTTON}>
              Afficher
            </button>
          </form>
          <HomeworkBoard key={classId} classId={classId!} homework={homework} subjects={subjects.map((s) => ({ id: s.subjectId, name: s.name }))} />
        </>
      )}
    </div>
  );
}
