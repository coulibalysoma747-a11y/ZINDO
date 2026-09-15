"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Facture, type FactureData } from "@/components/sales/Facture";
import { Badge } from "@/components/ui/Badge";
import { ReceiptActions } from "./ReceiptActions";
import { CancelSaleButton } from "./CancelSaleButton";

export function FactureView({
  data,
  saleId,
  isCancelled,
  canEdit,
}: {
  data: FactureData;
  saleId: string;
  isCancelled: boolean;
  canEdit: boolean;
}) {
  const searchParams = useSearchParams();

  // Réimpression rapide depuis l'historique : ?print=1 déclenche l'impression
  // automatiquement dès que la facture est affichée.
  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    const timeout = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timeout);
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/ventes/historique" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;historique
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!isCancelled && canEdit && (
            <Link
              href={`/ventes/${saleId}/modifier`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          )}
          {!isCancelled && <CancelSaleButton saleId={saleId} />}
          <ReceiptActions saleNumber={data.invoiceNumber} />
        </div>
      </div>

      {isCancelled && <Badge tone="red" className="print:hidden">Facture annulée — stock réintégré</Badge>}

      <Facture data={data} />
    </div>
  );
}
