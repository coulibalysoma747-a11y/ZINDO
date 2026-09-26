import Link from "next/link";
import { Award, Gift, ShieldAlert, RefreshCw, FileText } from "lucide-react";
import { requireUserForBilling } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/subscription";
import { getTrialDays } from "@/lib/platform-config";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatLongDate } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { FormulaChoice, MONTHLY_PRICE, ANNUAL_PRICE } from "./FormulaChoice";
import { PaymentProofForm } from "./PaymentProofForm";
import { PaymentMethodModules } from "./PaymentMethodModules";

const CYCLE_LABELS = { MONTHLY: "mensuel", ANNUAL: "annuel" } as const;
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
  const trialDays = await getTrialDays();
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
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const pendingInvoice = ((pendingInvoiceData ?? []) as unknown as InvoiceRow[])[0] ?? null;
  const invoiceHistory = (invoiceHistoryData ?? []) as unknown as InvoiceRow[];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Abonnement</h1>
        <p className="text-sm text-zinc-500">
          Consultez votre formule, sa date de renouvellement, et souscrivez en quelques étapes.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  state.status === "ACTIVE"
                    ? "bg-zindo-green-50 text-zindo-green-600"
                    : state.status === "TRIAL"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-red-50 text-red-600"
                }`}
              >
                {state.status === "ACTIVE" ? (
                  <Award className="h-5 w-5" />
                ) : state.status === "TRIAL" ? (
                  <Gift className="h-5 w-5" />
                ) : (
                  <ShieldAlert className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-bold text-zinc-900">
                  {state.status === "ACTIVE"
                    ? `${state.planLabel} (${CYCLE_LABELS[state.billingCycle ?? "MONTHLY"]})`
                    : state.status === "TRIAL"
                      ? "Essai gratuit"
                      : "Aucun abonnement actif"}
                </p>
                <p className="text-sm text-zinc-500">
                  {state.status === "ACTIVE"
                    ? `${formatMoney(state.billingCycle === "ANNUAL" ? ANNUAL_PRICE : MONTHLY_PRICE, currency)} / ${state.billingCycle === "ANNUAL" ? "an" : "mois"}`
                    : state.status === "TRIAL"
                      ? `0 FCFA pendant ${trialDays} jours`
                      : "Accès bloqué jusqu'au paiement"}
                </p>
              </div>
            </div>
            <Badge tone={state.status === "ACTIVE" ? "emerald" : state.status === "TRIAL" ? "blue" : "red"}>
              {state.status === "ACTIVE" ? "Actif" : state.status === "TRIAL" ? "Essai" : "Bloqué"}
            </Badge>
          </div>

          {(state.status === "ACTIVE" || state.status === "TRIAL") && (
            <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  {state.status === "TRIAL" ? "Fin d'essai" : "Renouvellement"}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                  {(() => {
                    const date = state.status === "TRIAL" ? state.trialEndsAt : state.currentPeriodEnd;
                    return date ? formatLongDate(date) : "—";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Temps restant</p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                  {(() => {
                    const days = state.status === "TRIAL" ? state.trialDaysLeft : state.periodDaysLeft;
                    return days === null ? "—" : `${days} jour(s)`;
                  })()}
                </p>
              </div>
            </div>
          )}

          {!pendingInvoice && (
            <a
              href="#formules"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zindo-green-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-zindo-green-600"
            >
              <RefreshCw className="h-4 w-4" /> Souscrire / Renouveler
            </a>
          )}
        </CardBody>
      </Card>

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

      <Card id="formules">
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Nos formules</h2>
        </CardHeader>
        <CardBody>
          <FormulaChoice disabled={!!pendingInvoice} />
        </CardBody>
      </Card>

      {invoiceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Mes factures</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {invoiceHistory.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      Abonnement {CYCLE_LABELS[inv.billingCycle]} — {inv.number}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatLongDate(inv.createdAt)} · {formatMoney(inv.amount, currency)}
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge tone={INVOICE_STATUS_TONE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                  <ButtonLink href={`/abonnement/factures/${inv.id}`} variant="outline" size="sm">
                    Voir / Télécharger
                  </ButtonLink>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <p className="text-center text-xs text-zinc-400">
        Besoin d&apos;aide avec votre abonnement ?{" "}
        <Link href="/support" className="font-medium text-zindo-green-600 hover:underline">
          Contactez le support
        </Link>
        .
      </p>
    </div>
  );
}
