import { Crown, Sparkles } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PlanComparison } from "./PlanComparison";
import { PaymentProofForm } from "./PaymentProofForm";
import { PaymentMethodModules } from "./PaymentMethodModules";

const CYCLE_LABELS = { MONTHLY: "Mensuel", ANNUAL: "Annuel" } as const;
const INVOICE_STATUS_TONE = { EN_ATTENTE: "amber", PAYEE: "emerald", ANNULEE: "zinc" } as const;
const INVOICE_STATUS_LABELS = { EN_ATTENTE: "En attente", PAYEE: "Payée", ANNULEE: "Annulée" } as const;

function UsageBar({ label, current, max }: { label: string; current: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const isFull = max !== null && current >= max;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span className={isFull ? "font-semibold text-red-600" : ""}>
          {current} {max !== null ? `/ ${max}` : "(illimité)"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-800">
        {max !== null && (
          <div
            className={`h-full rounded-full ${isFull ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default async function SubscriptionPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const [subscription, plans, productCount, userCount, locationCount, pendingInvoice, invoiceHistory] =
    await Promise.all([
      prisma.businessSubscription.findUnique({ where: { businessId: user.businessId }, include: { plan: true } }),
      prisma.subscriptionPlan.findMany({ orderBy: { order: "asc" } }),
      prisma.product.count({ where: { businessId: user.businessId, active: true } }),
      prisma.user.count({ where: { businessId: user.businessId, active: true } }),
      prisma.location.count({ where: { businessId: user.businessId, active: true } }),
      prisma.subscriptionInvoice.findFirst({
        where: { businessId: user.businessId, status: "EN_ATTENTE" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscriptionInvoice.findMany({
        where: { businessId: user.businessId, status: { not: "EN_ATTENTE" } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const currency = user.business.currency;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-bold text-zinc-900">Abonnement</h1>
        </div>
        <p className="text-sm text-zinc-500">Votre palier actuel, votre utilisation et les options disponibles.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Palier actuel</h2>
          {subscription ? (
            <Badge tone="emerald">{subscription.plan.label}</Badge>
          ) : (
            <Badge tone="zinc">Aucun palier — accès illimité</Badge>
          )}
        </CardHeader>
        <CardBody className="space-y-4">
          {subscription && (
            <p className="text-xs text-zinc-500">
              Cycle : {CYCLE_LABELS[subscription.billingCycle]}
              {subscription.currentPeriodEnd &&
                ` — renouvellement le ${formatDateTime(subscription.currentPeriodEnd)}`}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UsageBar label="Produits" current={productCount} max={subscription?.plan.maxProducts ?? null} />
            <UsageBar label="Utilisateurs" current={userCount} max={subscription?.plan.maxUsers ?? null} />
            <UsageBar label="Boutiques" current={locationCount} max={subscription?.plan.maxLocations ?? null} />
          </div>
        </CardBody>
      </Card>

      {pendingInvoice && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-500/10">
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Facture en attente</h2>
            <Badge tone="amber">En attente de confirmation</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-zinc-700">
              {pendingInvoice.number} — {pendingInvoice.planLabel} ({CYCLE_LABELS[pendingInvoice.billingCycle]}) —{" "}
              <span className="font-semibold">{formatMoney(pendingInvoice.amount, currency)}</span>
            </p>
            <div className="space-y-3 rounded-lg bg-white p-3 dark:bg-slate-900">
              <p className="text-sm text-zinc-600">
                Envoyez <span className="font-semibold text-zinc-900">{formatMoney(pendingInvoice.amount, currency)}</span> à
                Coulibaly Soma, puis indiquez la référence de la transaction ci-dessous. Un administrateur
                confirmera votre paiement sous peu.
              </p>
              <PaymentMethodModules />
            </div>
            {pendingInvoice.paymentReference ? (
              <p className="text-sm text-emerald-700">
                Référence déjà envoyée : <span className="font-mono">{pendingInvoice.paymentReference}</span> —
                en attente de confirmation par l&apos;administrateur.
              </p>
            ) : (
              <PaymentProofForm invoiceId={pendingInvoice.id} />
            )}
          </CardBody>
        </Card>
      )}

      <Card className="border-zindo-navy-900/10 bg-zindo-navy-900 dark:border-slate-700">
        <CardBody className="flex flex-wrap items-start gap-3 sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-zindo-orange-400" />
          <div>
            <p className="text-sm font-medium text-white">Pourquoi ZINDO ?</p>
            <p className="mt-0.5 text-xs text-slate-300">
              ZINDO remplace vos cahiers et fichiers Excel : stock en temps réel, ventes enregistrées
              automatiquement, bénéfices calculés pour vous — plus besoin de tout recompter à la main.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Partenaire : <span className="font-medium text-slate-200">Faso Stock</span> — Propriétaire
              Mohamed Sare
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Changer de palier</h2>
        </CardHeader>
        <CardBody>
          <PlanComparison
            plans={plans.map((p) => ({
              id: p.id,
              key: p.key,
              label: p.label,
              monthlyPrice: p.monthlyPrice,
              annualPrice: p.annualPrice,
              maxProducts: p.maxProducts,
              maxUsers: p.maxUsers,
              maxLocations: p.maxLocations,
              features: JSON.parse(p.features) as string[],
            }))}
            currentPlanKey={subscription?.plan.key ?? null}
            currency={currency}
            hasPendingInvoice={!!pendingInvoice}
          />
        </CardBody>
      </Card>

      {invoiceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Historique des factures</h2>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2 font-medium">N°</th>
                  <th className="px-4 py-2 font-medium">Palier</th>
                  <th className="px-4 py-2 font-medium">Montant</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-slate-800">
                {invoiceHistory.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500">{inv.number}</td>
                    <td className="px-4 py-2 text-zinc-700">{inv.planLabel}</td>
                    <td className="px-4 py-2 text-zinc-700">{formatMoney(inv.amount, currency)}</td>
                    <td className="px-4 py-2">
                      <Badge tone={INVOICE_STATUS_TONE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{formatDateTime(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
