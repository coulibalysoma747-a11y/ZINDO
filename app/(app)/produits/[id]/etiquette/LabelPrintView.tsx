"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductQrLabel, LABEL_DIMENSIONS, type LabelData, type LabelSize } from "@/components/products/ProductQrLabel";
import { ensureProductBarcodeAction } from "@/lib/actions/products";

const SIZE_OPTIONS: { value: LabelSize; label: string }[] = [
  { value: "40mm", label: "Petit" },
  { value: "50mm", label: "Moyen" },
  { value: "60mm", label: "Grand" },
];

export function LabelPrintView({
  data: initialData,
  productId,
  hasBarcode,
}: {
  data: LabelData;
  productId: string;
  hasBarcode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [size, setSize] = useState<LabelSize>("50mm");
  const [quantity, setQuantity] = useState(1);
  const [printMode, setPrintMode] = useState<"labels" | "a4">("labels");
  const [generating, setGenerating] = useState(false);
  const { width, height } = LABEL_DIMENSIONS[size];

  async function handlePrint() {
    if (!hasBarcode) {
      setGenerating(true);
      const result = await ensureProductBarcodeAction(productId);
      if ("barcode" in result) setData((d) => ({ ...d, code: result.barcode }));
      setGenerating(false);
    }
    requestAnimationFrame(() => window.print());
  }

  return (
    <div className="space-y-4">
      {/* CSS d'impression autonome : soit une étiquette = une page (imprimante
          d'étiquettes dédiée), soit plusieurs étiquettes par feuille A4
          (imprimante classique, à découper ensuite). */}
      <style>{`
        @media print {
          ${
            printMode === "a4"
              ? `
          @page { size: A4; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          #zindo-labels, #zindo-labels * { visibility: visible; }
          #zindo-labels {
            position: absolute; top: 0; left: 0; margin: 0;
            display: flex; flex-wrap: wrap; gap: 3mm; align-content: flex-start;
          }
          .qr-label { border: 1px dashed #bbb !important; break-inside: avoid; page-break-inside: avoid; }
          `
              : `
          @page { size: ${width}mm ${height}mm; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          #zindo-labels, #zindo-labels * { visibility: visible; }
          #zindo-labels { position: absolute; top: 0; left: 0; margin: 0; }
          .qr-label { border: none !important; }
          .qr-label:not(:last-child) { page-break-after: always; break-after: page; }
          `
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/produits/${productId}`}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au produit
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setPrintMode("labels")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                printMode === "labels" ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Étiquettes
            </button>
            <button
              type="button"
              onClick={() => setPrintMode("a4")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                printMode === "a4" ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Feuille A4
            </button>
          </div>
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSize(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  size === opt.value ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
              className="h-7 w-12 rounded border-0 text-center text-sm focus:outline-none"
              aria-label="Nombre d'étiquettes"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(100, q + 1))}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button onClick={handlePrint} disabled={generating}>
            <Printer className="h-4 w-4" /> {generating ? "Génération du code-barres..." : "Imprimer"}
          </Button>
        </div>
      </div>

      <div id="zindo-labels" className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: quantity }).map((_, i) => (
          <ProductQrLabel key={i} data={data} size={size} />
        ))}
      </div>
    </div>
  );
}
