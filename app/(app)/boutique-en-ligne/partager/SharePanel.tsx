"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

/** Boutons copier/partager pour la vitrine publique — texte de partage composé côté client, aucune donnée sensible transmise. */
export function SharePanel({ publicUrl, storeName }: { publicUrl: string; storeName: string }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const shareMessage = `${storeName} — commandez directement en ligne : ${publicUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  async function copy(text: string, onDone: () => void) {
    try {
      await navigator.clipboard.writeText(text);
      onDone();
      setTimeout(() => {
        setCopiedLink(false);
        setCopiedMessage(false);
      }, 2000);
    } catch {
      // Presse-papier indisponible (permissions navigateur) — l'utilisateur peut toujours sélectionner le texte à la main.
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">{publicUrl}</span>
        <button
          type="button"
          onClick={() => copy(publicUrl, () => setCopiedLink(true))}
          className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
        >
          {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedLink ? "Copié" : "Copier"}
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100"
          aria-label="Ouvrir la boutique"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Partager sur WhatsApp
      </a>

      <button
        type="button"
        onClick={() => copy(shareMessage, () => setCopiedMessage(true))}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        {copiedMessage ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copiedMessage ? "Message copié" : "Copier un message tout prêt"}
      </button>
    </div>
  );
}
