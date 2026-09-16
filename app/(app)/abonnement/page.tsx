import { Crown, Sparkles, ShieldAlert, Clock } from "lucide-react";
import { requireUserForBilling } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CycleChoice } from "./CycleChoice";
import { PaymentProofForm } from "./PaymentProofForm";
import { PaymentMethodModules } from "./PaymentMethodModules";

const CYCLE_LABELS = { MONTHLY: "Mensuel", ANNUAL: "Annuel" } as const;
const INVOICE_STATUS_TONE = { EN_ATTENTE: "amber", PAYEE: "emerald", ANNULEE: "zinc" } as const;
const INVOICE_STATUS_LABELS = { EN_ATTENTE: "En attente", PAYEE: "Payée", ANNULEE: "Annulée" } as const;

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

export default async function SubscriptionPage() {
  const user = await requireUserForBilling();
  const currency = user.business.currency;

  const [state, { data: pendingInvoiceData }, { data: invoiceHistoryData }] = await Promise.all([
    getSubscriptionState(user.businessId),
    supabase
      .from("subscription_invoices")
      .select(
        "id, number, planLabel:plan_label, billingCycle:billing_cycle, amount, status, paymentReference:payment_reference, createdAt:created_at"
      )
      .eq("business_id", user.businessId)
      .eq("status", "EN_ATTENTE")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("subscription_invoices")
      .select(
        "id, number, planLabel:plan_label, billingCycle:billing_cycle, amount, status, paymentReference:payment_reference, createdAt:created_at"
      )
      .eq("business_id", user.businessId)
      .neq("status", "EN_ATTENTE")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const pendingInvoice = ((pendingInvoiceData ?? []) as unknown as InvoiceRow[])[0] ?? null;
  const invoiceHistory = (invoiceHistoryData ?? []) as unknown as InvoiceRow[];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-bold text-zinc-900">Abonnement</h1>
        </div>
        <p className="text-sm text-zinc-500">
          ZINDO est payant : 7 jours d&apos;essai gratuit, puis 10 000 FCFA/mois ou 100 000 FCFA/an.
        </p>
      </div>

      {state.status === "TRIAL" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardBody className="flex items-center gap-3">
            <Clock className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Essai gratuit — {state.trialDaysLeft === 0 ? "se termine aujourd'hui" : `${state.trialDaysLeft} jour(s) restant(s)`}
              </p>
              <p className="text-xs text-zinc-500">
                Réglez votre abonnement avant la fin de l&apos;essai pour ne pas perdre l&apos;accès à ZINDO.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {(state.status === "EXPIRED" || state.status === "PAST_DUE") && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {state.status === "EXPIRED" ? "Votre essai gratuit est terminé" : "Votre paiement n'est plus à jour"}
              </p>
              <p className="text-xs text-zinc-600">
                L&apos;accès à ZINDO est bloqué pour toute l&apos;équipe jusqu&apos;au règlement de l&apos;abonnement.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {state.status === "ACTIVE" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardBody className="flex items-center gap-3">
            <Badge tone="emerald">Abonnement actif</Badge>
            {state.currentPeriodEnd && (
              <p className="text-sm text-zinc-700">
                Renouvellement le {formatDateTime(new Date(state.currentPeriodEnd))}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {pendingInvoice && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Facture en attente</h2>
            <Badge tone="amber">En attente de confirmation</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-zinc-700">
              {pendingInvoice.number} — {pendingInvoice.planLabel} ({CYCLE_LABELS[pendingInvoice.billingCycle]}) —{" "}
              <span className="font-semibold">{formatMoney(pendingInvoice.amount, currency)}</span>
            </p>
            <div className="space-y-3 rounded-lg bg-white p-3">
              <p className="text-sm text-zinc-600">
                Envoyez <span className="font-semibold text-zinc-900">{formatMoney(pendingInvoice.amount, currency)}</span> à
                Coulibaly Soma, puis indiquez la référence de la transaction ci-dessous. Un administrateur
                confirmera votre paiement sous peu.
              </p>
              <PaymentMethodModules />
            </div>
            {pendingInvoice.paymentReference ? (
              <p className="text-sm text-emerald-700">
                Référence déjà envoyée : <span className="font-mono">{pendingInvoice.paymentReference}</span> — en
                attente de confirmation par l&apos;administrateur.
              </p>
            ) : (
              <PaymentProofForm invoiceId={pendingInvoice.id} />
            )}
          </CardBody>
        </Card>
      )}

      <Card className="border-zindo-ink-900/10 bg-zindo-ink-900">
        <CardBody className="flex flex-wrap items-start gap-3 sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-zindo-green-400" />
          <div>
            <p className="text-sm font-medium text-white">Pourquoi ZINDO ?</p>
            <p className="mt-0.5 text-xs text-slate-300">
              ZINDO remplace vos cahiers et fichiers Excel : stock en temps réel, ventes enregistrées
              automatiquement, bénéfices calculés pour vous — plus besoin de tout recompter à la main.
            </p>
          </div>
        </CardBody>
      </Card>

      {!pendingInvoice && state.status !== "ACTIVE" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Choisir votre formule</h2>
          </CardHeader>
          <CardBody>
            <CycleChoice />
          </CardBody>
        </Card>
      )}

      {invoiceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Historique des factures</h2>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">N°</th>
                  <th className="px-4 py-2 font-medium">Palier</th>
                  <th className="px-4 py-2 font-medium">Montant</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
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
