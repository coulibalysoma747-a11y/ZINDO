import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { getStudentsAction, getSchoolClassesAction, getSchoolContextAction } from "@/lib/actions/school";
import { formatMoney } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ classe?: string; q?: string; partis?: string }> }) {
  const sp = await searchParams;
  const [{ currency }, classes, all] = await Promise.all([getSchoolContextAction(), getSchoolClassesAction(), getStudentsAction()]);

  const q = (sp.q ?? "").trim().toLowerCase();
  const showLeft = sp.partis === "1";
  const students = all.filter(
    (s) =>
      s.active !== showLeft &&
      (!sp.classe || s.classId === sp.classe) &&
      (!q || `${s.lastName} ${s.firstName} ${s.matricule ?? ""} ${s.parentPhone ?? ""}`.toLowerCase().includes(q))
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Élèves</h1>
            <p className="text-sm text-zinc-500">
              {students.length} élève{students.length > 1 ? "s" : ""}
              {showLeft ? " partis" : ""}
            </p>
          </div>
        </div>
        <ButtonLink href="/ecole/eleves/nouveau">Nouvel élève</ButtonLink>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Nom, matricule ou téléphone du parent"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          name="classe"
          defaultValue={sp.classe ?? ""}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="partis"
          defaultValue={showLeft ? "1" : ""}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">Élèves inscrits</option>
          <option value="1">Élèves partis</option>
        </select>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
          Filtrer
        </button>
      </form>

      {classes.length === 0 ? (
        <EmptyState
          title="Commencez par créer vos classes"
          description="Chaque élève est inscrit dans une classe, qui fixe le montant de sa scolarité."
          action={<ButtonLink href="/ecole/classes">Créer une classe</ButtonLink>}
        />
      ) : students.length === 0 ? (
        <EmptyState title="Aucun élève" description="Aucun élève ne correspond à cette recherche." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {students.map((s) => (
            <Link key={s.id} href={`/ecole/eleves/${s.id}`} className="block hover:bg-zinc-50 dark:hover:bg-slate-800/50">
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    {s.lastName} {s.firstName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {s.className ?? "Sans classe"}
                    {s.matricule ? ` · ${s.matricule}` : ""}
                    {s.parentPhone ? ` · ${s.parentPhone}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {s.fee === 0 ? (
                    <Badge tone="zinc">Scolarité non fixée</Badge>
                  ) : s.remaining > 0 ? (
                    <>
                      <p className="font-semibold text-red-600">Reste {formatMoney(s.remaining, currency)}</p>
                      <p className="text-xs text-zinc-400">
                        Payé {formatMoney(s.paid, currency)} / {formatMoney(s.fee, currency)}
                      </p>
                    </>
                  ) : (
                    <Badge tone="emerald">Soldé</Badge>
                  )}
                </div>
              </CardBody>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
