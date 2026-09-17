"use client";

import { useState, useTransition } from "react";
import { BarChart3 } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function SalesLeaderboardPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.showSalesLeaderboardToEmployees);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Ventes — classement des vendeurs</p>
          <p className="mt-1 text-sm text-zinc-500">
            Le tableau « Part de chaque vendeur » du tableau de bord affiche le total facturé de chaque vendeur.
            Vous le voyez toujours, sur la période de votre choix. Vos employés, eux, ne le voient pas tant que
            vous ne l&apos;ouvrez pas ici — et même ouvert, ils n&apos;y lisent que la journée en cours, jamais tout
            l&apos;historique.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Montrer mes chiffres de vente à mes employés</p>
          <p className="text-xs text-zinc-500">Classement, total facturé et panier moyen visibles, limités à aujourd&apos;hui.</p>
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
              const result = await updateBusinessSettingsAction({ showSalesLeaderboardToEmployees: v });
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
