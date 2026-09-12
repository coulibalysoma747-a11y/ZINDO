"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { formatMoney } from "@/lib/format";

export type LabelSize = "40mm" | "50mm" | "60mm";

export const LABEL_DIMENSIONS: Record<LabelSize, { width: number; height: number }> = {
  "40mm": { width: 40, height: 30 },
  "50mm": { width: 50, height: 35 },
  "60mm": { width: 60, height: 40 },
};

export type LabelData = {
  businessName: string;
  productName: string;
  code: string;
  salePrice: number;
  currency?: string;
};

/**
 * Étiquette produit avec code-barres scannable (CODE128 — accepte aussi bien un
 * vrai code-barres que la référence ZND-xxxxxx générée automatiquement, puisque
 * tous les produits ne sont pas obligés d'avoir un code-barres).
 */
export function BarcodeLabel({ data, size = "50mm" }: { data: LabelData; size?: LabelSize }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height } = LABEL_DIMENSIONS[size];

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, data.code, {
        format: "CODE128",
        width: size === "40mm" ? 1.3 : size === "50mm" ? 1.6 : 1.9,
        height: size === "40mm" ? 28 : size === "50mm" ? 34 : 40,
        fontSize: size === "40mm" ? 10 : 12,
        margin: 0,
        displayValue: true,
      });
    } catch {
      // code invalide pour CODE128 (caractères non supportés) — l'étiquette
      // s'affiche alors sans code-barres plutôt que de faire échouer la page
    }
  }, [data.code, size]);

  return (
    <div
      className="barcode-label flex flex-col items-center justify-center gap-0.5 overflow-hidden border border-zinc-200 bg-white p-1.5 text-center"
      style={{ width: `${width}mm`, height: `${height}mm` }}
    >
      <p className="w-full truncate text-[8px] font-semibold uppercase text-zinc-500">{data.businessName}</p>
      <p className="w-full truncate text-[10px] font-bold leading-tight text-zinc-900">{data.productName}</p>
      <p className="text-[11px] font-extrabold text-zinc-900">{formatMoney(data.salePrice, data.currency)}</p>
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
}
