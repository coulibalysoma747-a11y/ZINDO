import { Crown, Sparkles } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PlanComparison } from "./PlanComparison";
import { PaymentProofForm } from "./PaymentProofForm";
import { PaymentMethodModules } from "./PaymentMethodModules";

const CYCLE_LABELS = { MONTHLY: "Mensuel", ANNUAL: "Annuel" } as const;
const INVOICE_STATUS_TONE = { EN_ATTENTE: "amber", PAYEE: "emerald", ANNULEE: "zinc" } as const;
const INVOICE_STATUS_LABELS = { EN_ATTENTE: "En attente", PAYEE: "Payée", ANNULEE: "Annulée" } as const;

type PlanRow = {
  id: string;
  key: string;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
  maxProducts: number | null;
  maxUsers: number | null;
  maxLocations: number | null;
  features: string;
};
type SubscriptionRow = {
  billingCycle: "MONTHLY" | "ANNUAL";
  currentPeriodEnd: string | null;
  plan: PlanRow;
};
type InvoiceRow = {
  id: string;
  number: string;
  planLabel: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  amount: number;
  status: keyof typeof INVOICE_STATUS_LABELS;
  paymentReference: string | null;
  createdAt: string;
};

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

  const [
    { data: subscriptionData },
    { data: plansData },
    { count: productCount },
    { count: userCount },
    { count: locationCount },
    { data: pendingInvoiceData },
    { data: invoiceHistoryData },
  ] = await Promise.all([
    supabase
      .from("business_subscriptions")
      .select(
        "billingCycle:billing_cycle, currentPeriodEnd:current_period_end, " +
          "plan:subscription_plans(id, key, label, monthlyPrice:monthly_price, annualPrice:annual_price, maxProducts:max_products, maxUsers:max_users, maxLocations:max_locations, features)"
      )
      .eq("business_id", user.businessId)
      .maybeSingle(),
    supabase
      .from("subscription_plans")
      .select("id, key, label, monthlyPrice:monthly_price, annualPrice:annual_price, maxProducts:max_products, maxUsers:max_users, maxLocations:max_locations, features")
      .order("order", { ascending: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("active", true),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("active", true),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("active", true),
    supabase
      .from("subscription_invoices")
      .select("id, number, planLabel:plan_label, billingCycle:billing_cycle, amount, status, paymentReference:payment_reference, createdAt:created_at")
      .eq("business_id", user.businessId)
      .eq("status", "EN_ATTENTE")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("subscription_invoices")
      .select("id, number, planLabel:plan_label, billingCycle:billing_cycle, amount, status, paymentReference:payment_reference, createdAt:created_at")
      .eq("business_id", user.businessId)
      .neq("status", "EN_ATTENTE")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const subscription = subscriptionData as unknown as SubscriptionRow | null;
  const plans = (plansData ?? []) as unknown as PlanRow[];
  const pendingInvoice = ((pendingInvoiceData ?? []) as unknown as InvoiceRow[])[0] ?? null;
  const invoiceHistory = (invoiceHistoryData ?? []) as unknown as InvoiceRow[];

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
                ` — renouvellement le ${formatDateTime(new Date(subscription.currentPeriodEnd))}`}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UsageBar label="Produits" current={productCount ?? 0} max={subscription?.plan.maxProducts ?? null} />
            <UsageBar label="Utilisateurs" current={userCount ?? 0} max={subscription?.plan.maxUsers ?? null} />
            <UsageBar label="Boutiques" current={locationCount ?? 0} max={subscription?.plan.maxLocations ?? null} />
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

      <Card className="border-zindo-ink-900/10 bg-zindo-ink-900 dark:border-slate-700">
        <CardBody className="flex flex-wrap items-start gap-3 sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-zindo-green-400" />
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
                    <td className="px-4 py-2 text-zinc-500">{formatDateTime(new Date(inv.createdAt))}</td>
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
