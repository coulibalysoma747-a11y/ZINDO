"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { formatMoney } from "@/lib/format";

export type LabelSize = "40mm" | "50mm" | "60mm";

export const LABEL_DIMENSIONS: Record<LabelSize, { width: number; height: number }> = {
  "40mm": { width: 40, height: 34 },
  "50mm": { width: 50, height: 40 },
  "60mm": { width: 60, height: 46 },
};

const QR_BOX_MM: Record<LabelSize, number> = {
  "40mm": 22,
  "50mm": 28,
  "60mm": 34,
};

export type LabelData = {
  businessName: string;
  productName: string;
  code: string;
  salePrice: number;
  currency?: string;
};

/**
 * Étiquette produit avec QR code scannable (au téléphone comme à la caisse —
 * pas besoin d'une douchette dédiée) : accepte aussi bien le vrai
 * code-barres EAN-13 généré par ZINDO que la référence ZND-xxxxxx affichée
 * en aperçu avant qu'il ne soit généré — voir LabelPrintView/BulkLabelPrintView.
 */
export function ProductQrLabel({ data, size = "50mm" }: { data: LabelData; size?: LabelSize }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = LABEL_DIMENSIONS[size];
  const qrBoxMm = QR_BOX_MM[size];

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, data.code, {
      width: 240,
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#18181b", light: "#ffffff" },
    }).catch(() => {
      // code vide/invalide — l'étiquette s'affiche alors sans QR plutôt que
      // de faire échouer la page
    });
  }, [data.code]);

  return (
    <div
      className="qr-label flex flex-col items-center justify-center gap-0.5 overflow-hidden border border-zinc-200 bg-white p-1.5 text-center"
      style={{ width: `${width}mm`, height: `${height}mm` }}
    >
      <p className="w-full truncate text-[8px] font-semibold uppercase text-zinc-500">{data.businessName}</p>
      <p className="w-full truncate text-[10px] font-bold leading-tight text-zinc-900">{data.productName}</p>
      <canvas ref={canvasRef} style={{ width: `${qrBoxMm}mm`, height: `${qrBoxMm}mm` }} />
      <p className="text-[11px] font-extrabold text-zinc-900">{formatMoney(data.salePrice, data.currency)}</p>
    </div>
  );
}
