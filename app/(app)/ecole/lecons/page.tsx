import { BookMarked, Printer, Download } from "lucide-react";
import { requireSchoolAccess, getAccessibleClasses, getClassSubjects } from "@/lib/school-access";
import { getChaptersAction } from "@/lib/actions/school-teaching";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { FILTER_INPUT, FILTER_BUTTON } from "@/components/school/styles";
import { LessonsBoard } from "./LessonsBoard";

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ classe?: string; matiere?: string }> }) {
  const sp = await searchParams;
  const access = await requireSchoolAccess("teach");
  const classes = await getAccessibleClasses(access);
  const classId = sp.classe && classes.some((c) => c.id === sp.classe) ? sp.classe : classes[0]?.id;
  const subjects = classId ? await getClassSubjects(access, classId) : [];
  const subjectId = sp.matiere && subjects.some((s) => s.subjectId === sp.matiere) ? sp.matiere : subjects[0]?.subjectId;
  const chapters = classId && subjectId ? await getChaptersAction(classId, subjectId) : [];
  const lessonCount = chapters.reduce((n, c) => n + c.lessons.length, 0);
  const doneCount = chapters.reduce((n, c) => n + c.lessons.filter((l) => l.doneAt).length, 0);
  const query = `classe=${classId}&matiere=${subjectId}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Leçons</h1>
            <p className="text-sm text-zinc-500">
              {access.isManager ? "Écrivez le programme chapitre par chapitre, leçon par leçon." : "Les cours à donner dans vos classes."}
            </p>
          </div>
        </div>
        {lessonCount > 0 && (
          <div className="flex gap-2">
            <ButtonLink href={`/ecole/lecons/imprimer?${query}`} variant="secondary">
              <Printer className="h-4 w-4" /> PDF
            </ButtonLink>
            <ButtonLink href={`/ecole/lecons/export?${query}`} variant="secondary">
              <Download className="h-4 w-4" /> Excel
            </ButtonLink>
          </div>
        )}
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
            {subjects.length > 0 && (
              <select name="matiere" defaultValue={subjectId} className={FILTER_INPUT}>
                {subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <button type="submit" className={FILTER_BUTTON}>
              Afficher
            </button>
          </form>

          {subjects.length === 0 ? (
            <EmptyState
              title="Aucune matière dans cette classe"
              description={access.isManager ? "Ajoutez les matières depuis la page de la classe." : "Aucune matière ne vous est attribuée dans cette classe."}
            />
          ) : (
            <>
              {lessonCount > 0 && (
                <p className="text-sm text-zinc-500">
                  {doneCount} leçon(s) faite(s) sur {lessonCount}
                </p>
              )}
              <LessonsBoard key={query} classId={classId!} subjectId={subjectId!} chapters={chapters} canEdit={access.isManager} />
            </>
          )}
        </>
      )}
    </div>
  );
}
