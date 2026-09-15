"use client";

import { useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { Receipt, type ReceiptWidth } from "@/components/sales/Receipt";
import { Facture } from "@/components/sales/Facture";
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

  // Pas de classes print: ici : au moment d'imprimer, c'est le CSS embarqué par
  // Receipt/Facture lui-même (body * { visibility: hidden }, #zindo-receipt/
  // #zindo-facture { visibility: visible; position: absolute; ... }) qui masque
  // tout le reste — y compris le rideau et le cadre de ce panneau — sans qu'il
  // faille dupliquer cette logique ici (display:none couperait le rendu du
  // ticket lui-même puisqu'il est imbriqué à l'intérieur).
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Rideau semi-transparent — cliquer en dehors du panneau le ferme, sans jamais quitter la page. */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-zindo-ink-900/40 backdrop-blur-[1px]"
      />

      <div className="relative flex h-full w-full max-w-sm flex-col gap-3 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4 shadow-2xl animate-zindo-fade-in">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zindo-ink-900">
              {doc.documentType === "FACTURE" ? "Facture" : "Ticket"} enregistré
            </p>
            <p className="text-xs text-zinc-500">
              N° {doc.documentType === "FACTURE" ? doc.data.invoiceNumber : doc.data.ticketNumber}
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
          <div className="flex gap-1 self-start rounded-lg border border-zinc-200 bg-white p-1">
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

        <div className="flex-1">
          {doc.documentType === "FACTURE" ? <Facture data={doc.data} /> : <Receipt data={doc.data} width={width} />}
        </div>

        <div className="flex gap-2 pt-1">
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
