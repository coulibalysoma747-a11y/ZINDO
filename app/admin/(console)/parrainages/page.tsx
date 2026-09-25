import { Users, CheckCircle2, Crown } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { REFERRAL_SOURCES } from "@/lib/referral";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/Empty";
import { CancelReferralButton } from "./CancelReferralButton";

type Row = {
  id: string;
  code: string;
  source: string | null;
  status: "INSCRIT" | "VALIDE" | "ANNULE";
  rewardMonths: number;
  cancelledReason: string | null;
  createdAt: string;
  referrer: { id: string; name: string } | null;
  referred: { id: string; name: string; phone: string | null } | null;
};

const STATUS = {
  INSCRIT: { label: "Inscrit", tone: "zinc" },
  VALIDE: { label: "Validé", tone: "emerald" },
  ANNULE: { label: "Annulé", tone: "red" },
} as const;

export default async function AdminReferralsPage() {
  await requireSuperAdmin();

  const { data } = await supabase
    .from("referrals")
    .select(
      "id, code, source, status, rewardMonths:reward_months, cancelledReason:cancelled_reason, createdAt:created_at, referrer:businesses!referrals_referrer_business_id_fkey(id, name), referred:businesses!referrals_referred_business_id_fkey(id, name, phone)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as unknown as Row[];

  const bySource = new Map<string, number>();
  const byReferrer = new Map<string, { name: string; total: number; validated: number; months: number }>();
  for (const r of rows) {
    if (r.status === "ANNULE") continue;
    const source = r.source ?? "manuel";
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
    if (!r.referrer) continue;
    const ref = byReferrer.get(r.referrer.id) ?? { name: r.referrer.name, total: 0, validated: 0, months: 0 };
    ref.total++;
    if (r.status === "VALIDE") {
      ref.validated++;
      ref.months += r.rewardMonths;
    }
    byReferrer.set(r.referrer.id, ref);
  }
  const topReferrers = [...byReferrer.entries()]
    .sort((a, b) => b[1].validated - a[1].validated || b[1].total - a[1].total)
    .slice(0, 10);
  const validated = rows.filter((r) => r.status === "VALIDE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Parrainages</h1>
        <p className="text-sm text-zinc-500">
          Inscriptions venues des QR codes « Créé avec ZINDO » et des partages. La récompense du parrain est accordée
          automatiquement au premier paiement du filleul.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Filleuls inscrits" value={String(rows.filter((r) => r.status !== "ANNULE").length)} icon={Users} />
        <StatCard label="Filleuls payants (validés)" value={String(validated.length)} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Mois de Pro offerts" value={String(validated.reduce((s, r) => s + r.rewardMonths, 0))} icon={Crown} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Inscriptions par source</h2>
          </CardHeader>
          <CardBody className="space-y-1 text-sm">
            {bySource.size === 0 && <p className="text-zinc-500">Aucune donnée.</p>}
            {[...bySource.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => (
                <div key={source} className="flex justify-between">
                  <span>{REFERRAL_SOURCES[source] ?? source}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Meilleurs parrains</h2>
          </CardHeader>
          <CardBody className="space-y-1 text-sm">
            {topReferrers.length === 0 && <p className="text-zinc-500">Aucune donnée.</p>}
            {topReferrers.map(([id, r], i) => (
              <div key={id} className="flex justify-between gap-2">
                <span>
                  {i + 1}. {r.name}
                </span>
                <span className="text-zinc-500 tabular-nums">
                  {r.validated} validé(s) / {r.total} · {r.months} mois
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun parrainage" description="Les inscriptions par code de parrainage apparaîtront ici." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <CardBody key={r.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">
                  {r.referred?.name ?? "—"} <span className="font-normal text-zinc-500">parrainé par</span> {r.referrer?.name ?? "—"}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatDateTime(new Date(r.createdAt))} · code {r.code} · {REFERRAL_SOURCES[r.source ?? "manuel"] ?? r.source}
                  {r.referred?.phone && ` · ${r.referred.phone}`}
                  {r.cancelledReason && ` · Annulé : ${r.cancelledReason}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS[r.status].tone}>
                  {STATUS[r.status].label}
                  {r.status === "VALIDE" && r.rewardMonths > 0 && ` · +${r.rewardMonths} mois`}
                </Badge>
                {r.status !== "ANNULE" && <CancelReferralButton referralId={r.id} />}
              </div>
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}
