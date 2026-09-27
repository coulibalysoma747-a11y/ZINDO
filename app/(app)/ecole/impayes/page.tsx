import Link from "next/link";
import { HandCoins } from "lucide-react";
import { getStudentsAction, getSchoolContextAction } from "@/lib/actions/school";
import { formatMoney } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";

export default async function SchoolUnpaidPage() {
  const [{ currency }, students] = await Promise.all([getSchoolContextAction(), getStudentsAction()]);
  const unpaid = students.filter((s) => s.active && s.remaining > 0);
  const total = unpaid.reduce((sum, s) => sum + s.remaining, 0);

  // Regroupement par classe, dans l'ordre alphabétique des classes.
  const byClass = new Map<string, typeof unpaid>();
  for (const s of unpaid) {
    const key = s.className ?? "Sans classe";
    byClass.set(key, [...(byClass.get(key) ?? []), s]);
  }
  const groups = [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <HandCoins className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Scolarité impayée</h1>
          <p className="text-sm text-zinc-500">
            {unpaid.length} élève{unpaid.length > 1 ? "s" : ""} · Total restant{" "}
            <strong className="text-red-600">{formatMoney(total, currency)}</strong>
          </p>
        </div>
      </div>

      {unpaid.length === 0 ? (
        <EmptyState title="Aucun impayé" description="Tous les élèves inscrits sont à jour de leur scolarité." />
      ) : (
        groups.map(([className, list]) => (
          <div key={className} className="space-y-2">
            <h2 className="font-semibold text-zinc-900">
              {className} · {formatMoney(list.reduce((sum, s) => sum + s.remaining, 0), currency)}
            </h2>
            <Card className="divide-y divide-zinc-100">
              {list.map((s) => (
                <Link key={s.id} href={`/ecole/eleves/${s.id}`} className="block hover:bg-zinc-50 dark:hover:bg-slate-800/50">
                  <CardBody className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {s.lastName} {s.firstName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {s.parentName ?? "Parent non renseigné"}
                        {s.parentPhone ? ` · ${s.parentPhone}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-red-600">{formatMoney(s.remaining, currency)}</p>
                      <p className="text-xs text-zinc-400">
                        Payé {formatMoney(s.paid, currency)} / {formatMoney(s.fee, currency)}
                      </p>
                    </div>
                  </CardBody>
                </Link>
              ))}
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
