"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Partage natif du téléphone (WhatsApp, SMS…) ; sinon copie du lien. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} — sur le Marché ZINDO`, url });
      } catch {
        // Partage annulé par l'utilisateur.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={share} aria-label="Partager" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50">
      {copied ? <Check className="h-[18px] w-[18px] text-emerald-600" /> : <Share2 className="h-[18px] w-[18px] text-zinc-600" />}
    </button>
  );
}
