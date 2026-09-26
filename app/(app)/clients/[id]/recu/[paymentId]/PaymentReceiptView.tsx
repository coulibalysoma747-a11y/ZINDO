"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ReceiptWidth } from "@/components/sales/Receipt";
import { PaymentReceipt } from "@/components/clients/PaymentReceipt";
import type { PaymentReceiptData } from "@/lib/client-documents";
import { printDocument } from "@/lib/print";

const WIDTH_OPTIONS: { value: ReceiptWidth; label: string }[] = [
  { value: "58mm", label: "58 mm" },
  { value: "80mm", label: "80 mm" },
  { value: "A4", label: "A4" },
];

export function PaymentReceiptView({
  data,
  defaultWidth,
  customerId,
  zindoMention,
}: {
  data: PaymentReceiptData;
  defaultWidth: ReceiptWidth;
  customerId: string;
  zindoMention: boolean;
}) {
  const [width, setWidth] = useState<ReceiptWidth>(defaultWidth);
  const searchParams = useSearchParams();

  // Juste après l'encaissement (?print=1) : impression lancée automatiquement.
  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    const timeout = setTimeout(() => printDocument(defaultWidth), 300);
    return () => clearTimeout(timeout);
  }, [searchParams, defaultWidth]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/clients/${customerId}`} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour à la fiche client
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
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </Button>
        </div>
      </div>
      <PaymentReceipt data={data} width={width} zindoMention={zindoMention} />
    </div>
  );
}
