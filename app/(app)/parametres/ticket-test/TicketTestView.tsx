"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Receipt, type ReceiptData, type ReceiptWidth } from "@/components/sales/Receipt";
import { printDocument } from "@/lib/print";

const WIDTH_OPTIONS: { value: ReceiptWidth; label: string }[] = [
  { value: "58mm", label: "58 mm" },
  { value: "80mm", label: "80 mm" },
  { value: "A4", label: "A4" },
];

export function TicketTestView({ data, defaultWidth }: { data: ReceiptData; defaultWidth: ReceiptWidth }) {
  const [width, setWidth] = useState<ReceiptWidth>(defaultWidth);

  // Impression lancée dès l'ouverture : c'est le but du bouton dans les Paramètres.
  useEffect(() => {
    const timeout = setTimeout(() => printDocument(defaultWidth), 300);
    return () => clearTimeout(timeout);
  }, [defaultWidth]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/parametres" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux paramètres
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
            {WIDTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWidth(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  width === opt.value ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => printDocument(width)}>
            <Printer className="h-4 w-4" /> Imprimer à nouveau
          </Button>
        </div>
      </div>
      <p className="text-sm text-zinc-500 print:hidden">
        Ticket fictif : aucune vente n&apos;est enregistrée et le stock n&apos;est pas touché. Si le ticket sort coupé ou
        trop petit, changez la largeur ci-dessus, puis dans Paramètres › Commerce.
      </p>
      <Receipt data={data} width={width} style="classique" />
    </div>
  );
}
