import Link from "next/link";
import { Wallet, TrendingUp, Users, Receipt, Settings2 } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { InvoiceActions } from "./InvoiceActions";
import { BusinessPlanSelect } from "./BusinessPlanSelect";

const CYCLE_LABELS = { MONTHLY: "Mensuel", ANNUAL: "Annuel" } as const;
const INVOICE_STATUS_TONE = { EN_ATTENTE: "amber", PAYEE: "emerald", ANNULEE: "zinc" } as const;
const INVOICE_STATUS_LABELS = { EN_ATTENTE: "En attente", PAYEE: "Payée", ANNULEE: "Annulée" } as const;

export default async function AdminSubscriptionsPage() {
  await requireSuperAdmin();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [plans, subscriptions, pendingInvoices, recentInvoices, paidThisMonth, businessesWithoutSub] =
    await Promise.all([
      prisma.subscriptionPlan.findMany({ orderBy: { order: "asc" } }),
      prisma.businessSubscription.findMany({ include: { business: true, plan: true }, orderBy: { updatedAt: "desc" } }),
      prisma.subscriptionInvoice.findMany({
        where: { status: "EN_ATTENTE" },
        include: { business: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.subscriptionInvoice.findMany({
        where: { status: { not: "EN_ATTENTE" } },
        include: { business: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.subscriptionInvoice.aggregate({
        where: { status: "PAYEE", paidAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.business.count({ where: { subscription: null } }),
    ]);

  const mrr = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => {
      const price = s.billingCycle === "ANNUAL" ? s.plan.annualPrice / 12 : s.plan.monthlyPrice;
      return sum + price;
    }, 0);

  const currency = "XOF";
  const stats = [
    { label: "Revenu mensuel récurrent (MRR)", value: formatMoney(Math.round(mrr), currency), icon: TrendingUp, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Encaissé ce mois-ci", value: formatMoney(paidThisMonth._sum.amount ?? 0, currency), icon: Wallet, tone: "text-zindo-green-600 bg-zindo-green-50" },
    { label: "Factures en attente", value: pendingInvoices.length, icon: Receipt, tone: "text-amber-600 bg-amber-50" },
    { label: "Commerces sans palier assigné", value: businessesWithoutSub, icon: Users, tone: "text-zinc-600 bg-zinc-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Abonnements &amp; revenus</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Un commerce sans palier assigné n&apos;a aucune restriction (comportement inchangé). Assignez un
            palier ci-dessous pour commencer à appliquer les limites et fonctionnalités correspondantes.
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
                    {formatDateTime(inv.createdAt)}
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
                  <th className="px-4 py-3 font-medium">Fin de période</th>
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
                      <Badge tone={s.status === "ACTIVE" ? "emerald" : "amber"}>
                        {s.status === "ACTIVE" ? "Actif" : "Impayé"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {s.currentPeriodEnd ? formatDateTime(s.currentPeriodEnd) : "—"}
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
                    <td className="px-4 py-3 text-zinc-600">{formatDateTime(inv.createdAt)}</td>
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
