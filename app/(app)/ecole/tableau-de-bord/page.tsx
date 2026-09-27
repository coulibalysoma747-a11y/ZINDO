import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { requireSchoolAccess } from "@/lib/school-access";
import { supabase } from "@/lib/supabase";
import { getStudentsAction, getSchoolContextAction } from "@/lib/actions/school";
import { getAttendanceStatsAction } from "@/lib/actions/school-attendance";
import { currentSchoolYear, schoolYearStart } from "@/lib/school-constants";
import { formatMoney } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";

function Tile({ label, value, tone, href }: { label: string; value: string | number; tone?: string; href?: string }) {
  const body = (
    <Card className="h-full">
      <CardBody className="py-3">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-lg font-semibold ${tone ?? "text-zinc-900"}`}>{value}</p>
      </CardBody>
    </Card>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function SchoolDashboardPage() {
  const access = await requireSchoolAccess("manage");
  const bid = access.user.businessId;
  const since = schoolYearStart();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const [{ currency }, students, attendance, { count: teacherCount }, { data: payments }, { count: classCount }] = await Promise.all([
    getSchoolContextAction(),
    getStudentsAction(),
    getAttendanceStatsAction(),
    supabase.from("school_teachers").select("id", { count: "exact", head: true }).eq("business_id", bid).eq("active", true),
    supabase.from("student_payments").select("amount, paidAt:paid_at").eq("business_id", bid).gte("paid_at", since),
    supabase.from("school_classes").select("id", { count: "exact", head: true }).eq("business_id", bid),
  ]);

  const active = students.filter((s) => s.active);
  const newThisMonth = active.filter((s) => (s.enrolledAt ?? "") >= monthStart).length;
  const left = students.length - active.length;
  const pay = (payments ?? []) as { amount: number; paidAt: string }[];
  const collected = pay.reduce((s, p) => s + Number(p.amount), 0);
  const todayTotal = pay.filter((p) => p.paidAt.slice(0, 10) === today).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = active.reduce((s, st) => s + st.remaining, 0);
  const unpaidCount = active.filter((s) => s.remaining > 0).length;
  const boys = active.filter((s) => s.sex === "M").length;
  const girls = active.filter((s) => s.sex === "F").length;

  // Encaissements des 6 derniers mois (barres simples).
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: MONTHS[d.getMonth()], total: pay.filter((p) => p.paidAt.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0) };
  });
  const maxMonth = Math.max(1, ...months.map((m) => m.total));

  // Effectifs par classe.
  const byClass = new Map<string, number>();
  for (const s of active) byClass.set(s.className ?? "Sans classe", (byClass.get(s.className ?? "Sans classe") ?? 0) + 1);
  const classSizes = [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
  const maxClass = Math.max(1, ...classSizes.map(([, n]) => n));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Tableau de bord de l&apos;école</h1>
          <p className="text-sm text-zinc-500">Année scolaire {currentSchoolYear()}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Élèves et personnel</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Élèves inscrits" value={active.length} href="/ecole/eleves" />
          <Tile label="Nouveaux ce mois" value={newThisMonth} />
          <Tile label="Garçons / filles" value={`${boys} / ${girls}`} />
          <Tile label="Élèves partis" value={left} href="/ecole/eleves?partis=1" />
          <Tile label="Classes" value={classCount ?? 0} href="/ecole/classes" />
          <Tile label="Enseignants" value={teacherCount ?? 0} href="/ecole/enseignants" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Finances</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Encaissé depuis la rentrée" value={formatMoney(collected, currency)} tone="text-emerald-600" />
          <Tile label="Encaissé aujourd'hui" value={formatMoney(todayTotal, currency)} />
          <Tile label="Reste à encaisser" value={formatMoney(remaining, currency)} tone="text-red-600" href="/ecole/impayes" />
          <Tile label="Élèves en retard de paiement" value={unpaidCount} tone={unpaidCount ? "text-red-600" : undefined} href="/ecole/impayes" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Présences</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Absents aujourd'hui" value={attendance.today.absents} tone={attendance.today.absents ? "text-red-600" : undefined} href="/ecole/presences" />
          <Tile label="Retards aujourd'hui" value={attendance.today.retards} tone={attendance.today.retards ? "text-amber-600" : undefined} href="/ecole/presences" />
          <Tile label="Absences ce mois" value={attendance.month.absents} />
          <Tile label="Retards ce mois" value={attendance.month.retards} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold text-zinc-900">Encaissements des 6 derniers mois</h2>
            <div className="flex h-40 items-end gap-2">
              {months.map((m) => (
                <div key={m.key} className="flex h-full flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-emerald-600"
                      style={{ height: `${(m.total / maxMonth) * 100}%`, minHeight: m.total ? 4 : 0 }}
                      title={formatMoney(m.total, currency)}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500">{m.label}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <h2 className="font-semibold text-zinc-900">Effectifs par classe</h2>
            {classSizes.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun élève inscrit.</p>
            ) : (
              classSizes.map(([name, n]) => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 truncate text-zinc-700">{name}</span>
                  <div className="h-3 flex-1 rounded bg-zinc-100 dark:bg-slate-800">
                    <div className="h-3 rounded bg-blue-600" style={{ width: `${(n / maxClass) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-zinc-500">{n}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
