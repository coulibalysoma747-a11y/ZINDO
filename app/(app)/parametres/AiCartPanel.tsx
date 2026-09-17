"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function AiCartPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.aiCartEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Panier IA — photo, dictée ou texte de la commande</p>
          <p className="mt-1 text-sm text-zinc-500">
            Le caissier dépose une photo de la commande écrite, la dicte, ou la tape — l&apos;IA lit les articles,
            les rapproche de votre catalogue, et remplit le panier. Le caissier confirme (ou corrige) chaque ligne
            avant qu&apos;elle n&apos;entre dans la vente : le stock n&apos;est touché qu&apos;après confirmation.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Activer le Panier IA en caisse</p>
          <p className="text-xs text-zinc-500">Le bouton « Panier IA » apparaît sur l&apos;écran de caisse.</p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.checked;
            setEnabled(v);
            setError(null);
            startTransition(async () => {
              const result = await updateBusinessSettingsAction({ aiCartEnabled: v });
              if (result.error) setError(result.error);
            });
          }}
          className="h-5 w-5 shrink-0 rounded accent-zindo-green-500"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
