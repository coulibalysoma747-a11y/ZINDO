"use client";

import { useState, useTransition } from "react";
import { CheckSquare } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function BulkStockFillPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.bulkStockFillEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Remplir le stock en un clic</p>
          <p className="mt-1 text-sm text-zinc-500">
            Activé, la page Stock affiche une case devant chaque produit, un bouton « Tout cocher » et une seule
            quantité appliquée à toute la sélection — chaque ligne reste modifiable avant de valider. Chaque produit
            reçoit tout de même son propre mouvement de stock, comme un ajustement normal.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Cocher plusieurs produits et entrer leur stock d&apos;un coup</p>
          <p className="text-xs text-zinc-500">Les cases à cocher et le bouton « Remplir le stock » sont visibles sur la page Stock.</p>
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
              const result = await updateBusinessSettingsAction({ bulkStockFillEnabled: v });
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
