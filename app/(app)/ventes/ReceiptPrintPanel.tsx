"use client";

import { useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { Receipt, type ReceiptWidth } from "@/components/sales/Receipt";
import { InvoiceDocument } from "@/components/sales/InvoiceDocument";
import { FactureEngin } from "@/components/sales/FactureEngin";
import { Button } from "@/components/ui/Button";
import type { SaleDocument } from "@/lib/actions/receipt";

const WIDTH_OPTIONS: { value: ReceiptWidth; label: string }[] = [
  { value: "58mm", label: "58 mm" },
  { value: "80mm", label: "80 mm" },
  { value: "A4", label: "A4" },
];

/**
 * Panneau d'impression du ticket/facture, affiché directement sur l'écran de
 * caisse juste après avoir encaissé une vente (ancré à gauche) — plutôt que
 * de naviguer vers /ventes/[id], pour que la caissière ne quitte jamais la
 * page Vente et puisse enchaîner immédiatement sur le client suivant.
 */
export function ReceiptPrintPanel({
  doc,
  autoPrint,
  onClose,
}: {
  doc: Extract<SaleDocument, { success: true }>;
  autoPrint: boolean;
  onClose: () => void;
}) {
  const [width, setWidth] = useState<ReceiptWidth>(doc.documentType === "TICKET" ? doc.defaultWidth : "A4");

  // Impression rapide : déclenchée automatiquement dès que le panneau est
  // monté si le commerce a activé l'impression auto, sans attendre un clic.
  useEffect(() => {
    if (!autoPrint) return;
    const timeout = setTimeout(() => window.print(), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // À l'impression, tout ce qui n'est pas le ticket/la facture lui-même doit
  // disparaître avec `display: none` (print:hidden), pas juste devenir
  // invisible — un élément `visibility: hidden` garde sa place dans la mise
  // en page et peut pousser le document sur une page supplémentaire ou
  // décaler le contenu réellement imprimé. Le rideau, l'en-tête, le
  // sélecteur de largeur et les boutons sont donc explicitement masqués ;
  // seul le conteneur du ticket reste, en flux normal (voir aussi le CSS
  // d'impression embarqué dans Receipt.tsx/Facture.tsx, qui ne fait plus
  // aucune hypothèse de positionnement absolu/fixe).
  return (
    <div className="fixed inset-0 z-50 flex print:static print:block print:h-auto print:w-auto print:bg-white">
      {/* Rideau semi-transparent — cliquer en dehors du panneau le ferme, sans jamais quitter la page. */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-zindo-ink-900/40 backdrop-blur-[1px] print:hidden"
      />

      <div className="relative flex h-full w-full max-w-sm flex-col gap-3 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4 shadow-2xl animate-zindo-fade-in print:static print:h-auto print:w-auto print:max-w-none print:overflow-visible print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="flex items-center justify-between gap-2 print:hidden">
          <div>
            <p className="text-sm font-semibold text-zindo-ink-900">
              {doc.documentType === "TICKET" ? "Ticket" : "Facture"} enregistré{doc.documentType === "TICKET" ? "" : "e"}
            </p>
            <p className="text-xs text-zinc-500">
              N° {doc.documentType === "TICKET" ? doc.data.ticketNumber : doc.data.invoiceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {doc.documentType === "TICKET" && (
          <div className="flex gap-1 self-start rounded-lg border border-zinc-200 bg-white p-1 print:hidden">
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
        )}

        <div className="flex-1 print:block">
          {doc.documentType === "TICKET" && <Receipt data={doc.data} width={width} />}
          {doc.documentType === "FACTURE" && <InvoiceDocument data={doc.data} />}
          {doc.documentType === "FACTURE_ENGIN" && <FactureEngin data={doc.data} />}
        </div>

        <div className="flex gap-2 pt-1 print:hidden">
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
