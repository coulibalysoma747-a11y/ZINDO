/* eslint-disable @next/next/no-img-element -- QR code en data URL. */
import { notFound } from "next/navigation";
import { Gift, Users, CheckCircle2, Crown } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { generateQrDataUrl } from "@/lib/qrcode";
import {
  ensureReferralCode,
  isReferralModuleEnabled,
  referralUrl,
  REFERRAL_REWARD_MONTHS,
  REFERRAL_SOURCES,
  REFERRAL_TRIAL_DAYS,
} from "@/lib/referral";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { ReferralShareButtons } from "./ReferralShareButtons";

type ReferralRow = {
  id: string;
  source: string | null;
  status: "INSCRIT" | "VALIDE" | "ANNULE";
  rewardMonths: number;
  createdAt: string;
  referred: { id: string; name: string } | null;
};

// Un filleul est "actif" dès qu'il utilise vraiment ZINDO.
const ACTIVE_SALES_THRESHOLD = 10;

export default async function ReferralPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!(await isReferralModuleEnabled(user.businessId))) notFound();

  const code = await ensureReferralCode(user.businessId);
  if (!code) {
    return <p className="text-sm text-red-600">Impossible de générer votre code de parrainage pour le moment. Réessayez plus tard.</p>;
  }
  const link = referralUrl(code, "whatsapp");
  const qrDataUrl = await generateQrDataUrl(referralUrl(code, "lien"));

  const { data } = await supabase
    .from("referrals")
    .select("id, source, status, rewardMonths:reward_months, createdAt:created_at, referred:businesses!referrals_referred_business_id_fkey(id, name)")
    .eq("referrer_business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  const referrals = (data ?? []) as unknown as ReferralRow[];

  const salesCounts = await Promise.all(
    referrals.map(async (r) => {
      if (!r.referred || r.status !== "INSCRIT") return 0;
      const { count } = await supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", r.referred.id);
      return count ?? 0;
    })
  );

  const monthsEarned = referrals.reduce((s, r) => s + (r.status === "VALIDE" ? r.rewardMonths : 0), 0);
  const validated = referrals.filter((r) => r.status === "VALIDE").length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-slate-100">Parrainage</h1>
          <p className="text-sm text-zinc-500">
            Invitez d&apos;autres commerçants : {REFERRAL_REWARD_MONTHS} mois de Pro offert pour vous dès que votre filleul paie son
            premier abonnement. Lui profite de {REFERRAL_TRIAL_DAYS} jours d&apos;essai au lieu de 14.
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-6">
          <img src={qrDataUrl} alt="QR code de parrainage" className="h-36 w-36 rounded-lg border border-zinc-200" />
          <div className="min-w-[220px] flex-1 space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-500">Votre code</p>
              <p className="font-mono text-3xl font-extrabold tracking-widest text-emerald-700">{code}</p>
            </div>
            <p className="break-all text-sm text-zinc-600 dark:text-slate-400">{link}</p>
            <ReferralShareButtons link={link} code={code} />
            <p className="text-xs text-zinc-500">
              Ce QR code figure aussi automatiquement en bas de vos demandes de prix et bons de commande.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Filleuls inscrits" value={String(referrals.length)} icon={Users} />
        <StatCard label="Filleuls validés" value={String(validated)} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Mois de Pro gagnés" value={String(monthsEarned)} icon={Crown} tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900 dark:text-slate-100">Mes filleuls</h2>
        </CardHeader>
        {referrals.length === 0 ? (
          <CardBody className="text-sm text-zinc-500">Aucun filleul pour l&apos;instant. Partagez votre lien !</CardBody>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-slate-800">
            {referrals.map((r, i) => {
              const active = r.status === "INSCRIT" && salesCounts[i] >= ACTIVE_SALES_THRESHOLD;
              return (
                <CardBody key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-slate-100">{r.referred?.name ?? "Commerce supprimé"}</p>
                    <p className="text-xs text-zinc-500">
                      Inscrit le {formatDate(new Date(r.createdAt))}
                      {r.source && ` · via ${REFERRAL_SOURCES[r.source] ?? r.source}`}
                    </p>
                  </div>
                  {r.status === "VALIDE" ? (
                    <Badge tone="emerald">🟢 Validé {r.rewardMonths > 0 ? `· +${r.rewardMonths} mois` : "· plafond atteint"}</Badge>
                  ) : r.status === "ANNULE" ? (
                    <Badge tone="red">Annulé</Badge>
                  ) : active ? (
                    <Badge tone="amber">🟠 Actif · en attente du 1er paiement</Badge>
                  ) : (
                    <Badge tone="zinc">🟡 Inscrit</Badge>
                  )}
                </CardBody>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
