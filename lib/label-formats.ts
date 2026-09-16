// Formats d'impression pour les étiquettes QR produit (voir
// components/products/ProductQrLabel.tsx, app/(app)/produits/etiquettes et
// app/(app)/produits/[id]/etiquette) — un format "rouleau" imprime une
// étiquette par page (imprimante d'étiquettes dédiée) ; un format "planche"
// remplit une grille fixe de colonnes x lignes sur une feuille A4, qui se
// poursuit naturellement sur la feuille suivante si besoin (flux normal du
// document, pas de repagination CSS Grid) ; "libre" remplit la largeur
// disponible sans nombre de colonnes imposé.

export type RollFormat = { kind: "roll"; id: string; label: string; widthMm: number; heightMm: number };
export type SheetFormat = { kind: "sheet"; id: string; label: string; widthMm: number; heightMm: number; cols: number; rows: number };
export type FreeFormat = { kind: "free"; id: string; label: string; widthMm: number; heightMm: number };
export type LabelFormat = RollFormat | SheetFormat | FreeFormat;

export const LABEL_FORMATS: LabelFormat[] = [
  { kind: "roll", id: "roll-40x30", label: "Rouleau 40 × 30 mm", widthMm: 40, heightMm: 30 },
  { kind: "roll", id: "roll-50x30", label: "Rouleau 50 × 30 mm", widthMm: 50, heightMm: 30 },
  { kind: "roll", id: "roll-58x40", label: "Rouleau 58 × 40 mm", widthMm: 58, heightMm: 40 },
  { kind: "roll", id: "roll-40x20", label: "Rouleau 40 × 20 mm", widthMm: 40, heightMm: 20 },
  { kind: "roll", id: "roll-30x20", label: "Rouleau 30 × 20 mm", widthMm: 30, heightMm: 20 },
  { kind: "sheet", id: "a4-3x8", label: "Planche A4 — 3 × 8 (65 × 33,8 mm)", widthMm: 65, heightMm: 33.8, cols: 3, rows: 8 },
  { kind: "sheet", id: "a4-2x7", label: "Planche A4 — 2 × 7 (99 × 38 mm)", widthMm: 99, heightMm: 38, cols: 2, rows: 7 },
  { kind: "sheet", id: "a4-4x10", label: "Planche A4 — 4 × 10 (48 × 25 mm)", widthMm: 48, heightMm: 25, cols: 4, rows: 10 },
  { kind: "free", id: "a4-free", label: "Planche A4 — grille libre", widthMm: 50, heightMm: 30 },
];

export const DEFAULT_FORMAT_ID = "a4-4x10";

export function getLabelFormat(id: string): LabelFormat {
  return LABEL_FORMATS.find((f) => f.id === id) ?? LABEL_FORMATS.find((f) => f.id === DEFAULT_FORMAT_ID)!;
}

/** Génère le CSS d'impression @media print pour un format donné. */
export function buildPrintCss(format: LabelFormat, containerId: string) {
  if (format.kind === "roll") {
    return `
      @page { size: ${format.widthMm}mm ${format.heightMm}mm; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body * { visibility: hidden; }
      #${containerId}, #${containerId} * { visibility: visible; }
      #${containerId} { display: flex !important; position: absolute; top: 0; left: 0; margin: 0; }
      .qr-label:not(:last-child) { page-break-after: always; break-after: page; }
    `;
  }

  if (format.kind === "sheet") {
    const marginX = Math.max(0, (210 - format.cols * format.widthMm) / 2);
    const marginY = Math.max(0, (297 - format.rows * format.heightMm) / 2);
    return `
      @page { size: A4; margin: ${marginY}mm ${marginX}mm; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body * { visibility: hidden; }
      #${containerId}, #${containerId} * { visibility: visible; }
      #${containerId} {
        display: flex !important;
        position: absolute; top: 0; left: 0; margin: 0;
        flex-wrap: wrap; gap: 0;
        width: ${format.cols * format.widthMm}mm;
      }
      .qr-label { break-inside: avoid; page-break-inside: avoid; }
    `;
  }

  return `
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body * { visibility: hidden; }
    #${containerId}, #${containerId} * { visibility: visible; }
    #${containerId} {
      display: flex !important;
      position: absolute; top: 0; left: 0; margin: 0;
      flex-wrap: wrap; gap: 3mm; align-content: flex-start;
    }
    .qr-label { break-inside: avoid; page-break-inside: avoid; }
  `;
}
