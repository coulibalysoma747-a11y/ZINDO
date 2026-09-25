"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReferralShareButtons({ link, code }: { link: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const message = `J'utilise ZINDO pour gérer mon stock et mes ventes. Essaie-le gratuitement avec mon code ${code} : ${link}`;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <MessageCircle className="h-4 w-4" /> Partager sur WhatsApp
      </a>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Presse-papiers indisponible (navigateur ancien) : le lien reste affiché à l'écran.
          }
        }}
      >
        <Copy className="h-4 w-4" /> {copied ? "Lien copié" : "Copier le lien"}
      </Button>
    </div>
  );
}
