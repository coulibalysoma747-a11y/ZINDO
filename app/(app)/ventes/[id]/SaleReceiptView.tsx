"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Receipt, type ReceiptData, type ReceiptWidth } from "@/components/sales/Receipt";
import { Badge } from "@/components/ui/Badge";
import { ReceiptActions } from "./ReceiptActions";
import { CancelSaleButton } from "./CancelSaleButton";

const WIDTH_OPTIONS: { value: ReceiptWidth; label: string }[] = [
  { value: "58mm", label: "58 mm" },
  { value: "80mm", label: "80 mm" },
  { value: "A4", label: "A4" },
];

export function SaleReceiptView({
  data,
  defaultWidth,
  saleId,
  isCancelled,
  canEdit,
}: {
  data: ReceiptData;
  defaultWidth: ReceiptWidth;
  saleId: string;
  isCancelled: boolean;
  canEdit: boolean;
}) {
  const [width, setWidth] = useState<ReceiptWidth>(defaultWidth);
  const searchParams = useSearchParams();

  // Réimpression rapide depuis l'historique : ?print=1 déclenche l'impression
  // automatiquement dès que le ticket est affiché.
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
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
            {WIDTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWidth(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  width === opt.value ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!isCancelled && canEdit && (
            <Link
              href={`/ventes/${saleId}/modifier`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          )}
          {!isCancelled && <CancelSaleButton saleId={saleId} />}
          <ReceiptActions saleNumber={data.ticketNumber} />
        </div>
      </div>

      {isCancelled && <Badge tone="red" className="print:hidden">Vente annulée — stock réintégré</Badge>}

      <Receipt data={data} width={width} />
    </div>
  );
}
