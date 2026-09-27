import Link from "next/link";
import { PenLine, Lock } from "lucide-react";
import { requireSchoolAccess, getAccessibleClasses, getClassSubjects } from "@/lib/school-access";
import { getEvaluationsAction } from "@/lib/actions/school-grades";
import { EVALUATION_KINDS, TERMS, termLabel } from "@/lib/school-constants";
import { formatDate } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { FILTER_INPUT, FILTER_BUTTON } from "@/components/school/styles";
import { NewEvaluationForm } from "./NewEvaluationForm";

export default async function GradesPage({ searchParams }: { searchParams: Promise<{ classe?: string; trimestre?: string }> }) {
  const sp = await searchParams;
  const access = await requireSchoolAccess("teach");
  const classes = await getAccessibleClasses(access);
  const classId = sp.classe && classes.some((c) => c.id === sp.classe) ? sp.classe : classes[0]?.id;
  const term = [1, 2, 3].includes(Number(sp.trimestre)) ? Number(sp.trimestre) : 1;
  const [evaluations, subjects] = await Promise.all([
    classId ? getEvaluationsAction({ classId, term }) : Promise.resolve([]),
    classId ? getClassSubjects(access, classId) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Notes</h1>
          <p className="text-sm text-zinc-500">Créez une évaluation (devoir, composition…), puis saisissez les notes de la classe.</p>
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
            <select name="trimestre" defaultValue={String(term)} className={FILTER_INPUT}>
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {termLabel(t)}
                </option>
              ))}
            </select>
            <button type="submit" className={FILTER_BUTTON}>
              Afficher
            </button>
          </form>

          {subjects.length === 0 ? (
            <EmptyState
              title="Aucune matière dans cette classe"
              description={access.isManager ? "Ajoutez les matières et leurs coefficients depuis la page de la classe." : "Aucune matière ne vous est attribuée dans cette classe."}
            />
          ) : (
            <NewEvaluationForm key={`${classId}-${term}`} classId={classId!} term={term} subjects={subjects.map((s) => ({ id: s.subjectId, name: s.name }))} />
          )}

          {evaluations.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune évaluation pour ce trimestre.</p>
          ) : (
            <Card className="divide-y divide-zinc-100">
              {evaluations.map((e) => (
                <Link key={e.id} href={`/ecole/notes/${e.id}`} className="block hover:bg-zinc-50 dark:hover:bg-slate-800/50">
                  <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {e.title} {e.locked && <Lock className="inline h-3.5 w-3.5 text-zinc-400" />}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {e.subjectName} · {EVALUATION_KINDS[e.kind]} · {formatDate(e.day)} · sur {e.maxScore} · poids {e.weight}
                      </p>
                    </div>
                    <Badge tone={e.gradedCount > 0 ? "emerald" : "zinc"}>{e.gradedCount} note(s)</Badge>
                  </CardBody>
                </Link>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
