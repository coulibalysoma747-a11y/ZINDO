"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { ProductQrLabel, DEFAULT_LABEL_FIELDS, type LabelData } from "@/components/products/ProductQrLabel";
import { LABEL_FORMATS, DEFAULT_FORMAT_ID, getLabelFormat, buildPrintCss } from "@/lib/label-formats";
import { ensureProductBarcodeAction } from "@/lib/actions/products";

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
  const [formatId, setFormatId] = useState(DEFAULT_FORMAT_ID);
  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const format = getLabelFormat(formatId);

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
      <style>{`@media print { ${buildPrintCss(format, "zindo-labels")} }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/produits/${productId}`}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au produit
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={formatId} onChange={(e) => setFormatId(e.target.value)} className="w-auto">
            {LABEL_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
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
            <Printer className="h-4 w-4" /> {generating ? "Génération du code..." : "Imprimer"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <ProductQrLabel widthMm={format.widthMm} heightMm={format.heightMm} fields={DEFAULT_LABEL_FIELDS} data={data} />
      </div>

      <div id="zindo-labels" className="hidden print:flex print:flex-wrap">
        {Array.from({ length: quantity }).map((_, i) => (
          <ProductQrLabel key={i} widthMm={format.widthMm} heightMm={format.heightMm} fields={DEFAULT_LABEL_FIELDS} data={data} />
        ))}
      </div>
    </div>
  );
}
