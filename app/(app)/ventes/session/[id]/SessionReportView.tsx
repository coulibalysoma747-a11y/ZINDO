"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { SessionReport, type SessionReportData } from "@/components/sales/SessionReport";
import { Button } from "@/components/ui/Button";
import { printDocument } from "@/lib/print";

export function SessionReportView({ data }: { data: SessionReportData }) {
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

      <SessionReport data={data} />
    </div>
  );
}
