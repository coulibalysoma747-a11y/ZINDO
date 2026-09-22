"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import type { ReceiptWidth } from "@/components/sales/Receipt";
import { Button } from "@/components/ui/Button";
import { OrdonnanceDocument, type OrdonnanceDocumentData } from "./OrdonnanceDocument";

const WIDTH_OPTIONS: { value: ReceiptWidth; label: string }[] = [
  { value: "58mm", label: "58 mm" },
  { value: "80mm", label: "80 mm" },
  { value: "A4", label: "A4" },
];

export function OrdonnanceView({ data, defaultWidth }: { data: OrdonnanceDocumentData; defaultWidth: ReceiptWidth }) {
  const [width, setWidth] = useState<ReceiptWidth>(defaultWidth);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ordonnance ${data.number}`,
          text: `Voici l'ordonnance ${data.number}.`,
          url: window.location.href,
        });
      } catch {
        // partage annulé par l'utilisateur
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Lien de l'ordonnance copié dans le presse-papiers");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/consultations" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour au registre
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
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Partager
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </Button>
        </div>
      </div>

      <OrdonnanceDocument data={data} width={width} />
    </div>
  );
}
