"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { formatMoney, formatLongDate } from "@/lib/format";
import { printDocument } from "@/lib/print";

const STAMP = {
  Payée: "border-emerald-600 text-emerald-600",
  "En attente": "border-amber-500 text-amber-500",
  Annulée: "border-red-500 text-red-500",
} as const;

const EXACT = "print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]";

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zindo-green-600">{children}</p>;
}

export function FactureInvoiceView({
  invoice,
  business,
  cycleLabel,
  statusLabel,
  currency,
}: {
  invoice: {
    number: string;
    planLabel: string;
    amount: number;
    paymentMethod: string | null;
    paymentReference: string | null;
    createdAt: string;
    paidAt: string | null;
    payerLastName: string | null;
    payerFirstName: string | null;
    payerPhone: string | null;
  };
  business: { name: string; phone: string | null; address: string | null; city: string | null; country: string | null };
  cycleLabel: string;
  statusLabel: keyof typeof STAMP;
  currency: string;
}) {
  const payerName = [invoice.payerFirstName, invoice.payerLastName?.toUpperCase()].filter(Boolean).join(" ");
  const paid = statusLabel === "Payée";
  const duration = cycleLabel === "Annuel" ? "12 mois" : "1 mois";
  const money = (n: number) => formatMoney(n, currency);
  // Même calcul que activateInvoicePayment : la période démarre au paiement.
  let periodEnd: Date | null = null;
  if (invoice.paidAt) {
    periodEnd = new Date(invoice.paidAt);
    if (cycleLabel === "Annuel") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/abonnement" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;abonnement
        </Link>
        <Button variant="outline" size="sm" onClick={() => printDocument("A4")}>
          <Printer className="h-3.5 w-3.5" /> Imprimer / Télécharger
        </Button>
      </div>

      <article className="relative overflow-hidden bg-white text-zinc-800 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] print:shadow-none">
        <div className={`h-2 bg-zindo-green-600 ${EXACT}`} />

        <div className="px-6 py-10 sm:px-12">
          {/* En-tête */}
          <header className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5">
                <ZindoLogo size={40} />
                <span className="text-2xl font-extrabold tracking-tight text-zindo-ink-900">ZINDO</span>
              </div>
              <div className="mt-3 text-xs leading-5 text-zinc-500">
                <p>Logiciel de gestion de stock et de ventes</p>
                <p>Burkina Faso</p>
                <p>+226 04 05 99 29</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-light uppercase tracking-[0.2em] text-zindo-ink-900">Facture</h1>
              <dl className="mt-4 grid grid-cols-[auto_auto] justify-end gap-x-6 gap-y-1 text-xs">
                <dt className="text-zinc-400">N°</dt>
                <dd className="font-mono font-semibold text-zinc-900">{invoice.number}</dd>
                <dt className="text-zinc-400">Date</dt>
                <dd className="text-zinc-900">{formatLongDate(invoice.createdAt)}</dd>
                {invoice.paidAt && (
                  <>
                    <dt className="text-zinc-400">Réglée le</dt>
                    <dd className="text-zinc-900">{formatLongDate(invoice.paidAt)}</dd>
                  </>
                )}
                {periodEnd && (
                  <>
                    <dt className="text-zinc-400">Fin d&apos;abonnement</dt>
                    <dd className="font-semibold text-zindo-green-600">{formatLongDate(periodEnd.toISOString())}</dd>
                  </>
                )}
              </dl>
            </div>
          </header>

          {/* Parties */}
          <section className="mt-12 grid gap-8 border-t border-zinc-200 pt-8 sm:grid-cols-2">
            <div>
              <Caption>Facturé à</Caption>
              <p className="font-semibold text-zinc-900">{business.name}</p>
              <div className="text-sm leading-6 text-zinc-500">
                {business.address && <p>{business.address}</p>}
                {(business.city || business.country) && <p>{[business.city, business.country].filter(Boolean).join(", ")}</p>}
                {business.phone && <p>{business.phone}</p>}
              </div>
            </div>
            {payerName && (
              <div>
                <Caption>Règlement effectué par</Caption>
                <p className="font-semibold text-zinc-900">{payerName}</p>
                {invoice.payerPhone && <p className="text-sm leading-6 text-zinc-500">{invoice.payerPhone}</p>}
              </div>
            )}
          </section>

          {/* Détail */}
          <table className="mt-10 w-full text-sm tabular-nums">
            <thead>
              <tr className={`bg-zindo-ink-900 text-left text-[10px] uppercase tracking-[0.15em] text-white ${EXACT}`}>
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 text-center font-semibold">Qté</th>
                <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">Prix unitaire</th>
                <th className="px-4 py-3 text-right font-semibold">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-200">
                <td className="px-4 py-5">
                  <p className="font-semibold text-zinc-900">Abonnement ZINDO {invoice.planLabel}</p>
                  <p className="text-xs text-zinc-500">
                    Formule {cycleLabel === "Annuel" ? "annuelle" : "mensuelle"} — accès complet pendant {duration}
                  </p>
                  {invoice.paidAt && periodEnd && (
                    <p className={`mt-2 inline-block rounded bg-zindo-green-50 px-2 py-1 text-xs font-medium text-zindo-green-700 ${EXACT}`}>
                      Période : du {formatLongDate(invoice.paidAt)} au {formatLongDate(periodEnd.toISOString())}
                    </p>
                  )}
                </td>
                <td className="px-4 py-5 text-center">1</td>
                <td className="hidden px-4 py-5 text-right sm:table-cell">{money(invoice.amount)}</td>
                <td className="px-4 py-5 text-right font-semibold text-zinc-900">{money(invoice.amount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totaux */}
          <div className="relative mt-6 flex justify-end">
            <div
              className={`pointer-events-none absolute left-2 top-2 -rotate-12 rounded-md border-[3px] px-5 py-2 text-2xl font-black uppercase tracking-[0.2em] opacity-80 sm:left-10 ${STAMP[statusLabel]}`}
            >
              {statusLabel}
            </div>
            <dl className="w-full max-w-xs text-sm tabular-nums">
              <div className="flex justify-between py-1.5 text-zinc-500">
                <dt>Sous-total</dt>
                <dd>{money(invoice.amount)}</dd>
              </div>
              <div className={`mt-2 flex items-center justify-between bg-zindo-green-600 px-4 py-3 text-white ${EXACT}`}>
                <dt className="text-xs font-bold uppercase tracking-[0.15em]">Total</dt>
                <dd className="text-xl font-bold">{money(invoice.amount)}</dd>
              </div>
              {paid && (
                <div className="flex justify-between py-1.5 pt-3 text-zinc-500">
                  <dt>Reste à payer</dt>
                  <dd className="font-semibold text-zinc-900">{money(0)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Règlement */}
          {(invoice.paymentMethod || invoice.paymentReference) && (
            <section className="mt-12">
              <Caption>Informations de règlement</Caption>
              <div className="grid gap-4 border-l-2 border-zindo-green-600 pl-4 text-sm sm:grid-cols-2">
                {invoice.paymentMethod && (
                  <p>
                    <span className="text-zinc-400">Mode : </span>
                    {invoice.paymentMethod === "CINETPAY" ? "CinetPay" : "Mobile Money"}
                  </p>
                )}
                {invoice.paymentReference && (
                  <p>
                    <span className="text-zinc-400">Référence : </span>
                    <span className="font-mono">{invoice.paymentReference}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          <footer className="mt-14 border-t border-zinc-200 pt-6 text-center">
            <p className="text-sm font-medium text-zindo-ink-900">Merci pour votre confiance.</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              ZINDO · Burkina Faso · +226 04 05 99 29 · Montants exprimés en francs CFA (XOF)
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
