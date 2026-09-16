"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { formatMoney } from "@/lib/format";

export type LabelData = {
  businessName: string;
  productName: string;
  code: string;
  sku: string;
  salePrice: number;
  currency?: string;
};

export type LabelFieldOptions = {
  showProductName: boolean;
  showPrice: boolean;
  showCodeText: boolean;
  showSku: boolean;
  cutMarks: boolean;
};

export const DEFAULT_LABEL_FIELDS: LabelFieldOptions = {
  showProductName: true,
  showPrice: true,
  showCodeText: true,
  showSku: true,
  cutMarks: true,
};

/**
 * Étiquette produit avec QR code scannable (au téléphone comme à la caisse —
 * pas besoin d'une douchette dédiée). widthMm/heightMm viennent du format
 * choisi dans BulkLabelPrintView/LabelPrintView (rouleau ou planche A4) ;
 * fields contrôle ce qui apparaît sur l'étiquette.
 */
export function ProductQrLabel({
  data,
  widthMm,
  heightMm,
  fields = DEFAULT_LABEL_FIELDS,
}: {
  data: LabelData;
  widthMm: number;
  heightMm: number;
  fields?: LabelFieldOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrBoxMm = Math.max(10, Math.min(widthMm, heightMm) * 0.62);

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
      className={`qr-label flex flex-col items-center justify-center gap-0.5 overflow-hidden bg-white p-1 text-center ${
        fields.cutMarks ? "border border-dashed border-zinc-300" : "border border-transparent"
      }`}
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
    >
      {fields.showProductName && (
        <p className="w-full truncate text-[9px] font-bold leading-tight text-zinc-900">{data.productName}</p>
      )}
      <canvas ref={canvasRef} style={{ width: `${qrBoxMm}mm`, height: `${qrBoxMm}mm` }} />
      {fields.showCodeText && <p className="w-full truncate text-[6.5px] tracking-wide text-zinc-500">{data.code}</p>}
      <div className="flex w-full items-center justify-center gap-2">
        {fields.showSku && <p className="truncate text-[7px] text-zinc-400">{data.sku}</p>}
        {fields.showPrice && <p className="text-[9px] font-extrabold text-zinc-900">{formatMoney(data.salePrice, data.currency)}</p>}
      </div>
    </div>
  );
}
