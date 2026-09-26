"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle, MessageSquare, Printer } from "lucide-react";
import { SessionReport, type SessionReportData } from "@/components/sales/SessionReport";
import { Button } from "@/components/ui/Button";
import { printDocument } from "@/lib/print";

export function SessionReportView({
  data,
  eveningReportText = null,
}: {
  data: SessionReportData;
  /** Bilan prêt à envoyer au gérant (flag rapport_soir_whatsapp) — voir lib/evening-report.ts. */
  eveningReportText?: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/ventes" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour à la caisse
        </Link>
        <Button onClick={() => printDocument("A4")}>
          <Printer className="h-4 w-4" /> Imprimer
        </Button>
      </div>

      {eveningReportText && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 print:hidden dark:border-emerald-400/20 dark:bg-emerald-500/10">
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">Envoyer le bilan au gérant</p>
            <p className="mt-1 whitespace-pre-line rounded-lg bg-white px-3 py-2 text-sm text-zinc-700 dark:bg-slate-900 dark:text-slate-200">
              {eveningReportText}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(eveningReportText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> Envoyer au gérant (WhatsApp)
            </a>
            <a
              href={`sms:?body=${encodeURIComponent(eveningReportText)}`}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-300"
            >
              <MessageSquare className="h-4 w-4" /> Par SMS
            </a>
          </div>
        </div>
      )}

      <SessionReport data={data} />
    </div>
  );
}
