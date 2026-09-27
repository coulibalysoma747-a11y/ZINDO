import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireSchoolAccess, getAccessibleClasses } from "@/lib/school-access";
import { getRollCallAction, saveRollCallAction, getAttendanceStatsAction } from "@/lib/actions/school-attendance";
import { RollCallForm } from "@/components/school/RollCallForm";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { FILTER_INPUT, FILTER_BUTTON } from "@/components/school/styles";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ classe?: string; jour?: string }> }) {
  const sp = await searchParams;
  const access = await requireSchoolAccess("teach");
  const classes = await getAccessibleClasses(access);
  const classId = sp.classe && classes.some((c) => c.id === sp.classe) ? sp.classe : classes[0]?.id;
  const day = sp.jour && /^\d{4}-\d{2}-\d{2}$/.test(sp.jour) ? sp.jour : new Date().toISOString().slice(0, 10);
  const [rows, stats] = await Promise.all([classId ? getRollCallAction(classId, day) : Promise.resolve([]), getAttendanceStatsAction()]);

  const tiles: [string, { absents: number; retards: number }][] = [
    ["Aujourd'hui", stats.today],
    ["Cette semaine", stats.week],
    ["Ce mois", stats.month],
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Présences</h1>
          <p className="text-sm text-zinc-500">Faites l&apos;appel : tout le monde est présent par défaut, touchez les absents et les retards.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map(([label, v]) => (
          <Card key={label}>
            <CardBody className="py-3">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-sm">
                <strong className="text-red-600">{v.absents}</strong> abs. · <strong className="text-amber-600">{v.retards}</strong> ret.
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="Aucune classe"
          description={access.isManager ? "Créez d'abord vos classes." : "Aucune classe ne vous est attribuée : demandez à la direction de vous relier à vos classes."}
        />
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
            <input type="date" name="jour" defaultValue={day} className={FILTER_INPUT} />
            <button type="submit" className={FILTER_BUTTON}>
              Afficher
            </button>
          </form>
          {rows.length === 0 ? (
            <EmptyState title="Aucun élève dans cette classe" />
          ) : (
            <RollCallForm
              key={`${classId}-${day}`}
              rows={rows.map((r) => ({ id: r.studentId, name: r.name, status: r.status, note: r.note }))}
              hidden={{ classId: classId!, day }}
              action={saveRollCallAction}
            />
          )}
        </>
      )}

      {stats.mostAbsent.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-zinc-900">Élèves les plus absents ce mois</h2>
          <Card className="divide-y divide-zinc-100">
            {stats.mostAbsent.map((s) => (
              <CardBody key={s.studentId} className="flex items-center justify-between py-2.5 text-sm">
                {access.isManager ? (
                  <Link href={`/ecole/eleves/${s.studentId}`} className="font-medium text-zinc-900 hover:underline">
                    {s.name}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-900">{s.name}</span>
                )}
                <span className="text-zinc-500">
                  {s.className ?? "—"} · {s.absences} abs. · {s.retards} ret.
                </span>
              </CardBody>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
