import Link from "next/link";
import { ScrollText, Printer } from "lucide-react";
import { requireSchoolAccess, getAccessibleClasses } from "@/lib/school-access";
import { getReportCardsAction } from "@/lib/actions/school-grades";
import { TERMS, termLabel, formatAverage } from "@/lib/school-constants";
import { Card, CardBody } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { FILTER_INPUT, FILTER_BUTTON } from "@/components/school/styles";

export default async function ReportCardsPage({ searchParams }: { searchParams: Promise<{ classe?: string; trimestre?: string }> }) {
  const sp = await searchParams;
  const access = await requireSchoolAccess("manage");
  const classes = await getAccessibleClasses(access);
  const classId = sp.classe && classes.some((c) => c.id === sp.classe) ? sp.classe : classes[0]?.id;
  const term = [1, 2, 3].includes(Number(sp.trimestre)) ? Number(sp.trimestre) : 1;
  const data = classId ? await getReportCardsAction({ classId, term }) : null;
  const ranked = data ? [...data.report.students].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999)) : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Bulletins</h1>
          <p className="text-sm text-zinc-500">Moyennes calculées automatiquement à partir des notes et des coefficients.</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <EmptyState title="Aucune classe" />
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

          {data && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-600">
                  Moyenne de la classe : <strong>{formatAverage(data.report.classAverage)}</strong> · plus forte {formatAverage(data.report.best)} · plus faible{" "}
                  {formatAverage(data.report.worst)}
                </p>
                {ranked.length > 0 && (
                  <ButtonLink href={`/ecole/bulletins/classe/${classId}?trimestre=${term}`} variant="secondary">
                    <Printer className="h-4 w-4" /> Imprimer tous les bulletins
                  </ButtonLink>
                )}
              </div>
              {ranked.length === 0 ? (
                <EmptyState title="Aucun élève dans cette classe" />
              ) : (
                <Card className="divide-y divide-zinc-100">
                  {ranked.map((s) => (
                    <Link key={s.studentId} href={`/ecole/bulletins/${s.studentId}?trimestre=${term}`} className="block hover:bg-zinc-50 dark:hover:bg-slate-800/50">
                      <CardBody className="flex items-center justify-between gap-3 py-3">
                        <span className="text-sm">
                          <span className="mr-3 inline-block w-8 text-zinc-400">{s.rank ? `${s.rank}${s.rank === 1 ? "er" : "e"}` : "—"}</span>
                          <span className="font-medium text-zinc-900">{s.name}</span>
                        </span>
                        <span className={`text-sm font-semibold ${s.average !== null && s.average < 10 ? "text-red-600" : "text-zinc-900"}`}>{formatAverage(s.average)} / 20</span>
                      </CardBody>
                    </Link>
                  ))}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
