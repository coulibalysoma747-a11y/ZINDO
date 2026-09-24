import Link from "next/link";
import { Wallet, TrendingUp, Users, Receipt, Settings2, Clock, ShieldAlert } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { ACTIVE_PLAN_KEY } from "@/lib/subscription";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { InvoiceActions } from "./InvoiceActions";
import { BusinessPlanSelect } from "./BusinessPlanSelect";
import { ExtendTrialButton } from "./ExtendTrialButton";

const CYCLE_LABELS = { MONTHLY: "Mensuel", ANNUAL: "Annuel" } as const;
const INVOICE_STATUS_TONE = { EN_ATTENTE: "amber", PAYEE: "emerald", ANNULEE: "zinc" } as const;
const INVOICE_STATUS_LABELS = { EN_ATTENTE: "En attente", PAYEE: "Payée", ANNULEE: "Annulée" } as const;
const SUB_STATUS_TONE = { ACTIVE: "emerald", PAST_DUE: "amber", TRIAL: "blue", EXPIRED: "red" } as const;
const SUB_STATUS_LABELS = { ACTIVE: "Actif", PAST_DUE: "Impayé", TRIAL: "Essai", EXPIRED: "Essai expiré" } as const;

type PlanRow = { id: string; key: string; label: string; monthlyPrice: number; annualPrice: number };
type SubscriptionRow = {
  id: string;
  businessId: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  status: "ACTIVE" | "PAST_DUE" | "TRIAL" | "EXPIRED";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  business: { name: string };
  plan: { key: string; label: string; monthlyPrice: number; annualPrice: number };
};
type InvoiceRow = {
  id: string;
  number: string;
  planLabel: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  amount: number;
  status: keyof typeof INVOICE_STATUS_LABELS;
  paymentReference: string | null;
  proofNote: string | null;
  createdAt: string;
  paidAt: string | null;
  business: { name: string };
};

export default async function AdminSubscriptionsPage() {
  await requireSuperAdmin();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: plansData },
    { data: subscriptionsData },
    { data: pendingInvoicesData },
    { data: recentInvoicesData },
    { data: paidThisMonthData },
    { count: totalBusinesses },
    { count: subscribedBusinesses },
  ] = await Promise.all([
    // Seul le palier vendu (Pro) est proposé : les anciens paliers restent en base pour l'historique.
    supabase.from("subscription_plans").select("id, key, label, monthlyPrice:monthly_price, annualPrice:annual_price").eq("key", ACTIVE_PLAN_KEY),
    supabase
      .from("business_subscriptions")
      .select(
        "id, businessId:business_id, billingCycle:billing_cycle, status, trialEndsAt:trial_ends_at, currentPeriodEnd:current_period_end, business:businesses(name), plan:subscription_plans(key, label, monthlyPrice:monthly_price, annualPrice:annual_price)"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("subscription_invoices")
      .select("id, number, planLabel:plan_label, billingCycle:billing_cycle, amount, status, paymentReference:payment_reference, proofNote:proof_note, createdAt:created_at, business:businesses(name)")
      .eq("status", "EN_ATTENTE")
      .order("created_at", { ascending: true }),
    supabase
      .from("subscription_invoices")
      .select("id, number, planLabel:plan_label, billingCycle:billing_cycle, amount, status, createdAt:created_at, business:businesses(name)")
      .neq("status", "EN_ATTENTE")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("subscription_invoices").select("amount").eq("status", "PAYEE").gte("paid_at", monthStart.toISOString()),
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("business_subscriptions").select("id", { count: "exact", head: true }),
  ]);

  const plans = (plansData ?? []) as unknown as PlanRow[];
  const rawSubscriptions = (subscriptionsData ?? []) as unknown as SubscriptionRow[];
  const pendingInvoices = (pendingInvoicesData ?? []) as unknown as InvoiceRow[];
  const recentInvoices = (recentInvoicesData ?? []) as unknown as InvoiceRow[];
  const paidThisMonthAmount = ((paidThisMonthData ?? []) as Array<{ amount: number }>).reduce((s, i) => s + i.amount, 0);
  const businessesWithoutSub = (totalBusinesses ?? 0) - (subscribedBusinesses ?? 0);

  const now = new Date();
  const subscriptions = rawSubscriptions.map((s) => {
    let status = s.status;
    if (status === "TRIAL" && s.trialEndsAt && new Date(s.trialEndsAt) <= now) status = "EXPIRED";
    if (status === "ACTIVE" && s.currentPeriodEnd && new Date(s.currentPeriodEnd) <= now) status = "PAST_DUE";
    return { ...s, status };
  });

  const mrr = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => {
      const price = s.billingCycle === "ANNUAL" ? s.plan.annualPrice / 12 : s.plan.monthlyPrice;
      return sum + price;
    }, 0);
  const trialCount = subscriptions.filter((s) => s.status === "TRIAL").length;
  const blockedCount = subscriptions.filter((s) => s.status === "EXPIRED" || s.status === "PAST_DUE").length;

  const currency = "XOF";
  const stats = [
    { label: "Revenu mensuel récurrent (MRR)", value: formatMoney(Math.round(mrr), currency), icon: TrendingUp, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Encaissé ce mois-ci", value: formatMoney(paidThisMonthAmount, currency), icon: Wallet, tone: "text-zindo-green-600 bg-zindo-green-50" },
    { label: "En essai gratuit", value: trialCount, icon: Clock, tone: "text-blue-600 bg-blue-50" },
    { label: "Bloqués (essai expiré / impayé)", value: blockedCount, icon: ShieldAlert, tone: "text-red-600 bg-red-50" },
    { label: "Factures en attente", value: pendingInvoices.length, icon: Receipt, tone: "text-amber-600 bg-amber-50" },
    { label: "Commerces sans palier assigné", value: businessesWithoutSub, icon: Users, tone: "text-zinc-600 bg-zinc-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Abonnements &amp; revenus</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Chaque commerce démarre avec 7 jours d&apos;essai gratuit, puis doit régler son abonnement (7 500
            FCFA/mois ou 75 000 FCFA/an) pour continuer à utiliser ZINDO — l&apos;accès est bloqué automatiquement
            à l&apos;expiration de l&apos;essai ou de la période payée.
          </p>
        </div>
        <ButtonLink href="/admin/abonnements/plans" variant="outline">
          <Settings2 className="h-4 w-4" /> Gérer les paliers
        </ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className="text-lg font-bold text-zinc-900">{s.value}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Factures en attente de confirmation</h2>
        </CardHeader>
        {pendingInvoices.length === 0 ? (
          <CardBody>
            <EmptyState title="Aucune facture en attente" />
          </CardBody>
        ) : (
          <CardBody className="space-y-3">
            {pendingInvoices.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    {inv.number} — {inv.business.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {inv.planLabel} ({CYCLE_LABELS[inv.billingCycle]}) — {formatMoney(inv.amount, currency)} —{" "}
                    {formatDateTime(new Date(inv.createdAt))}
                  </p>
                  {inv.paymentReference ? (
                    <p className="mt-1 text-xs text-emerald-700">
                      Référence soumise : <span className="font-mono">{inv.paymentReference}</span>
                      {inv.proofNote && ` — « ${inv.proofNote} »`}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-400">Aucune référence de paiement soumise pour l&apos;instant</p>
                  )}
                </div>
                <InvoiceActions invoiceId={inv.id} />
              </div>
            ))}
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Commerces abonnés</h2>
        </CardHeader>
        {subscriptions.length === 0 ? (
          <CardBody>
            <EmptyState title="Aucun commerce n'a encore de palier assigné" />
          </CardBody>
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Commerce</th>
                  <th className="px-4 py-3 font-medium">Palier</th>
                  <th className="px-4 py-3 font-medium">Cycle</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Essai / fin de période</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/commercants/${s.businessId}`} className="font-medium text-zindo-green-600 hover:underline">
                        {s.business.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <BusinessPlanSelect businessId={s.businessId} planKey={s.plan.key} billingCycle={s.billingCycle} plans={plans} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{CYCLE_LABELS[s.billingCycle]}</td>
                    <td className="px-4 py-3">
                      <Badge tone={SUB_STATUS_TONE[s.status]}>{SUB_STATUS_LABELS[s.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {s.status === "TRIAL" || s.status === "EXPIRED"
                        ? s.trialEndsAt
                          ? formatDateTime(new Date(s.trialEndsAt))
                          : "—"
                        : s.currentPeriodEnd
                          ? formatDateTime(new Date(s.currentPeriodEnd))
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ExtendTrialButton businessId={s.businessId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Historique des factures</h2>
        </CardHeader>
        {recentInvoices.length === 0 ? (
          <CardBody>
            <EmptyState title="Aucune facture traitée pour le moment" />
          </CardBody>
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Commerce</th>
                  <th className="px-4 py-3 font-medium">Palier</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{inv.number}</td>
                    <td className="px-4 py-3 text-zinc-900">{inv.business.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{inv.planLabel}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatMoney(inv.amount, currency)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={INVOICE_STATUS_TONE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(inv.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
