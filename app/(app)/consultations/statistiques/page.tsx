import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { isConsultationsModuleEnabled } from "@/lib/actions/consultations";
import { AGE_GROUP_LABELS } from "@/lib/consultation-constants";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type Period = "semaine" | "mois" | "tout";

const PERIOD_LABELS: Record<Period, string> = { semaine: "7 derniers jours", mois: "Ce mois-ci", tout: "Depuis le début" };

function periodStart(period: Period): string | null {
  const now = new Date();
  if (period === "semaine") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (period === "mois") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return null;
}

export default async function ConsultationsStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");
  if (!(await isConsultationsModuleEnabled(user.businessId))) redirect("/dashboard");

  const { periode } = await searchParams;
  const period: Period = periode === "semaine" || periode === "tout" ? periode : "mois";
  const since = periodStart(period);
  const currency = user.business.currency;

  let consultationsQuery = supabase
    .from("consultations")
    .select("sex, ageGroup:age_group, diagnosis, fee, act:medical_acts(name)")
    .eq("business_id", user.businessId);
  if (since) consultationsQuery = consultationsQuery.gte("created_at", since);
  let expensesQuery = supabase.from("expenses").select("amount").eq("business_id", user.businessId);
  if (since) expensesQuery = expensesQuery.gte("date", since);

  const [{ data: consultationsData }, { data: expensesData }] = await Promise.all([consultationsQuery, expensesQuery]);
  const consultations = (consultationsData ?? []) as unknown as Array<{
    sex: "M" | "F";
    ageGroup: "ENFANT" | "ADULTE" | "SENIOR";
    diagnosis: string;
    fee: number;
    act: { name: string } | null;
  }>;
  const expenses = (expensesData ?? []) as unknown as Array<{ amount: number }>;

  const total = consultations.length;
  const recettes = consultations.reduce((sum, c) => sum + (c.fee || 0), 0);
  const depenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const benefice = recettes - depenses;

  const diagnosisCounts = new Map<string, number>();
  const actCounts = new Map<string, number>();
  const sexCounts = { M: 0, F: 0 };
  const ageCounts = { ENFANT: 0, ADULTE: 0, SENIOR: 0 };
  for (const c of consultations) {
    diagnosisCounts.set(c.diagnosis, (diagnosisCounts.get(c.diagnosis) ?? 0) + 1);
    if (c.act?.name) actCounts.set(c.act.name, (actCounts.get(c.act.name) ?? 0) + 1);
    sexCounts[c.sex] += 1;
    ageCounts[c.ageGroup] += 1;
  }
  const topDiagnoses = [...diagnosisCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0 }));
  const topActs = [...actCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0 }));

  const periods: Period[] = ["semaine", "mois", "tout"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Statistiques médicales</h1>
          <p className="text-sm text-zinc-500">{PERIOD_LABELS[period]}</p>
        </div>
        <div className="flex gap-1.5 rounded-lg bg-zinc-100 p-1">
          {periods.map((p) => (
            <Link
              key={p}
              href={`/consultations/statistiques?periode=${p}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                p === period ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Consultations</p>
              <p className="font-bold text-zinc-900">{total}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zindo-green-50 text-zindo-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Recettes</p>
              <p className="font-bold text-zinc-900">{formatMoney(recettes, currency)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Charges</p>
              <p className="font-bold text-zinc-900">{formatMoney(depenses, currency)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Bilan</p>
              <p className={`font-bold ${benefice >= 0 ? "text-zindo-green-600" : "text-red-600"}`}>{formatMoney(benefice, currency)}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Pathologies les plus fréquentes</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {topDiagnoses.length === 0 && <p className="text-sm text-zinc-500">Aucune donnée sur cette période.</p>}
            {topDiagnoses.map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-700">{d.name}</span>
                <span className="font-medium text-zinc-900">
                  {d.count} ({d.pct}%)
                </span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Actes les plus pratiqués</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {topActs.length === 0 && <p className="text-sm text-zinc-500">Aucune donnée sur cette période.</p>}
            {topActs.map((a) => (
              <div key={a.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-700">{a.name}</span>
                <span className="font-medium text-zinc-900">
                  {a.count} ({a.pct}%)
                </span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Profil de la patientèle</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-400">Par sexe</p>
              <div className="flex justify-between text-sm">
                <span>Masculin</span>
                <span className="font-medium">{sexCounts.M} ({total ? Math.round((sexCounts.M / total) * 100) : 0}%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Féminin</span>
                <span className="font-medium">{sexCounts.F} ({total ? Math.round((sexCounts.F / total) * 100) : 0}%)</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-400">Par tranche d&apos;âge</p>
              {(Object.keys(ageCounts) as Array<keyof typeof ageCounts>).map((k) => (
                <div key={k} className="flex justify-between text-sm">
                  <span>{AGE_GROUP_LABELS[k]}</span>
                  <span className="font-medium">
                    {ageCounts[k]} ({total ? Math.round((ageCounts[k] / total) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
