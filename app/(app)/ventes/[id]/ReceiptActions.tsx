"use client";

import Link from "next/link";
import { Printer, Share2, Files } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { printDocument, type PrintPageSize } from "@/lib/print";

export function ReceiptActions({
  saleNumber,
  otherFormatHref,
  otherFormatLabel,
  pageSize = "A4",
}: {
  saleNumber: string;
  otherFormatHref?: string | null;
  otherFormatLabel?: string;
  /** Taille passée à l'impression silencieuse de l'appli desktop (voir lib/print.ts) — "A4" pour une facture, la largeur du ticket sinon. */
  pageSize?: PrintPageSize;
}) {
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
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleShare}>
        <Share2 className="h-4 w-4" /> Partager
      </Button>
      <Button onClick={() => printDocument(pageSize)}>
        <Printer className="h-4 w-4" /> Imprimer / PDF
      </Button>
      {otherFormatHref && (
        <Link
          href={otherFormatHref}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zindo-green-300 hover:bg-zindo-green-50 hover:text-zindo-green-700"
        >
          <Files className="h-4 w-4" /> {otherFormatLabel}
        </Link>
      )}
    </div>
  );
}
