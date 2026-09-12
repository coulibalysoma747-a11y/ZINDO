"use client";

import { Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReceiptActions({ saleNumber }: { saleNumber: string }) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket ${saleNumber}`,
          text: `Voici votre ticket de caisse ${saleNumber}.`,
          url: window.location.href,
        });
      } catch {
        // partage annulé par l'utilisateur
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Lien du ticket copié dans le presse-papiers");
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleShare}>
        <Share2 className="h-4 w-4" /> Partager
      </Button>
      <Button onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Imprimer / PDF
      </Button>
    </div>
  );
}
