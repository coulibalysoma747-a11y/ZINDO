"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrdonnanceDocument, type OrdonnanceDocumentData } from "./OrdonnanceDocument";

export function OrdonnanceView({ data }: { data: OrdonnanceDocumentData }) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ordonnance ${data.number}`,
          text: `Voici l'ordonnance ${data.number}.`,
          url: window.location.href,
        });
      } catch {
        // partage annulé par l'utilisateur
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Lien de l'ordonnance copié dans le presse-papiers");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/consultations" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour au registre
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Partager
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </Button>
        </div>
      </div>

      <OrdonnanceDocument data={data} />
    </div>
  );
}
