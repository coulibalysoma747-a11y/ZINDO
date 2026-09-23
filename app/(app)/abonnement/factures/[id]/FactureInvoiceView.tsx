"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { formatMoney, formatLongDate } from "@/lib/format";
import { printDocument } from "@/lib/print";

const STATUS_TONE = { "En attente": "amber", Payée: "emerald", Annulée: "zinc" } as const;

export function FactureInvoiceView({
  invoice,
  businessName,
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
  };
  businessName: string;
  cycleLabel: string;
  statusLabel: keyof typeof STATUS_TONE;
  currency: string;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/abonnement" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;abonnement
        </Link>
        <Button variant="outline" size="sm" onClick={() => printDocument("A4")}>
          <Printer className="h-3.5 w-3.5" /> Imprimer / Télécharger
        </Button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 print:border-0 print:shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ZindoLogo size={32} />
            <span className="text-lg font-extrabold tracking-tight text-zindo-ink-900">ZINDO</span>
          </div>
          <Badge tone={STATUS_TONE[statusLabel]}>{statusLabel}</Badge>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Facture</p>
            <p className="font-mono text-sm font-semibold text-zinc-900">{invoice.number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Date</p>
            <p className="text-sm text-zinc-700">{formatLongDate(invoice.createdAt)}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Commerce</p>
          <p className="text-sm font-medium text-zinc-900">{businessName}</p>
        </div>

        <div className="mt-6 rounded-xl bg-zinc-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">
              Abonnement {invoice.planLabel} — {cycleLabel}
            </p>
            <p className="text-base font-bold text-zinc-900">{formatMoney(invoice.amount, currency)}</p>
          </div>
        </div>

        <div className="mt-6 space-y-1 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
          {invoice.paymentMethod && <p>Moyen de paiement : {invoice.paymentMethod === "CINETPAY" ? "CinetPay" : "Mobile Money (manuel)"}</p>}
          {invoice.paymentReference && <p>Référence : <span className="font-mono">{invoice.paymentReference}</span></p>}
          {invoice.paidAt && <p>Payée le {formatLongDate(invoice.paidAt)}</p>}
        </div>
      </div>
    </div>
  );
}
