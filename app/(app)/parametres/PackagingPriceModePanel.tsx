"use client";

import { useState, useTransition } from "react";
import { Layers } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function PackagingPriceModePanel({ settings }: { settings: BusinessSettings }) {
  const [isPieceMode, setIsPieceMode] = useState(settings.packagingUnitPriceMode === "piece");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Layers className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Prix du conditionnement à la pièce</p>
          <p className="mt-1 text-sm text-zinc-500">
            Quand vous ajoutez un conditionnement (carton, paquet...) à un produit, l&apos;application demande
            aujourd&apos;hui le prix du lot entier. Activez pour saisir le prix d&apos;une pièce du lot — l&apos;application
            multiplie elle-même par le nombre de pièces. Ce réglage ne change que la saisie : le prix encaissé à la
            caisse, les tickets et vos conditionnements déjà enregistrés restent identiques.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Saisir le prix d&apos;une pièce du lot, pas celui du lot entier</p>
          <p className="text-xs text-zinc-500">Désactivé : le champ demande le prix du lot entier (nb de pièces × prix pièce).</p>
        </div>
        <input
          type="checkbox"
          checked={isPieceMode}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.checked;
            setIsPieceMode(v);
            setError(null);
            startTransition(async () => {
              const result = await updateBusinessSettingsAction({ packagingUnitPriceMode: v ? "piece" : "lot" });
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
