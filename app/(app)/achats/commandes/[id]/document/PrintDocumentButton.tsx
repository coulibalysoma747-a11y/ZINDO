"use client";

import { Printer } from "lucide-react";
import { printDocument } from "@/lib/print";
import { Button } from "@/components/ui/Button";

export function PrintDocumentButton() {
  return (
    <div className="flex items-center gap-2">
      <p className="hidden text-xs text-zinc-500 sm:block">Choisissez « Enregistrer en PDF » pour obtenir le fichier.</p>
      <Button onClick={() => printDocument("A4")}>
        <Printer className="h-4 w-4" /> Imprimer / PDF
      </Button>
    </div>
  );
}
